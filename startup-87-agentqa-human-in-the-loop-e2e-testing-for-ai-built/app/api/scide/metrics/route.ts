/**
 * GET /api/scide/metrics
 * Protected metrics endpoint for ScIDE daily operations monitoring.
 * Auth: Authorization: Bearer $SCIDE_METRICS_TOKEN
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

// Test-account email patterns (SQL-style check done in JS after fetch, or inline SQL)
const TEST_EMAIL_PREFIXES = ['test-', 'e2e-', 'playwright-', 'cypress-', 'bot-', 'qa-']
const TEST_EMAIL_CONTAINS = ['+test@', '+e2e@', '+bot@', '+qa@']
const TEST_EMAIL_DOMAINS = ['example.com', 'test.com', 'mailinator.com', 'guerrillamail.com', 'tempmail.com']

function isTestEmail(email: string): boolean {
  const lower = email.toLowerCase()
  if (TEST_EMAIL_PREFIXES.some(p => lower.startsWith(p))) return true
  if (TEST_EMAIL_CONTAINS.some(c => lower.includes(c))) return true
  if (TEST_EMAIL_DOMAINS.some(d => lower.endsWith('@' + d))) return true
  return false
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '').trim()

  if (!token || token !== process.env.SCIDE_METRICS_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const collected_at = new Date().toISOString()
  const supabase = createAdminClient()

  // ── Total users (excluding test accounts) ────────────────────────────────
  let total_users: number | null = null
  let total_users_source = 'database:users WHERE is_test_account IS NOT TRUE (email-filtered)'
  try {
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, email, is_test_account')
    if (!error && allUsers) {
      total_users = allUsers.filter(
        u => u.is_test_account !== true && !isTestEmail(u.email ?? '')
      ).length
    }
  } catch {}

  // ── New signups in last 24h ───────────────────────────────────────────────
  let new_signups_24h: number | null = null
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: newUsers, error } = await supabase
      .from('users')
      .select('id, email, is_test_account')
      .gte('created_at', since)
    if (!error && newUsers) {
      new_signups_24h = newUsers.filter(
        u => u.is_test_account !== true && !isTestEmail(u.email ?? '')
      ).length
    }
  } catch {}

  // ── Churned users (null — no last_login/last_active column in schema) ─────
  // The public.users table has no last_login or last_active column.
  // Returning null until activity tracking is added.
  const churned_users_24h: number | null = null
  const churned_source = null

  // ── Attrition rate ───────────────────────────────────────────────────────
  const attrition_rate: number | null = null // churned_users_24h is null

  // ── Monthly revenue via Stripe ────────────────────────────────────────────
  let monthly_revenue: number | null = null
  let monthly_revenue_source = 'stripe:charges (current calendar month, succeeded)'
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
        const params: Stripe.ChargeListParams = {
          created: { gte: monthStartTs },
          limit: 100,
        }
        if (startingAfter) params.starting_after = startingAfter

        const charges = await stripe.charges.list(params)
        for (const charge of charges.data) {
          if (charge.paid && !charge.refunded && charge.status === 'succeeded') {
            totalCents += charge.amount
          }
        }
        hasMore = charges.has_more
        if (hasMore && charges.data.length > 0) {
          startingAfter = charges.data[charges.data.length - 1].id
        } else {
          hasMore = false
        }
      }

      monthly_revenue = parseFloat((totalCents / 100).toFixed(2))
    }
  } catch (err) {
    console.error('Stripe revenue query failed:', err)
    monthly_revenue = null
    monthly_revenue_source = 'stripe:error querying charges'
  }

  // ── Yearly revenue (projected) ────────────────────────────────────────────
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
      total_users: total_users_source,
      new_signups_24h: 'database:users WHERE created_at > NOW() - INTERVAL 24h AND is_test_account IS NOT TRUE',
      churned_users_24h: churned_source,
      attrition_rate: null,
      monthly_revenue: monthly_revenue !== null ? monthly_revenue_source : null,
      yearly_revenue: yearly_revenue !== null ? 'calculated:monthly_revenue * 12' : null,
      costs: null,
      net_profit: null,
    },
  })
}
