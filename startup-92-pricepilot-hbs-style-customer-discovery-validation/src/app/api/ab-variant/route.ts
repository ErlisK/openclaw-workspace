/**
 * GET /api/ab-variant?experiment=hero
 * Returns the assigned variant for the given experiment.
 * Assignment is sticky via cookie (no auth required).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const experimentKey = searchParams.get('experiment')
  if (!experimentKey) {
    return NextResponse.json({ error: 'experiment param required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: variants } = await supabase
    .from('ab_message_variants')
    .select('*')
    .eq('experiment_key', experimentKey)
    .eq('active', true)
    .order('variant_key')

  if (!variants || variants.length === 0) {
    return NextResponse.json({ error: 'No variants found' }, { status: 404 })
  }

  // Sticky assignment via cookie
  const cookieStore = await cookies()
  const cookieName = `ab_${experimentKey}`
  const existingVariant = cookieStore.get(cookieName)?.value

  let assigned = variants.find(v => v.variant_key === existingVariant)

  if (!assigned) {
    // Weighted random assignment
    const totalWeight = variants.reduce((sum, v) => sum + Number(v.weight), 0)
    let rand = Math.random() * totalWeight
    for (const v of variants) {
      rand -= Number(v.weight)
      if (rand <= 0) { assigned = v; break }
    }
    assigned = assigned ?? variants[0]
  }

  const response = NextResponse.json({
    experiment: experimentKey,
    variant: assigned.variant_key,
    headline: assigned.headline,
    subheadline: assigned.subheadline,
    cta_text: assigned.cta_text,
    description: assigned.description,
  })

  // Set sticky cookie (30 days)
  response.cookies.set(cookieName, assigned.variant_key, {
    maxAge: 30 * 86400,
    path: '/',
    httpOnly: false, // readable client-side for analytics
    sameSite: 'lax',
  })

  return response
}
