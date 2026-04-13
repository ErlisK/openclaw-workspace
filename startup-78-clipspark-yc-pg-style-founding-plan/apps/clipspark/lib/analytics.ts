/**
 * ClipSpark analytics event catalog
 * 
 * Usage (client):
 *   import { useAnalytics } from '@/lib/analytics'
 *   const { track } = useAnalytics()
 *   track('job_submitted', { platform: 'YouTube Shorts' })
 * 
 * Usage (server / API routes):
 *   import { trackServer } from '@/lib/analytics'
 *   await trackServer(userId, 'job_completed', { tat_sec: 120 })
 */

'use client'

import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'

// ── Event catalog ─────────────────────────────────────────────────────────────
export const EVENTS = {
  // Auth
  SIGNUP:                   'signup',
  LOGIN:                    'login',
  ONBOARDING_COMPLETED:     'onboarding_completed',

  // Upload / ingest
  UPLOAD_STARTED:           'upload_started',
  UPLOAD_COMPLETED:         'upload_completed',
  URL_IMPORT_STARTED:       'url_import_started',
  URL_IMPORT_COMPLETED:     'url_import_completed',
  JOB_SUBMITTED:            'job_submitted',

  // Processing
  JOB_COMPLETED:            'job_completed',
  JOB_FAILED:               'job_failed',
  PREVIEW_READY:            'preview_ready',

  // Editor
  CLIP_EDITOR_OPENED:       'clip_editor_opened',
  CLIP_TRIM_SAVED:          'clip_trim_saved',
  TITLE_VARIANT_SELECTED:   'title_variant_selected',
  THUMBNAIL_VIEWED:         'thumbnail_viewed',

  // Export
  EXPORT_STARTED:           'export_started',
  EXPORT_COMPLETED:         'export_completed',
  EXPORT_DOWNLOAD:          'export_download',
  CLIP_APPROVED:            'clip_approved',
  FIRST_PREVIEW_VIEWED:     'first_preview_viewed',

  // Billing
  PRICING_PAGE_VIEWED:      'pricing_page_viewed',
  CHECKOUT_STARTED:         'checkout_started',
  CHECKOUT_COMPLETED:       'checkout_completed',  // fired from webhook
  CREDITS_PURCHASED:        'credits_purchased',
  QUOTA_HIT:                'quota_hit',

  // Templates
  TEMPLATE_SAVED:           'template_saved',
  TEMPLATE_CREATED:         'template_created',
  TEMPLATE_USED:            'template_used',
  TEMPLATE_UPVOTED:         'template_upvoted',
  TEMPLATE_PUBLISHED:       'template_published',
  TEMPLATE_FORKED:          'template_forked',

  // Feedback
  FEEDBACK_SUBMITTED:       'feedback_submitted',
  FEEDBACK_WIDGET_OPENED:   'feedback_widget_opened',
  CLIP_THUMBS_UP:           'clip_thumbs_up',
  CLIP_THUMBS_DOWN:         'clip_thumbs_down',
} as const

export type EventName = typeof EVENTS[keyof typeof EVENTS]

// ── Client-side hook ──────────────────────────────────────────────────────────
export function useAnalytics() {
  const posthog = usePostHog()

  const track = useCallback((event: EventName | string, properties?: Record<string, unknown>) => {
    try {
      posthog?.capture(event, { ...properties, app: 'clipspark' })
    } catch {}
  }, [posthog])

  const identify = useCallback((userId: string, traits?: Record<string, unknown>) => {
    try {
      posthog?.identify(userId, traits)
    } catch {}
  }, [posthog])

  return { track, identify, posthog }
}

// ── Server-side tracker (fire-and-forget via /api/analytics) ─────────────────
export async function trackServer(
  userId: string,
  event: EventName | string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: userId,
      properties: {
        ...properties,
        app: 'clipspark',
        $lib: 'clipspark-server',
        timestamp: new Date().toISOString(),
      },
    }),
  }).catch(() => {})
}
