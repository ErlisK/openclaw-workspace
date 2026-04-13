'use client'
import { useState, useCallback, useMemo } from 'react'
import type { Segment, WordTiming } from '@/lib/transcript-utils'
import {
  snapToSentenceBoundary,
  detectFillerRegions,
  suggestFillerSkipBounds,
  getSentenceMarkers,
} from '@/lib/transcript-utils'

interface Props {
  startSec: number
  endSec: number
  totalDurationSec: number
  segments: Segment[]
  words: WordTiming[]
  onChangeStart: (v: number) => void
  onChangeEnd: (v: number) => void
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function SmartTrimPanel({
  startSec, endSec, totalDurationSec,
  segments, words,
  onChangeStart, onChangeEnd,
}: Props) {
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [fillerInfo, setFillerInfo] = useState<{ skipped: number } | null>(null)
  const [snapping, setSnapping] = useState<'start' | 'end' | null>(null)

  const duration = endSec - startSec
  const hasTranscript = segments.length > 0 || words.length > 0

  // Compute sentence markers for the visual strip
  const markers = useMemo(() => {
    const windowStart = Math.max(0, startSec - 10)
    const windowEnd = Math.min(totalDurationSec || endSec + 60, endSec + 10)
    return getSentenceMarkers(segments, totalDurationSec || endSec + 60, windowStart, windowEnd)
  }, [segments, startSec, endSec, totalDurationSec])

  // Detect fillers in current window
  const fillerRegions = useMemo(() => {
    return detectFillerRegions(words, startSec, endSec)
  }, [words, startSec, endSec])

  function handleStartChange(val: number) {
    if (snapEnabled && segments.length > 0) {
      const snapped = snapToSentenceBoundary(val, segments, 'start', 2.5)
      onChangeStart(snapped)
    } else {
      onChangeStart(val)
    }
  }

  function handleEndChange(val: number) {
    if (snapEnabled && segments.length > 0) {
      const snapped = snapToSentenceBoundary(val, segments, 'end', 2.5)
      onChangeEnd(snapped)
    } else {
      onChangeEnd(val)
    }
  }

  function applyFillerSkip() {
    const result = suggestFillerSkipBounds(words, startSec, endSec)
    if (result.start !== startSec) onChangeStart(result.start)
    if (result.end !== endSec) onChangeEnd(result.end)
    setFillerInfo({ skipped: result.skipped })
  }

  function snapToNearestSentence(which: 'start' | 'end') {
    setSnapping(which)
    const current = which === 'start' ? startSec : endSec
    const snapped = snapToSentenceBoundary(current, segments, which, 5)
    if (which === 'start') onChangeStart(snapped)
    else onChangeEnd(snapped)
    setTimeout(() => setSnapping(null), 800)
  }

  const maxSec = totalDurationSec || endSec + 120

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Trim window</h2>
        <div className="flex items-center gap-3">
          <span className="text-indigo-400 font-mono text-sm">
            {fmt(startSec)} → {fmt(endSec)}
            <span className="text-gray-600 ml-2">({duration.toFixed(1)}s)</span>
          </span>
        </div>
      </div>

      {/* Sentence boundary strip */}
      {hasTranscript && markers.length > 0 && (
        <div className="relative">
          <div className="text-xs text-gray-600 mb-1">Sentence boundaries</div>
          <div className="relative h-6 bg-gray-800 rounded-lg overflow-hidden">
            {/* Current window highlight */}
            <div
              className="absolute top-0 bottom-0 bg-indigo-900/40 border-x border-indigo-600/60"
              style={{
                left: `${(startSec / maxSec) * 100}%`,
                right: `${((maxSec - endSec) / maxSec) * 100}%`,
              }}
            />
            {/* Sentence markers */}
            {segments.map((seg, i) => {
              const pct = (seg.start / maxSec) * 100
              if (pct < 0 || pct > 100) return null
              const isInWindow = seg.start >= startSec && seg.start <= endSec
              return (
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 w-px ${isInWindow ? 'bg-green-500/60' : 'bg-gray-600/40'}`}
                  style={{ left: `${pct}%` }}
                  title={seg.text.slice(0, 60)}
                />
              )
            })}
            {/* Filler regions */}
            {fillerRegions.map((f, i) => {
              const leftPct = (f.start / maxSec) * 100
              const widthPct = ((f.end - f.start) / maxSec) * 100
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-yellow-500/30 border-x border-yellow-500/50"
                  style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.3)}%` }}
                  title={`Filler: "${f.word}"`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-700 mt-0.5">
            <span>0:00</span>
            <span>{fmt(maxSec / 2)}</span>
            <span>{fmt(maxSec)}</span>
          </div>
        </div>
      )}

      {/* Start / End sliders */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 flex justify-between">
            <span>Start</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{fmt(startSec)}</span>
              {hasTranscript && (
                <button
                  onClick={() => snapToNearestSentence('start')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  title="Snap to nearest sentence boundary"
                >
                  {snapping === 'start' ? '✓' : '⟼ snap'}
                </button>
              )}
            </div>
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(endSec - 5, maxSec)}
            step={0.1}
            value={startSec}
            onChange={e => handleStartChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 flex justify-between">
            <span>End</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{fmt(endSec)}</span>
              {hasTranscript && (
                <button
                  onClick={() => snapToNearestSentence('end')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  title="Snap to nearest sentence boundary"
                >
                  {snapping === 'end' ? '✓' : '⟼ snap'}
                </button>
              )}
            </div>
          </label>
          <input
            type="range"
            min={startSec + 5}
            max={maxSec + 30}
            step={0.1}
            value={endSec}
            onChange={e => handleEndChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
      </div>

      {/* Smart trim actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {/* Snap toggle */}
        {hasTranscript && (
          <button
            onClick={() => setSnapEnabled(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              snapEnabled
                ? 'border-indigo-700 bg-indigo-900/30 text-indigo-300'
                : 'border-gray-700 text-gray-500 hover:border-gray-600'
            }`}
          >
            {snapEnabled ? '🔗 Snap on' : '🔗 Snap off'}
          </button>
        )}

        {/* Filler skip */}
        {words.length > 0 && (
          <button
            onClick={applyFillerSkip}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-yellow-600 hover:text-yellow-300 transition-colors"
            title="Auto-skip filler words at clip boundaries"
          >
            ✂ Skip fillers
            {fillerRegions.length > 0 && (
              <span className="ml-1 text-yellow-400">({fillerRegions.length})</span>
            )}
          </button>
        )}

        {fillerInfo && (
          <span className="text-xs text-green-400 self-center">
            ✓ Skipped {fillerInfo.skipped} filler{fillerInfo.skipped !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Duration indicator */}
      <div className="text-xs text-gray-600 flex gap-3">
        <span className={duration < 15 ? 'text-yellow-400' : duration > 90 ? 'text-orange-400' : 'text-green-400'}>
          {duration < 15 ? '⚠ Very short' : duration > 90 ? '⚠ Long for Shorts' : '✓ Good length'}
        </span>
        <span>Optimal: 30–60s for Shorts/TikTok</span>
      </div>
    </div>
  )
}
