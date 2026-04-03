import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Valid event names — server-side allowlist prevents junk pollution
const VALID_EVENTS = new Set([
  // Core funnel
  'session_created', 'configure_complete', 'generation_started',
  'first_page_ready', 'page_ready', 'book_complete',
  'preview_opened', 'export_clicked', 'share_clicked',
  // Auth
  'magic_link_requested', 'auth_completed',
  // Wizard instrumentation
  'page_view', 'wizard_step_complete', 'interests_selected',
  // UI interactions
  'save_prompted', 'upsell_shown', 'upsell_clicked',
  // PDF export pipeline
  'pdf_export_started', 'pdf_generated', 'pdf_download_clicked',
  // Errors
  'generation_failed', 'session_error',
])

// POST /api/v1/event — log a telemetry event
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      event?: string
      sessionId?: string
      props?: Record<string, unknown>
    }

    const { event, sessionId, props } = body
    if (!event) return NextResponse.json({ error: 'event required' }, { status: 400 })

    // Soft validate — unknown events logged but flagged
    const eventName = VALID_EVENTS.has(event) ? event : `unknown:${event.slice(0, 40)}`

    const sb = getAdmin()
    const { error } = await sb.from('events').insert({
      event_name: eventName,
      session_id: sessionId || null,
      properties: { ...(props || {}), _ts: Date.now() },
    })

    if (error) {
      console.error('[event] insert error:', error.message)
      // Still return 200 — telemetry failures are non-fatal
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Never let telemetry crash the client
    console.error('[event] unexpected error:', err)
    return NextResponse.json({ ok: true })
  }
}
