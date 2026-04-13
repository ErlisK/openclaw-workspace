/**
 * KidColoring Analytics Client
 * Server-side only — never import in client components or pages.tsx without 'use server'
 *
 * All events are written to the `events` table via service_role.
 * Column mapping:  props → events.properties  |  ts → events.created_at
 *
 * Usage:
 *   import { track } from '@/lib/analytics'
 *   await track('view_landing', sessionId, { utm_source: 'ig', is_returning: false })
 */

import { createClient } from '@supabase/supabase-js'

// ── Event name registry ──────────────────────────────────────────────────────

export type EventName =
  // Core funnel (8 primary)
  | 'view_landing'
  | 'start_generator'
  | 'story_entered'
  | 'page_generated'
  | 'book_exported'
  | 'share_clicked'
  | 'paywall_viewed'
  | 'paywall_intent'
  // Extended funnel
  | 'checkout_completed'
  | 'checkout_abandoned'
  | 'preview_viewed'
  | 'preview_swiped'
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  // Safety
  | 'safety_input_blocked'
  | 'safety_output_flagged'
  | 'safety_output_approved'
  // COPPA
  | 'coppa_gate_shown'
  | 'coppa_consent_shown'
  | 'coppa_consent_given'
  // Retention
  | 'satisfaction_rated'
  | 'subscription_started'
  | 'subscription_cancelled'
  // Advocacy
  | 'referral_clicked'
  | 'referral_converted'
  // Compliance
  | 'story_text_purged'
  | 'account_deletion_requested'
  | 'account_deleted_hard'

// ── Per-event property types ─────────────────────────────────────────────────

export interface ViewLandingProps {
  is_returning: boolean
  referral_code?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  variant?: string
  viewport_w?: number
}

export interface StartGeneratorProps {
  input_variant: 'wizard' | 'blank' | 'voice'
  coppa_seen: boolean
  coppa_badge_variant?: 'above_fold' | 'footer'
  cta_position: 'hero' | 'sticky_nav' | 'mid_page' | 'footer'
  time_on_landing_s: number
}

export interface StoryEnteredProps {
  input_variant: 'wizard' | 'blank' | 'voice'
  word_count: number
  character_count: number
  age_range?: '2-4' | '4-6' | '6-8' | '8-11' | '11-13'
  child_age?: number
  wizard_character_count?: number
  wizard_setting?: string
  wizard_action?: string
  has_hero_name?: boolean
  safety_passed: boolean
  safety_score?: number
  story_id: string
}

export interface PageGeneratedProps {
  page_index: number
  generation_ms: number
  model_id: string
  model_version?: string
  quality_score?: number
  is_cover: boolean
  is_preview: boolean
  total_pages: number
  book_id: string
  generation_job_id: string
  safety_approved: boolean
}

export interface BookExportedProps {
  book_id: string
  page_count: number
  product_type: 'single' | 'party_pack' | 'subscription_book'
  pdf_size_bytes?: number
  delivery_method: 'download' | 'email'
  price_paid_cents?: number
  generation_ms?: number
  time_to_export_s?: number
}

export interface ShareClickedProps {
  share_surface: 'post_download' | 'preview' | 'account' | 'party_pack_upsell'
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'link_copy' | 'email' | 'sms'
  referral_code: string
  book_id?: string
  product_type?: 'single' | 'party_pack'
  has_preview_image?: boolean
}

export interface PaywallViewedProps {
  price_variant: string
  price_cents: number
  product_type: 'single' | 'party_pack' | 'subscription'
  trigger: 'preview_cta' | 'export_click' | 'share_prompt' | 'upsell_banner'
  book_id?: string
  pages_previewed?: number
  time_in_preview_s?: number
}

export interface PaywallIntentProps {
  price_variant: string
  price_cents: number
  product_type: 'single' | 'party_pack' | 'subscription'
  intent_type: 'checkout_started' | 'card_added' | 'promo_applied' | 'pay_clicked'
  referral_code?: string
  discount_pct?: number
  book_id?: string
}

// Map event name → props type (for typed track() overloads)
export type EventProps = {
  view_landing:      ViewLandingProps
  start_generator:   StartGeneratorProps
  story_entered:     StoryEnteredProps
  page_generated:    PageGeneratedProps
  book_exported:     BookExportedProps
  share_clicked:     ShareClickedProps
  paywall_viewed:    PaywallViewedProps
  paywall_intent:    PaywallIntentProps
}

// ── Admin Supabase client (service_role) ─────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars for analytics client')
  return createClient(url, key, {
    auth: { persistSession: false }
  })
}

// ── Core track() function ────────────────────────────────────────────────────

