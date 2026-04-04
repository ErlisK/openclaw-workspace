/**
 * src/lib/experiments.ts — A/B Experiment Engine
 *
 * ASSIGNMENT STRATEGY
 *   Deterministic hash(sessionToken + experimentId) % 100
 *   → Same session ALWAYS gets the same variant
 *   → No DB query needed for assignment computation
 *   → DB only needed for storing the assignment (audit + results)
 *
 * ADDING A NEW EXPERIMENT
 *   1. Add entry to EXPERIMENT_REGISTRY below
 *   2. Insert row in Supabase `experiments` table (key=your-slug)
 *   3. Deploy — assignments start flowing automatically
 *
 * READING RESULTS
 *   /api/admin/experiments  → GET returns live aggregated results
 *   /admin/experiments      → Admin UI dashboard
 */

import { createClient } from '@supabase/supabase-js'

// ── Deterministic hash ────────────────────────────────────────────────────────
/** djb2 hash → 0..99 bucket */
export function hashBucket(sessionToken: string, experimentId: string): number {
  const str = `${sessionToken}:${experimentId}`
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  }
  return h % 100
}

/** Pick variant based on cumulative weights (must sum to 100) */
export function pickVariant(bucket: number, variants: ExperimentVariant[]): string {
  let total = 0
  for (const v of variants) {
    total += v.weight
    if (bucket < total) return v.id
  }
  return variants[variants.length - 1].id
}

// ── Experiment registry ───────────────────────────────────────────────────────
export interface ExperimentVariant {
  id: string
  name: string
  weight: number               // Must sum to 100 across all variants
  config?: Record<string, unknown>
}

export interface ExperimentDef {
  key: string
  name: string
  description: string
  status: 'active' | 'paused' | 'concluded'
  variants: ExperimentVariant[]
  primaryMetric: string
  minSample: number
  iterationCycle: number
}

/**
 * Client-side / server-side registry.
 * Each entry mirrors a row in the `experiments` DB table.
 *
 * Status 'active'    → variants are assigned and tracked
 * Status 'paused'    → everyone gets the control variant (id: 'A')
 * Status 'concluded' → preserved for historical reading only
 */
export const EXPERIMENT_REGISTRY: Record<string, ExperimentDef> = {
  // ── Cycle 1 (concluded) ──────────────────────────────────────────────────
  export_cta_v0: {
    key: 'export_cta_v0', name: 'Export CTA Copy v0',
    description: 'Print & Save vs Download PDF',
    status: 'concluded', primaryMetric: 'export_clicked', minSample: 100,
    iterationCycle: 1,
    variants: [
      { id: 'A', name: 'Print & Save (control)', weight: 50, config: { cta: 'Print & Save' } },
      { id: 'B', name: 'Download PDF',           weight: 50, config: { cta: 'Download PDF' } },
    ],
  },

  // ── Cycle 2 (concluded) ──────────────────────────────────────────────────
  upsell_copy_v1: {
    key: 'upsell_copy_v1', name: 'Upsell Copy v1',
    description: 'Generic upgrade copy vs benefit-focused',
    status: 'concluded', primaryMetric: 'upsell_clicked', minSample: 100,
    iterationCycle: 2,
    variants: [
      { id: 'A', name: 'Generic (control)',  weight: 50 },
      { id: 'B', name: 'Benefit-focused',    weight: 50 },
    ],
  },

  // ── Cycle 3 (active) ─────────────────────────────────────────────────────
  prompt_ui_v1: {
    key: 'prompt_ui_v1', name: 'Prompt UI v1',
    description: 'Interest tiles vs free-text vs voice stub',
    status: 'active', primaryMetric: 'configure_complete', minSample: 150,
    iterationCycle: 3,
    variants: [
      { id: 'A', name: 'Interest tiles (control)', weight: 34, config: { mode: 'tiles' } },
      { id: 'B', name: 'Free-text input',          weight: 33, config: { mode: 'freetext' } },
      { id: 'C', name: 'Voice stub',               weight: 33, config: { mode: 'voice' } },
    ],
  },

  upsell_price_v1: {
    key: 'upsell_price_v1', name: 'Fake-Door Pricing v1',
    description: '$7.99 vs $9.99 vs $12.99 fake-door CTR test',
    status: 'active', primaryMetric: 'upsell_clicked', minSample: 200,
    iterationCycle: 3,
    variants: [
      { id: 'A', name: '$7.99',  weight: 34, config: { price: 7.99,  pages: 12 } },
      { id: 'B', name: '$9.99',  weight: 33, config: { price: 9.99,  pages: 12 } },
      { id: 'C', name: '$12.99', weight: 33, config: { price: 12.99, pages: 12 } },
    ],
  },

  export_cta_v1: {
    key: 'export_cta_v1', name: 'Export CTA Copy v1',
    description: 'Download PDF vs emotional CTA (followup to v0 winner)',
    status: 'active', primaryMetric: 'export_clicked', minSample: 100,
    iterationCycle: 3,
    variants: [
      { id: 'A', name: 'Download PDF (control)', weight: 50, config: { cta: 'Download PDF' } },
      { id: 'B', name: 'Get my coloring book',   weight: 50, config: { cta: 'Get my coloring book' } },
    ],
  },

  page_count_v1: {
    key: 'page_count_v1', name: 'Trial Page Count v1',
    description: '4 pages (control) vs 6 pages',
    status: 'active', primaryMetric: 'book_complete', minSample: 100,
    iterationCycle: 3,
    variants: [
      { id: 'A', name: '4 pages (control)', weight: 50, config: { pages: 4 } },
      { id: 'B', name: '6 pages',           weight: 50, config: { pages: 6 } },
    ],
  },
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Get the variant id for one experiment given a sessionToken */
export function getVariant(sessionToken: string, experimentKey: string): string {
  const exp = EXPERIMENT_REGISTRY[experimentKey]
  if (!exp) return 'A'
  if (exp.status === 'paused' || exp.status === 'concluded') return 'A'
  const bucket = hashBucket(sessionToken, experimentKey)
  return pickVariant(bucket, exp.variants)
}

/** Get variant ids for all ACTIVE experiments at once */
export function getAllVariants(sessionToken: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, exp] of Object.entries(EXPERIMENT_REGISTRY)) {
    if (exp.status === 'active') {
      out[key] = getVariant(sessionToken, key)
    }
  }
  return out
}

