/**
 * Provenance Confidence Scorer v2
 * Multi-signal weighted composite:
 *   0.20 × source_count_score       (saturates at 5+ sources)
 *   0.25 × recency_score            (decay over 20 years; meta-analyses weighted more)
 *   0.30 × study_type_score         (meta > RCT > cohort > review > other > preprint)
 *   0.15 × journal_credibility      (high-impact vs predatory)
 *   0.10 × scite_support_ratio      (supporting / (supporting + contrasting))
 * ─ penalties for retraction, preprint, animal-only
 */

import type { EvidenceSource } from './evidence-search'

export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'none'

export interface ProvenanceScore {
  finalScore: number
  confidenceBand: ConfidenceBand
  // Component scores
  sourceCountScore: number
  recencyScore: number
  studyTypeScore: number
  journalCredibilityScore: number
  sciteSentimentScore: number
  retractionPenalty: number
  preprinyPenalty: number
  animalStudyPenalty: number
  // Human-readable breakdown
  breakdown: string
  topSource: { title: string; year?: number; studyType: string; journal?: string } | null
  scoreV: 'v2'
}

// ── Weight tables ────────────────────────────────────────────

const STUDY_TYPE_WEIGHTS: Record<EvidenceSource['studyType'], number> = {
  meta_analysis: 1.00,
  rct:           0.85,
  cohort:        0.65,
  review:        0.70,
  case_study:    0.40,
  preprint:      0.25,
  other:         0.35,
}

const JOURNAL_CREDIBILITY_WEIGHTS: Record<EvidenceSource['journalCredibility'], number> = {
  high:    1.00,
  medium:  0.65,
  low:     0.20,
  unknown: 0.50,
}

const CURRENT_YEAR = new Date().getFullYear()

// ── Score computation ────────────────────────────────────────

export function computeProvenanceScore(sources: EvidenceSource[]): ProvenanceScore {
  if (sources.length === 0) {
    return {
      finalScore: 0,
      confidenceBand: 'none',
      sourceCountScore: 0,
      recencyScore: 0,
      studyTypeScore: 0,
      journalCredibilityScore: 0,
      sciteSentimentScore: 0,
      retractionPenalty: 0,
      preprinyPenalty: 0,
      animalStudyPenalty: 0,
      breakdown: 'No evidence sources found — claim is unsupported',
      topSource: null,
      scoreV: 'v2',
    }
  }

  // 1. Source count score (saturates at 5 sources)
  const sourceCountScore = Math.min(sources.length / 5, 1.0)

  // 2. Recency score — average across sources; meta-analyses from any year get full recency
  const recencyScores = sources.map(s => {
    if (s.studyType === 'meta_analysis') return 1.0  // meta-analyses are always relevant
    if (!s.year || s.year < 1980) return 0.2
    const age = CURRENT_YEAR - s.year
    return Math.max(0, 1 - age / 20)
  })
  const recencyScore = recencyScores.reduce((a, b) => a + b, 0) / sources.length

  // 3. Study type score — best single study type (not average; one RCT is better than five case reports)
  const studyTypeScore = Math.max(...sources.map(s => STUDY_TYPE_WEIGHTS[s.studyType] ?? 0.35))

  // 4. Journal credibility — best single journal credibility
  const journalCredibilityScore = Math.max(
    ...sources.map(s => JOURNAL_CREDIBILITY_WEIGHTS[s.journalCredibility] ?? 0.5)
  )

  // 5. Scite sentiment ratio — supporting / (supporting + contrasting)
  const totalSupport = sources.reduce((a, s) => a + (s.sciteSupport || 0), 0)
  const totalContrast = sources.reduce((a, s) => a + (s.sciteContrast || 0), 0)
  const sciteSentimentScore = (totalSupport + totalContrast) > 0
    ? totalSupport / (totalSupport + totalContrast)
    : 0.5  // neutral when no scite data

  // 6. Penalties
  const hasRetracted = sources.some(s => s.isRetracted)
  const allPreprints = sources.every(s => s.isPreprint)
  const allAnimalStudies = sources.every(s => s.isAnimalStudy)
  const anyRetracted = sources.some(s => s.isRetracted)

  const retractionPenalty = anyRetracted ? 0.40 : 0
  const preprinyPenalty = allPreprints ? 0.20 : (sources.filter(s => s.isPreprint).length / sources.length) * 0.10
  const animalStudyPenalty = allAnimalStudies ? 0.15 : 0

  // Composite
  const rawScore =
    0.20 * sourceCountScore +
    0.25 * recencyScore +
    0.30 * studyTypeScore +
    0.15 * journalCredibilityScore +
    0.10 * sciteSentimentScore -
    retractionPenalty - preprinyPenalty - animalStudyPenalty

  const finalScore = Math.min(Math.max(rawScore, 0), 1)

  const confidenceBand: ConfidenceBand =
    finalScore >= 0.72 ? 'high' :
    finalScore >= 0.45 ? 'moderate' :
    finalScore >  0.00 ? 'low' : 'none'

  // Best source for display
  const topSource = sources[0]
    ? { title: sources[0].title, year: sources[0].year, studyType: sources[0].studyType, journal: sources[0].journal }
    : null

  const breakdown = [
    `${sources.length} sources`,
    `recency=${recencyScore.toFixed(2)}`,
    `study_type=${studyTypeScore.toFixed(2)}(${sources.map(s => s.studyType.replace('_','')).join(',')})`,
    `journal=${journalCredibilityScore.toFixed(2)}`,
    `scite_ratio=${sciteSentimentScore.toFixed(2)}(${totalSupport}sup/${totalContrast}ctr)`,
    hasRetracted ? '⚠️retracted' : null,
    allPreprints ? '⚠️preprint_only' : null,
    allAnimalStudies ? '⚠️animal_only' : null,
  ].filter(Boolean).join(' | ')

  return {
    finalScore: Math.round(finalScore * 1000) / 1000,
    confidenceBand,
    sourceCountScore: Math.round(sourceCountScore * 1000) / 1000,
    recencyScore: Math.round(recencyScore * 1000) / 1000,
    studyTypeScore: Math.round(studyTypeScore * 1000) / 1000,
    journalCredibilityScore: Math.round(journalCredibilityScore * 1000) / 1000,
    sciteSentimentScore: Math.round(sciteSentimentScore * 1000) / 1000,
    retractionPenalty,
    preprinyPenalty: Math.round(preprinyPenalty * 1000) / 1000,
    animalStudyPenalty,
    breakdown,
    topSource,
    scoreV: 'v2',
  }
}
