import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, parent_first_name, child_age_bracket, interests, consent } = body

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const user_agent = req.headers.get('user-agent') ?? null
    const source = 'landing'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const payload: Record<string, unknown> = {
      email,
      source,
      consent: consent ?? false,
      user_agent,
    }
    if (parent_first_name) payload.parent_first_name = parent_first_name
    if (child_age_bracket) payload.child_age_bracket = child_age_bracket
    if (interests && Array.isArray(interests) && interests.length > 0) {
      payload.interests = interests
    } else if (interests && typeof interests === 'string' && interests.trim()) {
      payload.interests = interests.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    // ip is inet type — only set if we have a value
    if (ip) payload.ip = ip

    // Try anon insert first
    const anonClient = createClient(supabaseUrl, anonKey)
    const { error: anonError } = await anonClient
      .from('waitlist_signups')
      .insert([payload])

    if (anonError) {
      console.warn('Anon insert failed:', anonError.message, '— trying service role')
      if (serviceKey) {
        const serviceClient = createClient(supabaseUrl, serviceKey)
        const { error: svcError } = await serviceClient
          .from('waitlist_signups')
          .insert([payload])
        if (svcError) {
          console.error('Service role insert also failed:', svcError.message)
          return NextResponse.json({ error: svcError.message }, { status: 500 })
        }
      } else {
        console.error('No service role key available. RLS blocking anon insert.')
        return NextResponse.json({ error: anonError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Waitlist error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
