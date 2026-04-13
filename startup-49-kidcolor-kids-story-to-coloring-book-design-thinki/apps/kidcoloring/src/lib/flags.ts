/**
 * src/lib/flags.ts — Feature Flag Registry
 *
 * TWO-LAYER resolution (priority high → low):
 *   1. Supabase `feature_flags` table   — live overrides, no redeploy needed
 *   2. process.env  (FLAG_*)            — Vercel env vars, need `vercel redeploy --prebuilt`
 *   3. Hardcoded defaults               — always safe fallback
 *
 * The DB layer is cached in module memory with a 60s TTL, so:
 *   - Cache miss: 1 Supabase SELECT (< 5ms) on the first request after expiry
 *   - Cache hit:  zero DB queries
 *
 * HOW TO CHANGE FLAGS (no code deploy required):
 *   Option A — Supabase dashboard (instant, ≤ 60s propagation):
 *     1. Go to  https://supabase.com/dashboard/project/lpxhxmpzqjygsaawkrva
 *     2. Table editor → feature_flags → edit value → Save
 *   Option B — Admin UI (instant, ≤ 60s propagation):
 *     https://kidcoloring-research.vercel.app/admin/flags
 *   Option C — Vercel env var (requires fast redeploy):
 *     vercel env add FLAG_NAME production <<< "new_value"
 *     vercel redeploy --prebuilt --prod   # uses cached build, ~30s
 */

import { createClient } from '@supabase/supabase-js'

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULTS: Record<string, string> = {
  FLAG_TTS_ENABLED:        'true',
  FLAG_PDF_EXPORT:         'true',
  FLAG_EMAIL_GATE:         'true',
  FLAG_SHARE_BUTTON:       'true',
  FLAG_GALLERY_ENABLED:    'true',
  FLAG_MAINTENANCE_MODE:   'false',
  FLAG_MAINTENANCE_MSG:    'We are making improvements — some features may be slow.',
  FLAG_TRIAL_PAGES:        '4',
  FLAG_UPSELL_PRICE:       '9.99',
  FLAG_UPSELL_VARIANT:     'A',
  FLAG_HERO_CTA_VARIANT:   'both',
  FLAG_UPSELL_ROLLOUT_PCT: '0',
  FLAG_IMAGE_PROVIDER:     'pollinations',
  FLAG_POLLINATIONS_MODEL: 'flux',
  FLAG_IMAGE_WIDTH:        '768',
  FLAG_IMAGE_HEIGHT:       '1024',
  FLAG_GEN_MAX_RETRIES:    '2',
  FLAG_GEN_TIMEOUT_MS:     '90000',
}

// ── In-memory DB override cache ───────────────────────────────────────────────
let _dbCache: Record<string, string> | null = null
let _dbCacheTs = 0
const CACHE_TTL_MS = 60_000   // 60 seconds

async function fetchDBOverrides(): Promise<Record<string, string>> {
  const now = Date.now()
  if (_dbCache && now - _dbCacheTs < CACHE_TTL_MS) return _dbCache

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data, error } = await sb
      .from('feature_flags')
      .select('key, value')
    if (error) throw error
    _dbCache = Object.fromEntries((data ?? []).map(r => [r.key as string, r.value as string]))
    _dbCacheTs = now
    return _dbCache
  } catch (e) {
    console.warn('[flags] DB fetch failed, using env/defaults:', e)
    _dbCache = _dbCache ?? {}   // keep stale cache on error
    return _dbCache
  }
}

/** Invalidate the in-memory cache immediately (call after writing to feature_flags) */
export function invalidateFlagCache() {
  _dbCache = null
  _dbCacheTs = 0
}

// ── Raw value resolver ────────────────────────────────────────────────────────
/** Returns raw string value: DB override > env var > hardcoded default */
function raw(key: string, overrides: Record<string, string>): string {
  return overrides[key] ?? process.env[key] ?? DEFAULTS[key] ?? ''
}

