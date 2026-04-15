/**
 * POST /api/stripe-connect/onboard
 * Creates or retrieves a Stripe Connect Express account for the tester
 * and returns an onboarding link.
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

  let connectId = profile?.stripe_connect_id

  if (!connectId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      metadata: { supabase_user_id: user.id },
      capabilities: { transfers: { requested: true } },
    })
    connectId = account.id

    await admin.from('tester_profile').upsert({
      id: user.id,
      stripe_connect_id: connectId,
      connect_status: 'onboarding',
      updated_at: new Date().toISOString(),
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const accountLink = await stripe.accountLinks.create({
    account: connectId,
    refresh_url: `${appUrl}/onboarding/tester?step=payout&refresh=1`,
    return_url: `${appUrl}/onboarding/tester?step=profile&connect=success`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
