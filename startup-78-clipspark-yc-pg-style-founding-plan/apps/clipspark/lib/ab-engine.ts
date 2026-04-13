/**
 * ClipSpark A/B Engine
 *
 * Supports 3 active experiment types:
 *   - hook_style   (first-3-second hook: question | statement | number)
 *   - caption_style (word-by-word | centered-block | lower-third)
 *   - title_format (open | number-led | curiosity-gap)
 *
 * Assignment: deterministic hash(userId + experimentId) → consistent variant per user
 * Statistics: two-proportion z-test for conversion rate; Welch t-test for continuous metrics
 * Winner promotion: cron job pulls significant winners → updates heuristic weights
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExperimentType = 'hook_style' | 'caption_style' | 'title_format' | 'template' | 'general'
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'concluded'
export type ABEventType = 'impression' | 'export' | 'publish' | 'view_reported' | 'completion_reported'

export interface ABExperiment {
  id: string
  name: string
  description?: string
  hypothesis?: string
  experiment_type: ExperimentType
  status: ExperimentStatus
  min_sample_size: number
  confidence_threshold: number
  traffic_pct: number
  winning_variant_id?: string | null
  concluded_at?: string | null
  created_at: string
}

export interface ABVariant {
  id: string
  experiment_id: string
  name: string
  description?: string
  config: Record<string, unknown>
  traffic_weight: number
  is_control: boolean
  impressions: number
  conversions: number
  total_views: number
  avg_views: number
  avg_completion_rate: number
}

export interface ABAssignment {
  experiment_id: string
  variant_id: string
  variant: ABVariant
}

export interface ABResult {
  experiment: ABExperiment
  variants: ABVariantResult[]
  winner: ABVariantResult | null
  is_significant: boolean
  recommendation: string
  heuristic_update: HeuristicUpdate | null
}

export interface ABVariantResult extends ABVariant {
  conversion_rate: number
  lift_vs_control: number | null
  p_value: number | null
  is_significant: boolean
  is_winner: boolean
}

export interface HeuristicUpdate {
  experiment_type: ExperimentType
  winning_config: Record<string, unknown>
  confidence: number
  metric: string
  improvement_pct: number
  applied_at: string
}

// ── Deterministic assignment ────────────────────────────────────────────────
/**
 * Assigns a user to a variant using a deterministic hash.
 * Same user always gets the same variant for a given experiment.
 */
export function assignVariant(
  userId: string,
  experiment: ABExperiment,
  variants: ABVariant[]
): ABVariant | null {
  if (experiment.status !== 'running') return null
  if (variants.length === 0) return null

  // Traffic sampling — exclude users not in the experiment
  const trafficHash = djb2Hash(`${userId}:traffic:${experiment.id}`) / 0xffffffff
  if (trafficHash > experiment.traffic_pct) return null

  // Variant assignment based on cumulative weight bands
  const totalWeight = variants.reduce((s, v) => s + v.traffic_weight, 0)
  const assignHash = (djb2Hash(`${userId}:assign:${experiment.id}`) / 0xffffffff) * totalWeight

  let cumulative = 0
  for (const variant of variants) {
    cumulative += variant.traffic_weight
    if (assignHash <= cumulative) return variant
  }

  return variants[variants.length - 1]
}

/** Fast non-crypto hash (djb2) — deterministic, no randomness */
function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0  // keep 32-bit unsigned
  }
  return hash
}

// ── Statistics ───────────────────────────────────────────────────────────────

/**
 * Two-proportion z-test.
 * Returns p-value (two-tailed) for H0: conversion rates are equal.
 */
export function twoProportionZTest(
  n1: number, c1: number,  // control: sample size, conversions
  n2: number, c2: number   // variant: sample size, conversions
): number {
  if (n1 < 5 || n2 < 5 || c1 < 0 || c2 < 0) return 1.0
  if (c1 === 0 && c2 === 0) return 1.0

  const p1 = c1 / n1
  const p2 = c2 / n2
  const pooled = (c1 + c2) / (n1 + n2)

  if (pooled === 0 || pooled === 1) return 1.0

  const se = Math.sqrt(pooled * (1 - pooled) * (1/n1 + 1/n2))
  if (se === 0) return 1.0

  const z = Math.abs(p2 - p1) / se
  return 2 * (1 - normalCDF(z))
}

