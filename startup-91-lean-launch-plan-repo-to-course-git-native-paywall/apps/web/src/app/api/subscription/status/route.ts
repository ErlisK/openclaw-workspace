/**
 * GET /api/subscription/status
 *
 * Returns the current creator's plan and subscription details.
 * Used by the billing page and pricing page to show current plan.
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/resolve-user';
import { getCreatorPlan } from '@/lib/subscription/server';
import { createServiceClient } from '@/lib/supabase/service';
import { PLANS } from '@/lib/subscription/plans';

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ plan: 'free', authenticated: false });

  const plan = await getCreatorPlan(user.id);

  const supa = createServiceClient();
  const { data: sub } = await supa
    .from('subscriptions')
    .select('status, current_period_end, cancel_at_period_end, stripe_price_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    plan,
    planName: PLANS[plan].name,
    subscription: sub ?? null,
  });
}
