/**
 * Provenance Confidence Scorer
 * Formula v1: weighted composite of 4 signals
 *   0.25 × source_count_score
 * + 0.25 × recency_score
 * + 0.30 × study_type_score
 * + 0.20 × scite_sentiment (approximated from citation count at alpha stage)
 * - retraction_penalty
 */

import type { EvidenceSource } from './evidence-search'

export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'none'

export interface ProvenanceScore {
  finalScore: number
  confidenceBand: ConfidenceBand
  sourceCountScore: number
  recencyScore: number
  studyTypeScore: number
  sciteSentimentScore: number
  retractionPenalty: number
  breakdown: string
}

const STUDY_TYPE_WEIGHTS: Record<EvidenceSource['studyType'], number> = {
  meta_analysis: 1.0,
  rct: 0.8,
  cohort: 0.6,
  review: 0.7,
  case_study: 0.4,
  other: 0.3,
}

const CURRENT_YEAR = new Date().getFullYear()

export function computeProvenanceScore(
  sources: EvidenceSource[],
  orgWeights?: Partial<typeof STUDY_TYPE_WEIGHTS>
): ProvenanceScore {
  if (sources.length === 0) {
    return {
      finalScore: 0,
      confidenceBand: 'none',
      sourceCountScore: 0,
      recencyScore: 0,
      studyTypeScore: 0,
      sciteSentimentScore: 0,
      retractionPenalty: 0,
      breakdown: 'No evidence sources found',
    }
  }

  const weights = { ...STUDY_TYPE_WEIGHTS, ...orgWeights }

  // 1. Source count score (saturates at 5 sources)
  const sourceCountScore = Math.min(sources.length / 5, 1.0)

  // 2. Recency score (decay over 20 years)
  const sourcesWithYear = sources.filter(s => s.year && s.year > 1980)
  const recencyScore = sourcesWithYear.length > 0
    ? sourcesWithYear.reduce((sum, s) => {
        const age = CURRENT_YEAR - (s.year!)
        return sum + Math.max(0, 1 - age / 20)
      }, 0) / sourcesWithYear.length
    : 0.3 // default if no year data

  // 3. Study type score
  const studyTypeScore = sources.reduce((sum, s) =>
    sum + (weights[s.studyType] || 0.3), 0
  ) / sources.length

  // 4. Scite sentiment approximation
  // At alpha: use citation count as proxy (highly cited = more supports)
  // Real scite integration in Phase 3+
  const sourcesWithCitations = sources.filter(s => s.citationCount != null)
  let sciteSentimentScore = 0.5 // neutral default
  if (sourcesWithCitations.length > 0) {
    const avgCitations = sourcesWithCitations.reduce((s, e) => s + (e.citationCount || 0), 0) / sourcesWithCitations.length
    // Normalize: >100 citations → high confidence
    sciteSentimentScore = Math.min(avgCitations / 100, 1.0)
  }

  // Retraction penalty (none at alpha without Retraction Watch API)
  const retractionPenalty = 0

  // Composite score
  const rawScore =
    0.25 * sourceCountScore +
    0.25 * recencyScore +
    0.30 * studyTypeScore +
    0.20 * sciteSentimentScore -
    retractionPenalty

  const finalScore = Math.min(Math.max(rawScore, 0), 1)

  const confidenceBand: ConfidenceBand =
    finalScore >= 0.8 ? 'high' :
    finalScore >= 0.5 ? 'moderate' :
    finalScore > 0 ? 'low' : 'none'

  return {
    finalScore: Math.round(finalScore * 1000) / 1000,
    confidenceBand,
    sourceCountScore: Math.round(sourceCountScore * 1000) / 1000,
    recencyScore: Math.round(recencyScore * 1000) / 1000,
    studyTypeScore: Math.round(studyTypeScore * 1000) / 1000,
    sciteSentimentScore: Math.round(sciteSentimentScore * 1000) / 1000,
    retractionPenalty,
    breakdown: `${sources.length} sources | recency: ${recencyScore.toFixed(2)} | study types: ${sources.map(s => s.studyType).join(', ')}`,
  }
}
