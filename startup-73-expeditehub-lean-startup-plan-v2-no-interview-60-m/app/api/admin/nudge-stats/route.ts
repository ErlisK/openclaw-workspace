import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/nudge-stats
 * Returns abandoned checkout stats and nudge log.
 * Protected by x-admin-secret header.
 *
 * POST /api/admin/nudge-stats
 * Manually triggers the nudge edge function immediately.
 */

const ADMIN_SECRET = process.env.ADMIN_SECRET!

function authCheck(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  return secret === ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const [{ data: views }, { data: successes }, { data: nudges }] = await Promise.all([
    supabase.from('checkout_events').select('*').eq('event_type', 'checkout_view').order('created_at', { ascending: false }).limit(50),
    supabase.from('checkout_events').select('session_id').eq('event_type', 'checkout_success'),
    supabase.from('nudge_log').select('*').order('sent_at', { ascending: false }).limit(20),
  ])

  const successSessions = new Set((successes || []).map((r: { session_id: string }) => r.session_id))
  const cutoff = new Date(Date.now() - 30 * 60 * 1000)

  const abandoned = (views || []).filter((v: { session_id: string; created_at: string; email?: string }) =>
    !successSessions.has(v.session_id) &&
    v.email &&
    new Date(v.created_at) < cutoff
  )

  return NextResponse.json({
    total_checkout_views: (views || []).length,
    total_checkout_successes: (successes || []).length,
    abandoned_30m: abandoned.length,
    nudges_sent: (nudges || []).length,
    recent_views: views?.slice(0, 10),
    recent_nudges: nudges,
  })
}

export async function POST(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Trigger the edge function manually
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/nudge-abandoned-checkouts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({}),
    }
  )
  const data = await res.json()
  return NextResponse.json({ triggered: true, result: data })
}
