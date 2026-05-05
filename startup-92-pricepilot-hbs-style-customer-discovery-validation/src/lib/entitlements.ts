import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

/**
 * Check the current user's plan from their entitlements row.
 * Returns { user, plan, isPro } or a NextResponse error to return directly.
 */
export async function getEntitlement(): Promise<
  { user: { id: string; email?: string }; plan: string; isPro: boolean } | NextResponse
> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: ent } = await supabase
    .from('entitlements')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const plan = ent?.plan || 'free'
  const isPro = plan === 'pro'

  return { user: { id: user.id, email: user.email }, plan, isPro }
}

/**
 * Require Pro plan. Returns a 403 PaywallError response if user is on free plan.
 * Usage:
 *   const result = await requirePro()
 *   if (result instanceof NextResponse) return result
 *   const { user } = result
 */
export async function requirePro(): Promise<
  { user: { id: string; email?: string }; plan: string; isPro: true } | NextResponse
> {
  const result = await getEntitlement()
  if (result instanceof NextResponse) return result

  if (!result.isPro) {
    return NextResponse.json(
      {
        error: 'Pro plan required',
        code: 'PLAN_UPGRADE_REQUIRED',
        upgrade_url: '/pricing',
        message: 'This feature requires a PricingSim Pro subscription ($29/month). Upgrade at /pricing.',
      },
      { status: 403 }
    )
  }

  return result as { user: { id: string; email?: string }; plan: string; isPro: true }
}
