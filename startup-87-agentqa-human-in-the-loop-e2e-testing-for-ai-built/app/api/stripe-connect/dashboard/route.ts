/**
 * POST /api/stripe-connect/dashboard
 * Returns a Stripe Express dashboard login link for the tester.
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('tester_profile')
    .select('stripe_connect_id, connect_status')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.stripe_connect_id) {
    return NextResponse.json({ error: 'No Stripe Connect account found' }, { status: 404 })
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(profile.stripe_connect_id)
    return NextResponse.json({ url: loginLink.url })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
