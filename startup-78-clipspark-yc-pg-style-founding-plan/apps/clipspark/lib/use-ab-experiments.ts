'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * useABExperiments — React hook for client-side A/B experiment assignment.
 *
 * Fetches experiment assignments for the current user on mount.
 * Returns variant configs to apply in the UI.
 *
 * Usage:
 *   const { hookStyle, captionStyle, titleFormat, loading } = useABExperiments({ clipId })
 */

export type HookStyle = 'statement' | 'question' | 'number' | null
export type CaptionStyleConfig = {
  caption_style: string
  font_size: number
  position: string
  highlight: boolean
  highlight_color?: string
  bar_bg?: string
} | null

export interface ABAssignments {
  hookStyle: HookStyle
  hookPromptPrefix: string
  captionStyle: CaptionStyleConfig
  titleFormat: string | null
  raw: Record<string, {
    variant_id: string
    variant_name: string
    config: Record<string, unknown>
    experiment_id: string
    is_control: boolean
  }>
  loading: boolean
  error: string | null
  recordEvent: (experimentName: string, eventType: string, value?: number) => void
}

const EXPERIMENT_TYPES = ['hook_style', 'caption_style', 'title_format']

export function useABExperiments({ clipId }: { clipId?: string } = {}): ABAssignments {
  const [assignments, setAssignments] = useState<ABAssignments['raw']>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch('/api/ab/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            experiment_types: EXPERIMENT_TYPES,
            clip_id: clipId,
          }),
        })
        if (!res.ok) {
          if (res.status === 401) { setLoading(false); return }
          throw new Error(`${res.status}`)
        }
        const data = await res.json()
        setAssignments(data.assignments || {})
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchAssignments()
  }, [clipId])

  const recordEvent = useCallback(async (experimentName: string, eventType: string, value?: number) => {
    try {
      await fetch('/api/ab/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiment_name: experimentName, event_type: eventType, value, clip_id: clipId }),
      })
    } catch {
      // Silent fail — analytics should not block UX
    }
  }, [clipId])

  // Extract typed values from raw assignments
  const hookAssignment = assignments['hook-style-v1']
  const captionAssignment = assignments['caption-style-v1']
  const titleAssignment = assignments['title-format-v1']

  const hookStyle = (hookAssignment?.config?.hook_type as HookStyle) ?? null
  const hookPromptPrefix = (hookAssignment?.config?.prompt_prefix as string) ?? ''

  const captionStyle: CaptionStyleConfig = captionAssignment?.config
    ? {
        caption_style: captionAssignment.config.caption_style as string,
        font_size: captionAssignment.config.font_size as number,
        position: captionAssignment.config.position as string,
        highlight: captionAssignment.config.highlight as boolean,
        highlight_color: captionAssignment.config.highlight_color as string | undefined,
        bar_bg: captionAssignment.config.bar_bg as string | undefined,
      }
    : null

  const titleFormat = (titleAssignment?.config?.title_format as string) ?? null

  return {
    hookStyle,
    hookPromptPrefix,
    captionStyle,
    titleFormat,
    raw: assignments,
    loading,
    error,
    recordEvent,
  }
}

/**
 * Server-side: get A/B variant config from heuristic_config table.
 * Used in API routes and SSR to apply winning configs.
 */
export async function getABWinnerConfig(
  experimentType: string,
  svc: { from: Function }
): Promise<Record<string, unknown> | null> {
  try {
    const key = `ab_winner:${experimentType}`
    const { data } = await svc
      .from('heuristic_config')
      .select('value')
      .eq('key', key)
      .single()

    return (data?.value as Record<string, unknown>) ?? null
  } catch {
    return null
  }
}
