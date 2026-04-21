/**
 * GET /api/scide/metrics
 * Protected metrics endpoint for ScIDE daily operations monitoring.
 * Auth: Authorization: Bearer $SCIDE_METRICS_TOKEN
 *
 * Returns real data only — null for any metric that cannot be determined.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

// Test-account email patterns
const TEST_EMAIL_PREFIXES = ['test-', 'e2e-', 'playwright-', 'cypress-', 'bot-', 'qa-']
const TEST_EMAIL_CONTAINS = ['+test@', '+e2e@', '+bot@', '+qa@']
const TEST_EMAIL_DOMAINS = ['example.com', 'test.com', 'mailinator.com', 'guerrillamail.com', 'tempmail.com']

function isTestEmail(email: string): boolean {
  const lower = (email ?? '').toLowerCase()
  if (TEST_EMAIL_PREFIXES.some(p => lower.startsWith(p))) return true
  if (TEST_EMAIL_CONTAINS.some(c => lower.includes(c))) return true
  if (TEST_EMAIL_DOMAINS.some(d => lower.endsWith('@' + d))) return true
  return false
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token || token !== process.env.SCIDE_METRICS_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const collected_at = new Date().toISOString()
  const supabase = createAdminClient()

  // ── Total users ───────────────────────────────────────────────────────────
  // Try with is_test_account column first; fall back without it if column missing
  let total_users: number | null = null
  let new_signups_24h: number | null = null
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Attempt to select is_test_account (may not exist in DB yet)
    const { data: allData, error: allError } = await supabase
      .from('users')
      .select('id, email, is_test_account, created_at')

    if (!allError && allData) {
      const realUsers = allData.filter(
        (u: Record<string, unknown>) =>
          u['is_test_account'] !== true && !isTestEmail((u['email'] as string) ?? '')
      )
      total_users = realUsers.length
      new_signups_24h = realUsers.filter(
        (u: Record<string, unknown>) => (u['created_at'] as string) >= since24h
      ).length
    } else if (allError) {
      // Column may not exist — retry without is_test_account
      const { data: fallback, error: fbError } = await supabase
        .from('users')
        .select('id, email, created_at')
      if (!fbError && fallback) {
        const realUsers = fallback.filter(
          (u: Record<string, unknown>) => !isTestEmail((u['email'] as string) ?? '')
        )
        total_users = realUsers.length
        new_signups_24h = realUsers.filter(
          (u: Record<string, unknown>) => (u['created_at'] as string) >= since24h
        ).length
      }
    }
  } catch {}

  // ── Churn: null — no last_login / last_active column in schema ────────────
  const churned_users_24h: number | null = null
  const attrition_rate: number | null = null

  // ── Monthly revenue via Stripe ────────────────────────────────────────────
  let monthly_revenue: number | null = null
  let revenue_source: string | null = null
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {})
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthStartTs = Math.floor(monthStart.getTime() / 1000)

      let totalCents = 0
      let hasMore = true
      let startingAfter: string | undefined = undefined

      while (hasMore) {
        const params: Stripe.ChargeListParams = { created: { gte: monthStartTs }, limit: 100 }
        if (startingAfter) params.starting_after = startingAfter
        const charges = await stripe.charges.list(params)
        for (const charge of charges.data) {
          if (charge.paid && !charge.refunded && charge.status === 'succeeded') {
            totalCents += charge.amount
          }
        }
        hasMore = charges.has_more
        startingAfter = hasMore && charges.data.length > 0
          ? charges.data[charges.data.length - 1].id
          : undefined
        if (!startingAfter) hasMore = false
      }
      monthly_revenue = parseFloat((totalCents / 100).toFixed(2))
      revenue_source = 'stripe:charges (current calendar month, succeeded, paginated)'
    }
  } catch (err) {
    console.error('Stripe revenue query failed:', err)
  }

  const yearly_revenue = monthly_revenue !== null
    ? parseFloat((monthly_revenue * 12).toFixed(2))
    : null

  return NextResponse.json({
    ok: true,
    collected_at,
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
      total_users: 'database:users (email-pattern + is_test_account filtered, fallback without column)',
      new_signups_24h: 'database:users WHERE created_at > NOW() - INTERVAL 24h (test-filtered)',
      churned_users_24h: null,
      attrition_rate: null,
      monthly_revenue: revenue_source,
      yearly_revenue: yearly_revenue !== null ? 'calculated:monthly_revenue * 12' : null,
      costs: null,
      net_profit: null,
    },
  })
}
