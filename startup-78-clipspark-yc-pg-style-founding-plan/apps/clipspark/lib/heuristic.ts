/**
 * ClipSpark Heuristic v0.2 — Scoring Engine
 * 
 * Combines linguistic signals, structural signals, and (opt-in) performance feedback weights.
 * Trained on concierge batch data. Tunable per-niche.
 *
 * Score: 0.0 – 1.0 (higher = better clip candidate)
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ScoringInput {
  transcript_segment: string   // raw text of the candidate segment
  start_sec: number
  end_sec: number
  segment_index: number        // position in full transcript (0-indexed)
  total_segments: number       // total candidate segments
  creator_niche?: string       // e.g. 'business_podcast', 'founder_podcast', 'coaching'
  platform?: string            // 'YouTube Shorts' | 'TikTok' | 'LinkedIn' | 'Instagram Reels'
  // Optional performance feedback signals (from opt-in analytics)
  perf_avg_views?: number      // avg views for clips from this template
  perf_completion_rate?: number // avg completion rate 0-1
  perf_template_id?: string
}

export interface ScoringResult {
  score: number         // 0.0 – 1.0
  breakdown: {
    hook_score: number        // Opening hook strength
    density_score: number     // Information density
    emotion_score: number     // Emotional charge
    structure_score: number   // Good start/end points
    position_score: number    // Segment position boost (intros/outros penalized)
    perf_weight: number       // Performance feedback multiplier
  }
  reasons: string[]           // Human-readable explanation
  suggested_title_prefix: string | null
}

// ── Niche-specific boosters ───────────────────────────────────────────────────
const NICHE_HOOKS: Record<string, string[]> = {
  business_podcast: [
    'the secret', 'here\'s what', 'the truth', 'most people', 'we made', 'we lost',
    'the biggest mistake', 'the one thing', 'how i', 'what if', 'the real reason',
    'revenue', 'profit', 'customers', 'raised', 'funding',
  ],
  founder_podcast: [
    'we almost', 'fired', 'pivot', 'failed', 'crashed', 'the moment', 'i realized',
    'yc', 'product market fit', 'cold email', 'first customer', 'series a', 'runway',
    'we shipped', 'launched', 'early user', 'investors said',
  ],
  coaching: [
    'the framework', 'step one', 'first thing', 'common mistake', 'mindset', 'habit',
    'the system', 'how to', 'what most coaches', 'transformation', 'client result',
    'before and after', 'the shift', 'limiting belief',
  ],
  education: [
    'here\'s why', 'the concept', 'most people don\'t know', 'the principle',
    'remember', 'the key insight', 'counterintuitive', 'the formula', 'the model',
  ],
  comedy: [
    'wait for it', 'plot twist', 'i can\'t believe', 'this is wild',
    'true story', 'okay so', 'you won\'t believe',
  ],
  fitness: [
    'the exercise', 'most people do this wrong', 'the muscle', 'form tip',
    'fastest way', 'science says', 'the study', 'protein', 'recovery',
  ],
}

const UNIVERSAL_HOOKS = [
  'i\'m going to', 'let me tell you', 'here\'s the thing', 'the reason why',
  'what nobody tells you', 'the problem is', 'you need to', 'this changed',
  'imagine if', 'the key is', 'the difference between', 'what i wish',
  'three', 'five', 'number one', 'first', 'never', 'always', 'every single',
]

const EMOTION_WORDS = [
  'amazing', 'shocking', 'surprising', 'incredible', 'terrible', 'devastating',
  'love', 'hate', 'fear', 'excited', 'frustrated', 'inspired', 'scared',
  'proud', 'embarrassed', 'angry', 'grateful', 'regret', 'breakthrough',
  'turning point', 'changed my life', 'everything changed',
]

const FILLER_PENALTY_WORDS = [
  'um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'basically', 'literally',
  'i mean', 'right?', 'so anyway', 'actually', 'obviously',
]

const GOOD_ENDINGS = [
  'so that\'s', 'in summary', 'the point is', 'bottom line', 'at the end of the day',
  'what that means', 'if you take one thing', 'the takeaway', 'and that\'s why',
  'make sense?', 'think about it',
]

// ── Platform optimal duration ranges ─────────────────────────────────────────
const PLATFORM_DURATION: Record<string, { min: number; max: number; ideal: number }> = {
  'YouTube Shorts': { min: 15, max: 60, ideal: 45 },
  'TikTok':         { min: 15, max: 60, ideal: 30 },
  'Instagram Reels': { min: 15, max: 90, ideal: 30 },
  'LinkedIn':       { min: 30, max: 120, ideal: 60 },
  'default':        { min: 20, max: 90, ideal: 45 },
}

// ── Scoring engine ────────────────────────────────────────────────────────────
export function scoreSegment(input: ScoringInput): ScoringResult {
  const {
    transcript_segment: text,
    start_sec,
    end_sec,
    segment_index,
    total_segments,
    creator_niche = 'business_podcast',
    platform = 'YouTube Shorts',
    perf_avg_views,
    perf_completion_rate,
  } = input

  const lower = text.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)
  const duration = end_sec - start_sec
  const reasons: string[] = []

  // ── 1. Hook score (first ~30 words) ──────────────────────────────────────
  const firstWords = words.slice(0, 30).join(' ')
  const nicheHooks = NICHE_HOOKS[creator_niche] || NICHE_HOOKS.business_podcast
  const allHooks = [...nicheHooks, ...UNIVERSAL_HOOKS]

  let hookMatches = allHooks.filter(h => firstWords.includes(h)).length
  const hookScore = Math.min(1.0, hookMatches * 0.2 + (hookMatches > 0 ? 0.3 : 0))
  if (hookMatches > 0) reasons.push(`Strong opening hook detected`)
  else reasons.push(`Weak opening — no hook phrase`)

  // ── 2. Density score ─────────────────────────────────────────────────────
  const wordsPerMin = duration > 0 ? (words.length / (duration / 60)) : 0
  const fillerCount = FILLER_PENALTY_WORDS.filter(w => lower.includes(w)).length
  const fillerRate = fillerCount / words.length

  // Ideal: 130-180 wpm, under 8% filler
  const wpmScore = Math.max(0, 1 - Math.abs(wordsPerMin - 155) / 100)
  const fillerPenalty = Math.min(0.4, fillerRate * 3)
  const densityScore = Math.max(0, wpmScore - fillerPenalty)
  if (fillerRate > 0.1) reasons.push(`High filler word rate (${Math.round(fillerRate * 100)}%)`)

  // ── 3. Emotion score ─────────────────────────────────────────────────────
  const emotionMatches = EMOTION_WORDS.filter(w => lower.includes(w)).length
  const emotionScore = Math.min(1.0, emotionMatches * 0.25)
  if (emotionMatches > 0) reasons.push(`Emotional language detected (${emotionMatches} signals)`)

  // ── 4. Structure score (good ending) ─────────────────────────────────────
  const lastWords = words.slice(-20).join(' ')
  const goodEnding = GOOD_ENDINGS.some(e => lastWords.includes(e))
  const endsWithQuestion = text.trim().endsWith('?')
  const structureScore = goodEnding ? 0.8 : endsWithQuestion ? 0.6 : 0.3
  if (goodEnding) reasons.push(`Clean conclusion/takeaway ending`)
  else if (endsWithQuestion) reasons.push(`Ends with question (engagement)`)

  // ── 5. Duration score ─────────────────────────────────────────────────────
  const range = PLATFORM_DURATION[platform] || PLATFORM_DURATION.default
  let durationScore: number
  if (duration < range.min || duration > range.max) {
    durationScore = 0.1
    reasons.push(`Duration ${Math.round(duration)}s out of range for ${platform} (${range.min}-${range.max}s)`)
  } else {
    durationScore = 1 - Math.abs(duration - range.ideal) / range.ideal * 0.5
  }

  // ── 6. Position score (avoid intros/outros) ──────────────────────────────
  const relPos = segment_index / Math.max(total_segments - 1, 1)
  // Penalty for very start (< 5%) and very end (> 90%) of podcast
  const positionScore = (relPos < 0.05 || relPos > 0.90) ? 0.3
    : relPos < 0.15 ? 0.6
    : relPos > 0.80 ? 0.65
    : 0.9 + (1 - Math.abs(relPos - 0.45) / 0.45) * 0.1

  // ── 7. Performance feedback weight (v0.2 key feature) ─────────────────────
  let perfWeight = 1.0
  if (perf_avg_views !== undefined && perf_avg_views > 0) {
    // Normalize: clips with > 5k views get up to 1.3x multiplier
    perfWeight = Math.min(1.3, 1.0 + Math.log10(Math.max(1, perf_avg_views / 1000)) * 0.1)
    reasons.push(`Performance boost: avg ${perf_avg_views.toLocaleString()} views`)
  }
  if (perf_completion_rate !== undefined && perf_completion_rate > 0) {
    // Completion rate > 0.5 boosts, < 0.3 penalizes
    perfWeight *= (0.8 + perf_completion_rate * 0.4)
    if (perf_completion_rate > 0.6) reasons.push(`High completion rate (${Math.round(perf_completion_rate * 100)}%)`)
  }

  // ── Composite score ───────────────────────────────────────────────────────
  const baseScore = (
    hookScore * 0.30 +       // Most important: hook quality
    densityScore * 0.15 +    // Information density
    emotionScore * 0.20 +    // Emotional resonance
    structureScore * 0.15 +  // Clean structure
    durationScore * 0.10 +   // Duration fit
    positionScore * 0.10     // Position in episode
  )

  const score = Math.min(1.0, Math.max(0, baseScore * perfWeight))

  // ── Title prefix suggestion ───────────────────────────────────────────────
  let suggestedTitlePrefix: string | null = null
  if (firstWords.includes('how i') || firstWords.includes('how we')) {
    suggestedTitlePrefix = 'How I'
  } else if (hookMatches > 0 && emotionMatches > 0) {
    suggestedTitlePrefix = 'The Real Truth About'
  } else if (emotionMatches >= 2) {
    suggestedTitlePrefix = 'Why This Changed Everything'
  }

  return {
    score: Math.round(score * 1000) / 1000,
    breakdown: {
      hook_score: Math.round(hookScore * 1000) / 1000,
      density_score: Math.round(densityScore * 1000) / 1000,
      emotion_score: Math.round(emotionScore * 1000) / 1000,
      structure_score: Math.round(structureScore * 1000) / 1000,
      position_score: Math.round(positionScore * 1000) / 1000,
      perf_weight: Math.round(perfWeight * 1000) / 1000,
    },
    reasons,
    suggested_title_prefix: suggestedTitlePrefix,
  }
}

// ── Batch scorer: rank N segments and pick top K ──────────────────────────────
export function rankSegments(
  segments: Array<Omit<ScoringInput, 'segment_index' | 'total_segments'>>,
  topK = 5,
  platform = 'YouTube Shorts',
  creator_niche = 'business_podcast',
  perfData?: { avg_views?: number; avg_completion?: number },
): Array<ScoringResult & { index: number }> {
  const scored = segments.map((seg, i) => ({
    index: i,
    ...scoreSegment({
      ...seg,
      segment_index: i,
      total_segments: segments.length,
      platform,
      creator_niche,
      perf_avg_views: perfData?.avg_views,
      perf_completion_rate: perfData?.avg_completion,
    }),
  }))

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Diversity filter: avoid picking segments too close to each other in time
  const selected: typeof scored = []
  const minGapSec = 30

  for (const candidate of scored) {
    if (selected.length >= topK) break
    const seg = segments[candidate.index]
    const tooClose = selected.some(s => {
      const prev = segments[s.index]
      return Math.abs(seg.start_sec - prev.start_sec) < minGapSec
    })
    if (!tooClose) selected.push(candidate)
  }

  return selected
}

export const HEURISTIC_VERSION = 'v0.2'

// ── A/B winner config integration ────────────────────────────────────────────
/**
 * ABHeuristicOverrides: applied when A/B experiments reach significance.
 * Set by /api/ab/update-heuristic cron job.
 */
