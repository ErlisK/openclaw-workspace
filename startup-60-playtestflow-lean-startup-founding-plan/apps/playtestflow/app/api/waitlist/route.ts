import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashEmail, trackServer } from '@/lib/analytics/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email, role, consent,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      referrer, page_path, session_id,
      interview_interested, pricing_tier_interest,
    } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!consent) {
      return NextResponse.json({ error: 'Consent required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('waitlist_signups')
      .insert([{
        email: email.toLowerCase().trim(),
        role: role || 'designer',
        source: utm_source || 'direct',
        consent_given: true,
        interview_interested: interview_interested ?? false,
        pricing_tier_interest: pricing_tier_interest ?? null,
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        utm_campaign: utm_campaign ?? null,
        utm_content: utm_content ?? null,
        utm_term: utm_term ?? null,
        referrer: referrer ?? null,
        page_path: page_path ?? null,
      }])
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: "You're already on the list!" })
      }
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 })
    }

    // If interview_interested, also create interview_candidate record
    if (interview_interested && data?.id) {
      await supabase.from('interview_candidates').insert([{
        email: email.toLowerCase().trim(),
        role: role || 'designer',
        consent_given: true,
        interview_status: 'pending',
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        utm_campaign: utm_campaign ?? null,
        referrer: referrer ?? null,
      }])
    }

    // Fire analytics event — hashed email only, no raw PII
    const emailHash = await hashEmail(email)
    await trackServer(
      'waitlist_submitted',
      {
        email_hash: emailHash,
        role: role || 'designer',
        source: 'waitlist_api',
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        utm_campaign: utm_campaign ?? null,
        interview_interested: interview_interested ?? false,
      },
      emailHash // use hash as distinct_id
    )

    return NextResponse.json({
      success: true,
      message: "You're on the list! We'll be in touch.",
      id: data?.id,
    })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
