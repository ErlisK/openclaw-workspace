import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('plan, stripe_customer_id, stripe_subscription_id, plan_expires_at, experiments_used, experiments_limit')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    plan: entitlement?.plan || 'free',
    stripe_customer_id: entitlement?.stripe_customer_id || null,
    stripe_subscription_id: entitlement?.stripe_subscription_id || null,
    plan_expires_at: entitlement?.plan_expires_at || null,
    experiments_used: entitlement?.experiments_used ?? 0,
    experiments_limit: entitlement?.plan === 'pro' ? null : 3,
    is_pro: entitlement?.plan === 'pro',
  })
}
