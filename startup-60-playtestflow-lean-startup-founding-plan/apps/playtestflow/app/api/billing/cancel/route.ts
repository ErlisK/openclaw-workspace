import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { trackCancellationReason, trackConversionEvent } from '@/lib/instrumentation'
import type { CancelReasonCode } from '@/lib/instrumentation'

/**
 * POST /api/billing/cancel
 * Capture cancellation reason then schedule subscription cancellation in Stripe.
 * 
 * Body: {
 *   reason_code: CancelReasonCode
 *   reason_detail?: string
 *   cancel_immediately?: boolean  (default: false → cancel at period end)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { reason_code, reason_detail, cancel_immediately = false } = body

    const VALID_REASONS: CancelReasonCode[] = [
      'too_expensive', 'missing_feature', 'not_enough_use',
      'found_alternative', 'project_ended', 'technical_issues', 'other',
    ]
    if (!VALID_REASONS.includes(reason_code)) {
      return NextResponse.json({ error: 'Invalid reason_code' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Get subscription info
    const { data: sub } = await svc
      .from('subscriptions')
      .select('stripe_subscription_id, plan_id, status, created_at')
      .eq('user_id', user.id)
      .single()

    if (!sub || sub.status === 'canceled') {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Compute months active
    const monthsActive = sub.created_at
      ? Math.max(1, Math.round((Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : null

    // Cancel in Stripe (lazy import to avoid build-time module eval)
    let stripeEventId: string | undefined
    if (sub.stripe_subscription_id && sub.stripe_subscription_id.startsWith('sub_')) {
      try {
        const { stripe: stripeLib } = await import('@/lib/stripe')
        const updated = await stripeLib.subscriptions.update(sub.stripe_subscription_id, {
          cancel_at_period_end: !cancel_immediately,
        })
        if (cancel_immediately) {
          await stripeLib.subscriptions.cancel(sub.stripe_subscription_id)
        }
        stripeEventId = updated.id
      } catch (stripeErr) {
        console.error('[cancel] Stripe error (non-blocking):', stripeErr)
        // Don't fail the whole request — record reason anyway
      }
    }

    // Update local subscription
    await svc.from('subscriptions').update({
      cancel_at_period_end: !cancel_immediately,
      updated_at: new Date().toISOString(),
      ...(cancel_immediately ? { status: 'canceled', canceled_at: new Date().toISOString() } : {}),
    }).eq('user_id', user.id)

    // Record cancellation reason + conversion event (non-throwing)
    await Promise.all([
      trackCancellationReason({
        userId: user.id,
        subscriptionId: sub.stripe_subscription_id ?? 'manual',
        reasonCode: reason_code as CancelReasonCode,
        reasonDetail: reason_detail,
        planId: sub.plan_id,
        monthsActive: monthsActive ?? undefined,
        stripeEvent: stripeEventId,
      }),
      trackConversionEvent({
        userId: user.id,
        planId: sub.plan_id,
        eventType: 'downgrade',
        stripeEvent: stripeEventId,
        metadata: { reason_code, cancel_immediately, months_active: monthsActive },
      }),
    ])

    return NextResponse.json({
      ok: true,
      cancel_at_period_end: !cancel_immediately,
      message: cancel_immediately
        ? 'Your subscription has been cancelled immediately.'
        : 'Your subscription will cancel at the end of the current billing period.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cancellation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/billing/cancel
 * Check whether user has cancel_at_period_end set.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ scheduled: false })

    const svc = createServiceClient()
    const { data: sub } = await svc
      .from('subscriptions')
      .select('cancel_at_period_end, current_period_end, status, plan_id')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      scheduled: sub?.cancel_at_period_end ?? false,
      period_end: sub?.current_period_end ?? null,
      status: sub?.status ?? null,
      plan_id: sub?.plan_id ?? null,
    })
  } catch {
    return NextResponse.json({ scheduled: false })
  }
}
