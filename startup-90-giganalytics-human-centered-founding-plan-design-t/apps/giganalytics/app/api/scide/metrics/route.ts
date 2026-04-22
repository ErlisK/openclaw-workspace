import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

function createServiceClient() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function queryUserMetrics() {
  const supabase = createServiceClient()
  const { data: countData, error: countError } = await supabase.rpc('scide_user_metrics')
  if (countError) throw countError
  return countData as unknown as {
    total_users: number
    new_signups_24h: number
    churned_users_24h: number | null
  }
}

async function queryStripeRevenue(): Promise<number | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia' as never,
    })
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const monthStartTimestamp = Math.floor(monthStart.getTime() / 1000)

    let totalCents = 0
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const charges = await stripe.charges.list({
        created: { gte: monthStartTimestamp },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      for (const charge of charges.data) {
        if (charge.status === 'succeeded' && !charge.refunded) {
          totalCents += charge.amount
        }
      }
      hasMore = charges.has_more
      if (charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1].id
      }
    }

    return Math.round((totalCents / 100) * 100) / 100
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '').trim()
  const expectedToken = process.env.SCIDE_METRICS_TOKEN

  if (!expectedToken || !token || token !== expectedToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // ── Collect metrics ───────────────────────────────────────────────────────
  const collectedAt = new Date().toISOString()

  let total_users: number | null = null
  let new_signups_24h: number | null = null
  let churned_users_24h: number | null = null

  try {
    const userMetrics = await queryUserMetrics()
    // RPC returns an array with one row
    const row = Array.isArray(userMetrics) ? userMetrics[0] : userMetrics
    total_users = row?.total_users ?? null
    new_signups_24h = row?.new_signups_24h ?? null
    churned_users_24h = row?.churned_users_24h ?? null
  } catch {
    // DB unavailable — all user metrics remain null
  }

  const monthly_revenue = await queryStripeRevenue()
  const yearly_revenue = monthly_revenue !== null
    ? Math.round(monthly_revenue * 12 * 100) / 100
    : null

  const attrition_rate =
    churned_users_24h !== null && total_users !== null && total_users > 0
      ? Math.round((churned_users_24h / total_users) * 100 * 100) / 100
      : null

  return NextResponse.json({
    ok: true,
    collected_at: collectedAt,
    metrics: {
      total_users,
      new_signups_24h,
      churned_users_24h,
      attrition_rate,
      monthly_revenue,
      yearly_revenue,
      costs: null,
      net_profit: null,
    },
    sources: {
      total_users: total_users !== null
        ? 'database:profiles WHERE is_test_account IS NOT TRUE AND email NOT LIKE test-/e2e-/playwright-/etc patterns'
        : null,
      new_signups_24h: new_signups_24h !== null
        ? 'database:profiles WHERE created_at > NOW() - INTERVAL 24h AND is_test_account IS NOT TRUE'
        : null,
      churned_users_24h: churned_users_24h !== null
        ? 'database:profiles WHERE last_login_at < NOW() - INTERVAL 30d AND created_at < NOW() - INTERVAL 30d'
        : 'null: no last_login_at column yet — add migration 009',
      monthly_revenue: monthly_revenue !== null
        ? 'stripe:charges WHERE status=succeeded AND created >= month_start'
        : 'null: STRIPE_SECRET_KEY unavailable or Stripe error',
      yearly_revenue: yearly_revenue !== null ? 'derived: monthly_revenue * 12' : null,
      costs: null,
      net_profit: null,
    },
  })
}
