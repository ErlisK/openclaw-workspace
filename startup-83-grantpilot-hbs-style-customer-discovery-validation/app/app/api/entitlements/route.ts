import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getEntitlementState, logUsage } from '@/lib/entitlements'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = await getEntitlementState(user.id)
  return NextResponse.json(state)
}

/**
 * POST /api/entitlements
 * Record a usage event from the client (e.g. for events not tracked server-side).
 * Body: { event_type: string, resource_type?: string, resource_id?: string, metadata?: object }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { event_type, resource_type, resource_id, metadata } = body

  if (!event_type) return NextResponse.json({ error: 'event_type required' }, { status: 400 })

  // Only allow safe event types from the client
  const ALLOWED_CLIENT_EVENTS = ['page_view', 'feature_click', 'tour_step', 'download']
  if (!ALLOWED_CLIENT_EVENTS.includes(event_type)) {
    return NextResponse.json({ error: 'Event type not allowed from client' }, { status: 403 })
  }

  await logUsage(user.id, null, event_type, resource_type, resource_id, metadata)
  return NextResponse.json({ ok: true })
}
