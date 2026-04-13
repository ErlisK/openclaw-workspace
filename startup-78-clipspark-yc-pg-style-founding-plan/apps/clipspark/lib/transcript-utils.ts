/**
 * Transcript word/segment utilities for the clip editor.
 * Works with Whisper-format word_timings and segments.
 */

export interface WordTiming {
  word: string
  start: number
  end: number
  probability?: number
}

export interface Segment {
  id?: number
  start: number
  end: number
  text: string
  no_speech_prob?: number
  avg_logprob?: number
  words?: WordTiming[]
}

const FILLER_WORDS = new Set([
  'um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'basically',
  'literally', 'i mean', 'right', 'so', 'anyway', 'actually', 'obviously',
  'okay', 'ok', 'er', 'hmm', 'mhm', 'yeah', 'yep',
])

/** Parse word_timings from Supabase jsonb (could be string or array) */
export function parseWordTimings(raw: unknown): WordTiming[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { return [] }
  }
  if (!Array.isArray(raw)) return []
  return raw as WordTiming[]
}

/** Parse segments from Supabase jsonb */
export function parseSegments(raw: unknown): Segment[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { return [] }
  }
  if (!Array.isArray(raw)) return []
  return raw as Segment[]
}

/** Find the nearest sentence boundary (segment start/end) to a given time */
export function snapToSentenceBoundary(
  timeSec: number,
  segments: Segment[],
  which: 'start' | 'end',
  maxSnapSec = 3.0,
): number {
  if (!segments.length) return timeSec

  let best = timeSec
  let bestDist = maxSnapSec + 1

  for (const seg of segments) {
    const candidates = which === 'start'
      ? [seg.start]
      : [seg.end]

    for (const t of candidates) {
      const dist = Math.abs(t - timeSec)
      if (dist < bestDist && dist <= maxSnapSec) {
        bestDist = dist
        best = t
      }
    }
  }

  return best
}

/** Detect filler word regions in a window [startSec, endSec] */
export function detectFillerRegions(
  words: WordTiming[],
  startSec: number,
  endSec: number,
): Array<{ start: number; end: number; word: string }> {
  const regions: Array<{ start: number; end: number; word: string }> = []
  const inWindow = words.filter(w => w.start >= startSec && w.end <= endSec)

  let i = 0
  while (i < inWindow.length) {
    const w = inWindow[i]
    const normalized = w.word.toLowerCase().trim().replace(/[.,!?]/g, '')

    // Check single word
    if (FILLER_WORDS.has(normalized)) {
      // Group consecutive fillers
      let end = w.end
      let j = i + 1
      while (j < inWindow.length) {
        const next = inWindow[j].word.toLowerCase().trim().replace(/[.,!?]/g, '')
        if (FILLER_WORDS.has(next)) {
          end = inWindow[j].end
          j++
        } else break
      }
      regions.push({ start: w.start, end, word: w.word })
      i = j
      continue
    }

    // Check bigrams ("you know", "i mean", "sort of", "kind of")
    if (i + 1 < inWindow.length) {
      const bigram = normalized + ' ' + inWindow[i + 1].word.toLowerCase().trim().replace(/[.,!?]/g, '')
      if (FILLER_WORDS.has(bigram)) {
        regions.push({ start: w.start, end: inWindow[i + 1].end, word: bigram })
        i += 2
        continue
      }
    }

    i++
  }

  return regions
}

/** Get suggested filler-skipped trim bounds (expands to avoid fillers at edges) */
export function suggestFillerSkipBounds(
  words: WordTiming[],
  startSec: number,
  endSec: number,
): { start: number; end: number; skipped: number } {
  const fillers = detectFillerRegions(words, startSec, endSec)
  let newStart = startSec
  let newEnd = endSec
  let skipped = 0

  // Skip fillers at the very beginning (within first 3s)
  for (const f of fillers) {
    if (f.start <= startSec + 0.5) {
      newStart = Math.max(newStart, f.end + 0.1)
      skipped++
    }
  }

  // Skip fillers at the very end (within last 3s)
  for (const f of [...fillers].reverse()) {
    if (f.end >= endSec - 0.5) {
      newEnd = Math.min(newEnd, f.start - 0.1)
      skipped++
    }
  }

  return { start: newStart, end: newEnd, skipped }
}

/** Extract transcript text for a window */
export function extractTranscriptWindow(
  words: WordTiming[],
  startSec: number,
  endSec: number,
): string {
  return words
    .filter(w => w.start >= startSec - 0.5 && w.end <= endSec + 0.5)
    .map(w => w.word)
    .join(' ')
    .trim()
}

/** Get sentence boundaries as % positions for the trim UI */
export function getSentenceMarkers(
  segments: Segment[],
  totalDurationSec: number,
  windowStartSec: number,
  windowEndSec: number,
): Array<{ pct: number; time: number; text: string }> {
  if (!totalDurationSec) return []
  const range = windowEndSec - windowStartSec
  if (range <= 0) return []

  return segments
    .filter(s => s.start >= windowStartSec && s.start <= windowEndSec)
    .map(s => ({
      pct: ((s.start - windowStartSec) / range) * 100,
      time: s.start,
      text: s.text.slice(0, 60).trim(),
    }))
}