// ── Type coercions ────────────────────────────────────────────────────────────
function toBool(v: string): boolean {
  return v.toLowerCase() !== 'false' && v !== '0' && v !== ''
}
function toInt(v: string, def: number): number {
  const n = parseInt(v, 10);  return isNaN(n) ? def : n
}
function toFloat(v: string, def: number): number {
  const n = parseFloat(v);    return isNaN(n) ? def : n
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * getFlags() — async, reads DB overrides + env + defaults.
 * Use this in API routes and server components.
 */
export async function getFlags() {
  const ov = await fetchDBOverrides()
  return buildFlags(ov)
}

/**
 * getFlagsSync() — synchronous, env + defaults only (no DB).
 * Safe to call anywhere but misses DB overrides.
 * Use when you cannot await (e.g. module-level initialization).
 */
export function getFlagsSync() {
  return buildFlags({})
}

function buildFlags(ov: Record<string, string>) {
  return {
    // ── Feature toggles ──────────────────────────────────────────────────────
    TTS_ENABLED:        toBool(raw('FLAG_TTS_ENABLED', ov)),
    PDF_EXPORT:         toBool(raw('FLAG_PDF_EXPORT', ov)),
    EMAIL_GATE:         toBool(raw('FLAG_EMAIL_GATE', ov)),
    SHARE_BUTTON:       toBool(raw('FLAG_SHARE_BUTTON', ov)),
    GALLERY_ENABLED:    toBool(raw('FLAG_GALLERY_ENABLED', ov)),
    MAINTENANCE_MODE:   toBool(raw('FLAG_MAINTENANCE_MODE', ov)),
    MAINTENANCE_MSG:    raw('FLAG_MAINTENANCE_MSG', ov),

    // ── Experiments ──────────────────────────────────────────────────────────
    TRIAL_PAGES:        toInt(raw('FLAG_TRIAL_PAGES', ov), 4),
    UPSELL_PRICE:       toFloat(raw('FLAG_UPSELL_PRICE', ov), 9.99),
    UPSELL_VARIANT:     raw('FLAG_UPSELL_VARIANT', ov) as 'A' | 'B' | 'C',
    HERO_CTA_VARIANT:   raw('FLAG_HERO_CTA_VARIANT', ov) as 'interests' | 'story' | 'both',
    UPSELL_ROLLOUT_PCT: toInt(raw('FLAG_UPSELL_ROLLOUT_PCT', ov), 0),

    // ── Generation ───────────────────────────────────────────────────────────
    IMAGE_PROVIDER:     raw('FLAG_IMAGE_PROVIDER', ov) as 'pollinations' | 'replicate',
    POLLINATIONS_MODEL: raw('FLAG_POLLINATIONS_MODEL', ov),
    IMAGE_WIDTH:        toInt(raw('FLAG_IMAGE_WIDTH', ov), 768),
    IMAGE_HEIGHT:       toInt(raw('FLAG_IMAGE_HEIGHT', ov), 1024),
    GEN_MAX_RETRIES:    toInt(raw('FLAG_GEN_MAX_RETRIES', ov), 2),
    GEN_TIMEOUT_MS:     toInt(raw('FLAG_GEN_TIMEOUT_MS', ov), 90_000),
  } as const
}

export type Flags = ReturnType<typeof buildFlags>

// Subset safe to expose to the browser via /api/v1/config
export type PublicFlags = Pick<Flags,
  | 'TTS_ENABLED' | 'PDF_EXPORT' | 'EMAIL_GATE' | 'SHARE_BUTTON'
  | 'GALLERY_ENABLED' | 'MAINTENANCE_MODE' | 'MAINTENANCE_MSG'
  | 'TRIAL_PAGES' | 'UPSELL_PRICE' | 'UPSELL_VARIANT' | 'HERO_CTA_VARIANT'
  | 'UPSELL_ROLLOUT_PCT' | 'POLLINATIONS_MODEL' | 'IMAGE_WIDTH' | 'IMAGE_HEIGHT'
>

/** Returns the public (browser-safe) subset of resolved flags */
export async function getPublicFlags(): Promise<PublicFlags> {
  const f = await getFlags()
  return {
    TTS_ENABLED:        f.TTS_ENABLED,
    PDF_EXPORT:         f.PDF_EXPORT,
    EMAIL_GATE:         f.EMAIL_GATE,
    SHARE_BUTTON:       f.SHARE_BUTTON,
    GALLERY_ENABLED:    f.GALLERY_ENABLED,
    MAINTENANCE_MODE:   f.MAINTENANCE_MODE,
    MAINTENANCE_MSG:    f.MAINTENANCE_MSG,
    TRIAL_PAGES:        f.TRIAL_PAGES,
    UPSELL_PRICE:       f.UPSELL_PRICE,
    UPSELL_VARIANT:     f.UPSELL_VARIANT,
    HERO_CTA_VARIANT:   f.HERO_CTA_VARIANT,
    UPSELL_ROLLOUT_PCT: f.UPSELL_ROLLOUT_PCT,
    POLLINATIONS_MODEL: f.POLLINATIONS_MODEL,
    IMAGE_WIDTH:        f.IMAGE_WIDTH,
    IMAGE_HEIGHT:       f.IMAGE_HEIGHT,
  }
}

/** Raw DB rows — for admin UI */
export async function getRawFlags() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data, error } = await sb
    .from('feature_flags')
    .select('key, value, type, description, category, options, updated_at, updated_by')
    .order('category')
    .order('key')
  if (error) throw error

  // Annotate with resolved value (DB > env > default)
  const ov = await fetchDBOverrides()
  return (data ?? []).map(r => ({
    ...r,
    envValue:     process.env[r.key as string] ?? null,
    defaultValue: DEFAULTS[r.key as string] ?? null,
    resolvedValue: raw(r.key as string, ov),
    source: ov[r.key as string] !== undefined ? 'db' : process.env[r.key as string] !== undefined ? 'env' : 'default',
  }))
}