/** Approximate normal CDF (Abramowitz & Stegun) */
function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const x = z < 0 ? -z : z
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return z < 0 ? 1 - y : y
}

/**
 * Calculate variant results with statistical significance.
 */
export function calculateResults(
  experiment: ABExperiment,
  variants: ABVariant[]
): ABResult {
  const control = variants.find(v => v.is_control) ?? variants[0]

  const variantResults: ABVariantResult[] = variants.map(v => {
    const convRate = v.impressions > 0 ? v.conversions / v.impressions : 0
    const ctrlRate = control.impressions > 0 ? control.conversions / control.impressions : 0
    const lift = ctrlRate > 0 ? ((convRate - ctrlRate) / ctrlRate) * 100 : null
    const pValue = v.id !== control.id
      ? twoProportionZTest(control.impressions, control.conversions, v.impressions, v.conversions)
      : null
    const significant = pValue !== null
      ? pValue < (1 - experiment.confidence_threshold)
      : false

    return {
      ...v,
      conversion_rate: convRate,
      lift_vs_control: v.id !== control.id ? lift : null,
      p_value: pValue,
      is_significant: significant,
      is_winner: false,
    }
  })

  // Find winner: significant positive lift + meets min sample size
  const winner = variantResults
    .filter(v => !v.is_control && v.is_significant && (v.lift_vs_control ?? 0) > 0 && v.impressions >= experiment.min_sample_size)
    .sort((a, b) => (b.lift_vs_control ?? 0) - (a.lift_vs_control ?? 0))[0] ?? null

  const isSignificant = winner !== null

  if (winner) winner.is_winner = true

  // Build heuristic update recommendation
  let heuristicUpdate: HeuristicUpdate | null = null
  if (winner && winner.lift_vs_control !== null) {
    heuristicUpdate = {
      experiment_type: experiment.experiment_type,
      winning_config: winner.config,
      confidence: experiment.confidence_threshold,
      metric: 'conversion_rate',
      improvement_pct: Math.round(winner.lift_vs_control * 10) / 10,
      applied_at: new Date().toISOString(),
    }
  }

  const recommendation = generateRecommendation(experiment, winner, variantResults)

  return {
    experiment,
    variants: variantResults,
    winner,
    is_significant: isSignificant,
    recommendation,
    heuristic_update: heuristicUpdate,
  }
}

function generateRecommendation(
  exp: ABExperiment,
  winner: ABVariantResult | null,
  variants: ABVariantResult[]
): string {
  const totalSamples = variants.reduce((s, v) => s + v.impressions, 0)
  const minSample = exp.min_sample_size

  if (totalSamples < minSample) {
    const needed = minSample - totalSamples
    return `Collecting data — need ${needed} more impressions across variants for statistical power.`
  }

  if (!winner) {
    const best = variants.filter(v => !v.is_control).sort((a, b) => b.conversion_rate - a.conversion_rate)[0]
    if (best && best.lift_vs_control && best.lift_vs_control > 5) {
      return `${best.name} is trending +${best.lift_vs_control.toFixed(1)}% but hasn't reached ${Math.round(exp.confidence_threshold * 100)}% confidence yet. Keep running.`
    }
    return `No significant winner yet. Continue running — variants are performing similarly.`
  }

  const lift = winner.lift_vs_control?.toFixed(1)
  const conf = Math.round(exp.confidence_threshold * 100)
  return `🏆 ${winner.name} wins with +${lift}% lift at >${conf}% confidence. Recommend promoting to default. Update heuristic weights with winning config.`
}

// ── Config accessors (type-safe helpers for consumers) ───────────────────────

export function getHookStyle(variant: ABVariant): string | null {
  return (variant.config.hook_type as string) ?? null
}

export function getCaptionStyle(variant: ABVariant): Record<string, unknown> | null {
  if (!variant.config.caption_style) return null
  return variant.config as Record<string, unknown>
}

export function getTitleFormat(variant: ABVariant): string | null {
  return (variant.config.title_format as string) ?? null
}

export function getHookPromptPrefix(variant: ABVariant): string {
  return (variant.config.prompt_prefix as string) || ''
}
