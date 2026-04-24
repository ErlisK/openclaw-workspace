/**
 * POST /api/connections/stripe/import
 * Import charges from the user's connected Stripe account.
 * Body: { limit?: number, starting_after?: string }
 * Returns: { imported, skipped, total, has_more, next_cursor }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getEntitlement } from '@/lib/entitlements'
import Stripe from 'stripe'

export const maxDuration = 60

export async function POST(request: Request) {
  const entResult = await getEntitlement()
  if (entResult instanceof NextResponse) return entResult

  const body = await request.json().catch(() => ({}))
  const limit = Math.min(Number(body.limit) || 100, 500)
  const startingAfter = body.starting_after as string | undefined

  const supabase = await createClient()

  // Get the stored Stripe connection
  const { data: conn, error: connErr } = await supabase
    .from('stripe_connections')
    .select('stripe_key_enc, key_hint, account_name, is_test_mode')
    .eq('user_id', entResult.user.id)
    .single()

  if (connErr || !conn) {
    return NextResponse.json(
      { error: 'No Stripe account connected. Visit /settings/connections to add your Stripe key.' },
      { status: 404 }
    )
  }

  // Decode the key
  let stripeKey: string
  try {
    stripeKey = Buffer.from(conn.stripe_key_enc, 'base64').toString('utf-8')
  } catch {
    return NextResponse.json({ error: 'Stored Stripe key is corrupted. Please reconnect.' }, { status: 500 })
  }

  const userStripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' as '2026-04-22.dahlia' })

  // Fetch charges (paginated)
  const rows: Record<string, unknown>[] = []
  let hasMore = true
  let cursor = startingAfter
  let nextCursor: string | undefined

  try {
    while (hasMore && rows.length < limit) {
      const charges = await userStripe.charges.list({
        limit: Math.min(100, limit - rows.length),
        ...(cursor ? { starting_after: cursor } : {}),
      }) as unknown as { data: Record<string, unknown>[]; has_more: boolean }

      for (const ch of charges.data) {
        const amount = ((ch.amount as number) ?? 0) / 100
        const billingDetails = ch.billing_details as Record<string, unknown> | null
        rows.push({
          user_id: entResult.user.id,
          platform: 'stripe',
          platform_txn_id: `stripe_${ch.id as string}`,
          amount_cents: ch.amount as number ?? 0,
          currency: ((ch.currency as string) ?? 'usd').toUpperCase(),
          is_refunded: ch.refunded as boolean ?? false,
          customer_key: billingDetails?.email as string ?? ch.receipt_email as string ?? null,
          purchased_at: new Date(((ch.created as number) ?? 0) * 1000).toISOString(),
          metadata: {
            description: ch.description,
            product_name: (ch.metadata as Record<string, unknown>)?.product_name ?? ch.description ?? null,
            charge_id: ch.id,
            amount_usd: amount,
            account: conn.account_name,
          },
        })
      }

      hasMore = charges.has_more
      if (charges.data.length > 0) {
        cursor = charges.data[charges.data.length - 1].id as string
        if (charges.has_more) nextCursor = cursor
      } else {
        hasMore = false
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Stripe API error: ${err}. Your key may be invalid or expired.` },
      { status: 400 }
    )
  }

  if (rows.length === 0) {
    return NextResponse.json({
      imported: 0, skipped: 0, total: 0, has_more: false,
      message: 'No charges found in this Stripe account. If you have charges, try a higher limit.',
    })
  }

  // Upsert into transactions table
  const { error: upsertErr, count } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,platform,platform_txn_id', ignoreDuplicates: true, count: 'exact' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  // Update last_imported_at and import_count
  await supabase
    .from('stripe_connections')
    .update({
      last_imported_at: new Date().toISOString(),
      import_count: (rows.length),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', entResult.user.id)

  return NextResponse.json({
    imported: rows.length,
    skipped: rows.length - (count ?? rows.length),
    total: rows.length,
    has_more: !!nextCursor,
    next_cursor: nextCursor ?? null,
    account: conn.account_name,
    is_test_mode: conn.is_test_mode,
    message: `Imported ${rows.length} charges from ${conn.account_name}`,
  })
}
