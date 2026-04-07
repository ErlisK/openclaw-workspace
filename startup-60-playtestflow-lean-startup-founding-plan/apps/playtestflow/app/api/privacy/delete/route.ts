import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { anonymizeUserData } from '@/lib/privacy'

/**
 * POST /api/privacy/delete
 * GDPR Art. 17 (right to erasure) + CCPA §1798.105 (right to delete)
 *
 * Body: {
 *   confirm: true       — must be explicitly set
 *   hardDelete?: boolean — true = harder deletion (cancels sub, removes more data)
 *   reason?: string     — optional (why leaving)
 * }
 *
 * Process:
 *   1. Anonymize personal data across tables
 *   2. Record privacy request
 *   3. Cancel active subscription via Stripe (if any)
 *   4. Sign user out of all sessions
 *   5. Delete auth.users record (point of no return)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (body.confirm !== true) {
    return NextResponse.json({
      error: 'Deletion requires explicit confirmation. Pass { confirm: true } in the request body.',
    }, { status: 400 })
  }

  const svc = createServiceClient()

  // Check for active paid subscription — warn but don't block
  const { data: sub } = await svc
    .from('subscriptions')
    .select('stripe_subscription_id, status, plan_id')
    .eq('user_id', user.id)
    .single()

  // Create request record
  const { data: req } = await svc
    .from('privacy_requests')
    .insert({
      user_id:      user.id,
      request_type: 'delete',
      status:       'processing',
      regulation:   body.regulation ?? 'gdpr',
      notes:        body.reason ? `Reason: ${body.reason.slice(0, 500)}` : null,
    })
    .select('id')
    .single()

  // Anonymize all personal data
  const result = await anonymizeUserData(user.id, { hardDelete: body.hardDelete ?? false })

  if (!result.ok) {
    await svc.from('privacy_requests').update({
      status:        'failed',
      error_message: result.error ?? 'Anonymization failed',
      completed_at:  new Date().toISOString(),
    }).eq('id', req?.id)

    return NextResponse.json({ error: result.error ?? 'Deletion failed' }, { status: 500 })
  }

  // Cancel Stripe subscription if active
  if (sub?.stripe_subscription_id && ['active', 'trialing'].includes(sub.status ?? '')) {
    try {
      const { stripe } = await import('@/lib/stripe')
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
        metadata: { cancelled_reason: 'account_deletion' },
      })
    } catch {
      // Non-fatal — subscription will expire naturally
    }
  }

  // Update request to completed
  await svc.from('privacy_requests').update({
    status:         'completed',
    completed_at:   new Date().toISOString(),
    deleted_tables: result.tablesAnonymized,
    notes:          [
      req ? null : null,
      `${result.rowsAffected} rows anonymized across ${result.tablesAnonymized.length} tables`,
      body.reason ? `Reason: ${body.reason.slice(0, 200)}` : null,
    ].filter(Boolean).join(' · '),
  }).eq('id', req?.id)

  // Sign out all sessions
  await supabase.auth.signOut()

  // Delete the auth.users record (irreversible)
  await svc.auth.admin.deleteUser(user.id)

  return NextResponse.json({
    ok:              true,
    requestId:       req?.id,
    tablesAnonymized: result.tablesAnonymized,
    rowsAffected:    result.rowsAffected,
    message:         'Your account and personal data have been deleted. Thank you for using PlaytestFlow.',
  })
}
