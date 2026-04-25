/**
 * POST /api/analytics
 * Receive client-side analytics events; store in Supabase analytics_events table.
 * Security: requires authenticated session, enforces payload size, validates events.
 */
import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase'

export async function POST(request: Request) {
  // Auth required
  const userSupabase = await createUserClient()
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Payload size cap
  const rawText = await request.text().catch(() => '')
  if (rawText.length > 4096) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body: Record<string, unknown>
  try { body = JSON.parse(rawText) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { event, properties = {} } = body as { event?: string; properties?: Record<string, unknown> }

  if (!event || typeof event !== 'string') {
    return NextResponse.json({ error: 'event required' }, { status: 400 })
  }

  const ALLOWED_EVENTS = new Set([
    'page_view', 'signup', 'login', 'import_started', 'import_completed',
    'suggestion_created', 'experiment_published', 'upgrade_clicked',
    'dismiss_suggestion', 'experiment_rollback', 'checkout_started',
  ])
  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 })
  }

  // Sanitize properties — strip any string values containing script tags
  const sanitized: Record<string, unknown> = {}
  const scriptPattern = /<script[\s\S]*?>[\s\S]*?<\/script>/gi
  for (const [k, v] of Object.entries(properties as Record<string, unknown>)) {
    if (typeof v === 'string') {
      sanitized[k] = v.replace(scriptPattern, '')
    } else {
      sanitized[k] = v
    }
  }

  // Write event — use user client (anon key) relying on RLS
  try {
    await userSupabase.from('analytics_events').insert({
      user_id: user.id,
      event,
      properties: sanitized,
      page: sanitized.page ?? null,
      referrer: sanitized.referrer ?? null,
      ab_variant: sanitized.ab_variant ?? null,
      created_at: new Date().toISOString(),
    })
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true, event })
}
