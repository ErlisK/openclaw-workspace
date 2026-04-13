/**
 * src/lib/generator.ts
 *
 * Server-side image generation pipeline:
 *   1. Fetch image from Pollinations.ai with exponential backoff retry
 *   2. Upload to Supabase Storage (coloring-pages bucket)
 *   3. Update trial_pages row with final URL + status
 *
 * Design goals:
 *   - 3 max attempts per page, exp backoff 1s → 2s → 4s with ±20% jitter
 *   - Rate-limit aware: 429 triggers retry; 4xx otherwise throws
 *   - Cost tracking: latency_ms recorded per attempt
 *   - Pure server-side: uses service-role key, bypasses RLS
 *   - Storage URL is permanent; Pollinations URL is ephemeral
 */

import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET        = 'coloring-pages'

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt'
const DEFAULT_MODEL     = 'flux'
const DEFAULT_WIDTH     = 768
const DEFAULT_HEIGHT    = 1024

export interface GenerateOptions {
  model?:   string
  width?:   number
  height?:  number
  maxAttempts?: number
}

export interface GenerateResult {
  imageUrl:   string   // Supabase Storage public URL
  latencyMs:  number   // total wall-clock for successful fetch + upload
  attempts:   number   // 1–3
  storagePath: string  // `sessions/{sessionId}/page-{nn}.jpg`
}

// ── Admin Supabase client (service role, no RLS) ──────────────────────────────
function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pollinationsUrl(
  prompt: string,
  seed:   number,
  model  = DEFAULT_MODEL,
  width  = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
): string {
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}`
}

function storagePath(sessionId: string, pageNumber: number): string {
  return `sessions/${sessionId}/page-${String(pageNumber).padStart(2, '0')}.jpg`
}

function storagePublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

/** Jittered exponential backoff: base * 2^attempt * rand(0.8..1.2) */
function backoffMs(attempt: number): number {
  const base = 1000 * Math.pow(2, attempt)          // 1000, 2000, 4000…
  const jitter = 0.8 + Math.random() * 0.4           // 0.8 – 1.2
  return Math.round(base * jitter)
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ── Core: fetch image bytes with retry ───────────────────────────────────────
export async function fetchPollinationsImage(
  prompt: string,
  seed:   number,
  opts:   GenerateOptions = {},
): Promise<ArrayBuffer> {
  const url      = pollinationsUrl(prompt, seed, opts.model, opts.width, opts.height)
  const maxTries = opts.maxAttempts ?? 3
  let lastErr: Error | null = null

  for (let attempt = 0; attempt < maxTries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'KidColoring/1.0' },
        // Vercel serverless: no keepalive needed
      })

      if (res.ok) {
        return await res.arrayBuffer()
      }

      // Retriable errors
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Pollinations HTTP ${res.status}`)
        if (attempt < maxTries - 1) {
          await sleep(backoffMs(attempt))
          continue
        }
        throw lastErr
      }

      // Non-retriable 4xx (bad prompt, etc.)
      throw new Error(`Pollinations HTTP ${res.status} (non-retriable)`)

    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxTries - 1) {
        await sleep(backoffMs(attempt))
      }
    }
  }

  throw lastErr ?? new Error('fetchPollinationsImage: all attempts failed')
}

// ── Core: upload bytes to Supabase Storage ────────────────────────────────────
export async function uploadToStorage(
  sessionId:  string,
  pageNumber: number,
  imageBytes: ArrayBuffer,
  mimeType = 'image/jpeg',
): Promise<string> {
  const sb   = adminClient()
  const path = storagePath(sessionId, pageNumber)

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, imageBytes, {
      contentType: mimeType,
      upsert:      true,          // overwrite on retry
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  return storagePublicUrl(path)
}

// ── Full pipeline: generate + store + update DB ───────────────────────────────
export async function generateAndStore(
  sessionId:  string,
  pageNumber: number,
  prompt:     string,
  seed?:      number,
  opts:       GenerateOptions = {},
): Promise<GenerateResult> {
  const sb           = adminClient()
  const effectiveSeed = seed ?? Math.abs(Math.floor(Math.random() * 2_000_000))
  const t0            = Date.now()

  // Mark page as generating, increment attempt counter
  await sb.from('trial_pages')
    .update({ status: 'generating', attempt_count: (await getAttemptCount(sb, sessionId, pageNumber)) + 1 })
    .eq('session_id', sessionId)
    .eq('page_number', pageNumber)

  let attempts = 0
  let lastError: Error | null = null

  for (let attempt = 0; attempt < (opts.maxAttempts ?? 3); attempt++) {
    attempts = attempt + 1
    try {
      // 1. Fetch image
      const bytes = await fetchPollinationsImage(prompt, effectiveSeed + attempt, opts)

      // 2. Upload to storage
      const imageUrl = await uploadToStorage(sessionId, pageNumber, bytes)
      const latencyMs = Date.now() - t0

      // 3. Update DB: success
      await sb.from('trial_pages')
        .update({
          image_url:    imageUrl,
          status:       'complete',
          latency_ms:   latencyMs,
          completed_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .eq('page_number', pageNumber)

      // 4. Update session preview + timestamps
      if (pageNumber === 1) {
        await sb.from('trial_sessions')
          .update({ first_page_at: new Date().toISOString(), preview_image_url: imageUrl, status: 'generating' })
          .eq('id', sessionId)
      }

      return {
        imageUrl,
        latencyMs,
        attempts,
        storagePath: storagePath(sessionId, pageNumber),
      }

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < (opts.maxAttempts ?? 3) - 1) {
        await sleep(backoffMs(attempt))
      }
    }
  }

  // All attempts exhausted
  await sb.from('trial_pages')
    .update({ status: 'failed' })
    .eq('session_id', sessionId)
    .eq('page_number', pageNumber)

  throw lastError ?? new Error(`generateAndStore: all attempts failed for page ${pageNumber}`)
}

// ── Helper: get current attempt_count ────────────────────────────────────────
async function getAttemptCount(
  sb: ReturnType<typeof adminClient>,
  sessionId: string,
  pageNumber: number,
): Promise<number> {
  const { data } = await sb
    .from('trial_pages')
    .select('attempt_count')
    .eq('session_id', sessionId)
    .eq('page_number', pageNumber)
    .single()
  return (data as { attempt_count?: number } | null)?.attempt_count ?? 0
}