/**
 * Track an analytics event. Server-side only.
 *
 * @param event_name  Named event from the EventName registry
 * @param session_id  Client session UUID (from sessionStorage 'kc_session_id')
 * @param props       Event-specific properties (see analytics-events.md)
 * @param user_id     Authenticated parent UUID (nullable for anonymous sessions)
 * @param book_id     Optional book UUID for book-level events
 * @param story_id    Optional story UUID for story-level events
 */
export async function track(
  event_name: EventName,
  session_id: string,
  props: Record<string, unknown>,
  user_id?: string,
  book_id?: string,
  story_id?: string
): Promise<void> {
  // Validate required fields
  if (!session_id || session_id.length < 10) {
    console.warn('[analytics] track() called with invalid session_id:', session_id)
    return
  }

  // Scrub any accidentally included PII
  const sanitized = sanitizeProps(props)

  try {
    const supabase = getAdminClient()
    const { error } = await supabase.from('events').insert({
      event_name,
      session_id,
      user_id: user_id ?? null,
      book_id: book_id ?? null,
      story_id: story_id ?? null,
      properties: sanitized,
    })
    if (error) {
      console.error('[analytics] Failed to write event:', event_name, error.message)
    }
  } catch (err) {
    // Never throw from analytics — silent failure
    console.error('[analytics] Exception writing event:', event_name, err)
  }
}

// ── Typed overloads for the 8 primary events ─────────────────────────────────

export async function trackViewLanding(
  session_id: string,
  props: ViewLandingProps,
  user_id?: string
) { return track('view_landing', session_id, props as unknown as Record<string,unknown>, user_id) }

export async function trackStartGenerator(
  session_id: string,
  props: StartGeneratorProps,
  user_id?: string
) { return track('start_generator', session_id, props as unknown as Record<string,unknown>, user_id) }

export async function trackStoryEntered(
  session_id: string,
  props: StoryEnteredProps,
  user_id?: string
) { return track('story_entered', session_id, props as unknown as Record<string,unknown>, user_id, undefined, props.story_id) }

export async function trackPageGenerated(
  session_id: string,
  props: PageGeneratedProps,
  user_id?: string
) { return track('page_generated', session_id, props as unknown as Record<string,unknown>, user_id, props.book_id) }

export async function trackBookExported(
  session_id: string,
  props: BookExportedProps,
  user_id?: string
) { return track('book_exported', session_id, props as unknown as Record<string,unknown>, user_id, props.book_id) }

export async function trackShareClicked(
  session_id: string,
  props: ShareClickedProps,
  user_id?: string
) { return track('share_clicked', session_id, props as unknown as Record<string,unknown>, user_id, props.book_id) }

export async function trackPaywallViewed(
  session_id: string,
  props: PaywallViewedProps,
  user_id?: string
) { return track('paywall_viewed', session_id, props as unknown as Record<string,unknown>, user_id, props.book_id) }

export async function trackPaywallIntent(
  session_id: string,
  props: PaywallIntentProps,
  user_id?: string
) { return track('paywall_intent', session_id, props as unknown as Record<string,unknown>, user_id, props.book_id) }

// ── PII scrubber ─────────────────────────────────────────────────────────────

const BLOCKED_PROP_KEYS = new Set([
  'email', 'password', 'real_name', 'full_name', 'first_name', 'last_name',
  'dob', 'date_of_birth', 'birth_date', 'ssn', 'phone', 'address',
  'ip_address', 'child_name', 'child_email',
])

function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (BLOCKED_PROP_KEYS.has(key.toLowerCase())) {
      console.warn('[analytics] PII key blocked from event props:', key)
      continue
    }
    result[key] = value
  }
  return result
}

// ── Session ID helpers (client-side only — use in 'use client' components) ───

/**
 * Get or create a persistent session ID.
 * Call this in client components only (browser sessionStorage).
 *
 * @example
 * 'use client'
 * import { getOrCreateSessionId } from '@/lib/analytics'
 * const sessionId = getOrCreateSessionId()
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  const KEY = 'kc_session_id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}

// ── Funnel types ─────────────────────────────────────────────────────────────

export interface FunnelStep {
  event: string
  label: string
  order: number
  filter?: Record<string, unknown>
}

export interface FunnelDefinition {
  id: string
  name: string
  description: string
  steps: FunnelStep[]
  session_window_hours: number
  is_active: boolean
}

/**
 * Fetch all active funnel definitions from Supabase.
 * Server-side only.
 */
export async function getFunnels(): Promise<FunnelDefinition[]> {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('funnels')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error || !data) return []
  return data as FunnelDefinition[]
}
