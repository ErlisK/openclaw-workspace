import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-only: use service_role key to bypass RLS for reliable inserts
// Never expose service_role key to client-side code
function getServiceClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase server env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, parent_first_name, child_age_bracket, interests, consent } = body

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'valid email required' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const user_agent = req.headers.get('user-agent') ?? null

    // Collect UTM / path from request body (landing page sends these)
    const path: string | null = body.path ?? null
    const utm_source: string | null = body.utm_source ?? null
    const utm_campaign: string | null = body.utm_campaign ?? null
    const utm_medium: string | null = body.utm_medium ?? null

    // waitlist_signups schema columns:
    // id, created_at, email, child_age_bracket, interests, child_first_name,
    // consent, source, utm_source, utm_medium, utm_campaign, utm_term,
    // utm_content, user_agent, ip, notes, parent_first_name
    const payload: Record<string, unknown> = {
      email: email.toLowerCase().trim(),
      source: utm_source ?? 'landing',
      consent: consent ?? false,
      user_agent,
    }

    if (parent_first_name) payload.parent_first_name = parent_first_name
    if (child_age_bracket) payload.child_age_bracket = child_age_bracket

    // Normalise interests to array
    if (Array.isArray(interests) && interests.length > 0) {
      payload.interests = interests
    } else if (typeof interests === 'string' && interests.trim()) {
      payload.interests = interests.split(',').map((s: string) => s.trim()).filter(Boolean)
    }

    if (ip) payload.ip = ip
    // path is not a schema column; store in notes for traceability
    if (path) payload.notes = `path=${path}`
    if (utm_source) payload.utm_source = utm_source
    if (utm_campaign) payload.utm_campaign = utm_campaign
    if (utm_medium) payload.utm_medium = utm_medium

    const client = getServiceClient()

    // Upsert on email for idempotent behaviour
    const { error } = await client
      .from('waitlist_signups')
      .upsert([payload], { onConflict: 'email', ignoreDuplicates: false })

    if (error) {
      console.error('Waitlist upsert error:', error.message, error.details)
      // Treat unique-violation as success (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, note: 'already_registered' })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Waitlist error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
