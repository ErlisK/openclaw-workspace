/**
 * GET /api/stripe-connect/status
 * Returns the Stripe Connect account status for the authenticated tester.
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('tester_profile')
    .select('stripe_connect_id, connect_status, payout_method')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.stripe_connect_id) {
    return NextResponse.json({ connected: false, status: 'not_started' })
  }

  try {
    const account = await stripe.accounts.retrieve(profile.stripe_connect_id)
    const isActive = account.charges_enabled && account.payouts_enabled

    const newStatus = isActive ? 'active' : 'onboarding'
    if (newStatus !== profile.connect_status) {
      await admin.from('tester_profile').update({
        connect_status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
    }

    return NextResponse.json({
      connected: true,
      status: newStatus,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
    })
  } catch (e) {
    return NextResponse.json({ connected: false, status: 'error', error: String(e) })
  }
}