/** Get the variant config object for one experiment */
export function getVariantConfig(sessionToken: string, experimentKey: string): Record<string, unknown> {
  const exp = EXPERIMENT_REGISTRY[experimentKey]
  if (!exp) return {}
  const vid = getVariant(sessionToken, experimentKey)
  return exp.variants.find(v => v.id === vid)?.config ?? {}
}

/**
 * Log assignment to DB (upsert — safe to call multiple times).
 * Fire-and-forget on the client side; awaited on the server side.
 */
export async function logAssignment(
  sessionId: string,
  sessionToken: string,
  experimentKeys: string[]
): Promise<void> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const rows = experimentKeys
    .filter(k => EXPERIMENT_REGISTRY[k]?.status === 'active')
    .map(k => ({
      experiment_id: k,
      variant_id: getVariant(sessionToken, k),
      session_id: sessionId,
    }))

  if (rows.length === 0) return

  await sb
    .from('experiment_assignments')
    .upsert(rows, { onConflict: 'experiment_id,session_id', ignoreDuplicates: true })
}

/** Fetch raw experiment + results rows from DB (admin only) */
export async function getExperimentResults() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Get all experiments
  const { data: exps } = await sb
    .from('experiments')
    .select('id, key, name, status, variants, primary_metric, winner_variant, uplift_pct, iteration_cycle, started_at, ended_at')
    .order('iteration_cycle')
    .order('started_at')

  // Get assignment counts grouped by experiment + variant
  const { data: assigns } = await sb
    .from('experiment_assignments')
    .select('experiment_id, variant_id, session_id')

  // Get conversion events
  const metrics = [...new Set((exps ?? []).map(e => e.primary_metric).filter(Boolean))]

  const { data: convs } = await sb
    .from('events')
    .select('event_name, session_id')
    .in('event_name', metrics)

  // Aggregate locally
  const assignMap: Record<string, Record<string, number>> = {}
  for (const a of assigns ?? []) {
    const expId = a.experiment_id as string
    const varId = a.variant_id as string
    if (!assignMap[expId]) assignMap[expId] = {}
    assignMap[expId][varId] = (assignMap[expId][varId] || 0) + 1
  }

  // For conversions: need to cross-reference session_id → experiment assignment
  const sessionToExp: Record<string, Record<string, string>> = {}
  for (const a of assigns ?? []) {
    const sid = a.session_id as string
    if (!sid) continue
    if (!sessionToExp[sid]) sessionToExp[sid] = {}
    sessionToExp[sid][a.experiment_id as string] = a.variant_id as string
  }

  const convMap: Record<string, Record<string, Set<string>>> = {}
  for (const c of convs ?? []) {
    const sid = c.session_id as string
    if (!sid || !sessionToExp[sid]) continue
    for (const [expId, varId] of Object.entries(sessionToExp[sid])) {
      const exp = (exps ?? []).find(e => e.key === expId)
      if (!exp || exp.primary_metric !== c.event_name) continue
      if (!convMap[expId]) convMap[expId] = {}
      if (!convMap[expId][varId]) convMap[expId][varId] = new Set()
      convMap[expId][varId].add(sid)
    }
  }

  return (exps ?? []).map(exp => {
    const key = exp.key as string
    const variants = (exp.variants as ExperimentVariant[]) || []
    const varResults = variants.map(v => {
      const exposures = assignMap[key]?.[v.id] || 0
      const conversions = convMap[key]?.[v.id]?.size || 0
      const rate = exposures > 0 ? Math.round(1000 * conversions / exposures) / 10 : 0
      return { ...v, exposures, conversions, conversionRate: rate }
    })
    const control = varResults.find(v => v.id === 'A')
    const best = varResults.reduce((a, b) => b.conversionRate > a.conversionRate ? b : a, varResults[0])
    const uplift = control && best.id !== 'A' && control.conversionRate > 0
      ? Math.round((best.conversionRate / control.conversionRate - 1) * 1000) / 10
      : null
    return { ...exp, variantResults: varResults, bestVariant: best?.id, liveUpliftPct: uplift }
  })
}
