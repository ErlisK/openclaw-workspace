/**
 * POST /api/analytics
 * Receive client-side analytics events; store in Supabase analytics_events table.
 * Accepts: { event, properties? }
 */
import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { event, properties = {} } = body

  if (!event || typeof event !== 'string') {
    return NextResponse.json({ error: 'event required' }, { status: 400 })
  }

  // Get user if authenticated
  let userId: string | null = null
  try {
    const userSupabase = await createUserClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    userId = user?.id ?? null
  } catch { /* anonymous event */ }

  // Write event using service role (bypasses RLS for write-only analytics)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    await adminSupabase.from('analytics_events').insert({
      user_id: userId,
      event,
      properties,
      page: properties.page ?? null,
      referrer: properties.referrer ?? null,
      ab_variant: properties.ab_variant ?? null,
      created_at: new Date().toISOString(),
    })
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true, event })
}