export interface ABHeuristicOverrides {
  hook_style?: { hook_type: string; prompt_prefix: string }
  caption_style?: { caption_style: string; font_size: number; position: string; highlight: boolean }
  title_format?: { title_format: string; prefix_pattern: string | null }
}

/**
 * applyABOverrides: enhances a ScoringInput with A/B winner configs.
 * Pass overrides fetched from heuristic_config table.
 */
export function applyABOverrides(
  input: ScoringInput,
  overrides: ABHeuristicOverrides
): ScoringInput & { ab_hook_type?: string; ab_caption_config?: Record<string, unknown>; ab_title_format?: string } {
  return {
    ...input,
    ab_hook_type: overrides.hook_style?.hook_type,
    ab_caption_config: overrides.caption_style as unknown as Record<string, unknown> | undefined,
    ab_title_format: overrides.title_format?.title_format,
  }
}

/**
 * buildHookPrompt: returns the hook prompt prefix based on A/B assignment or winner config.
 */
export function buildHookPrompt(
  hookType: string | null | undefined,
  niche: string = 'business_podcast'
): string {
  const hookExamples: Record<string, string> = {
    question: 'Start with a direct, thought-provoking question relevant to the topic:',
    number: 'Start with a specific number or statistic that creates immediate interest:',
    statement: 'Start with a bold, declarative statement that establishes authority:',
    cliffhanger: 'Start mid-story to create instant curiosity and pull the viewer in:',
    challenge: 'Start by challenging a common assumption or belief in the niche:',
  }
  return hookExamples[hookType ?? 'statement'] || hookExamples.statement
}

/**
 * scoringHookBonus: adds bonus to hook_score if the transcript starts with
 * the A/B-winning hook type pattern.
 */
export function scoringHookBonus(text: string, hookType: string | null | undefined): number {
  if (!hookType || !text) return 0
  const first40 = text.slice(0, 80).toLowerCase()
  if (hookType === 'question' && /\?/.test(first40)) return 0.12
  if (hookType === 'number' && /\b\d+\b/.test(first40)) return 0.1
  if (hookType === 'statement' && !first40.includes('?')) return 0.05
  return 0
}
