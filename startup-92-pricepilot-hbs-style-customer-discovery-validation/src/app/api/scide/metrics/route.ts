/**
 * GET /api/scide/metrics
 * Internal metrics endpoint for SCIDE business intelligence.
 *
 * Requires: Authorization: Bearer <SCIDE_METRICS_TOKEN>
 *
 * Returns:
 *   total_users       - real users (excluding test/e2e/playwright accounts)
 *   new_signups_24h   - signups in the last 24 hours
 *   monthly_revenue   - USD revenue from Stripe this calendar month
 *   yearly_revenue    - monthly_revenue * 12
 *   active_experiments - number of running A/B experiments
 *   null for any metric that cannot be determined
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TEST_EMAIL_PATTERNS = [
  'test-%',
  'e2e-%',
  'playwright-%',
  'profile-check-%',
  'qa-test-%',
  '%@example.com',
  '%@test.com',
  '%@mailtest.com',
  '%@agentmail.to',
  '%.test',
  '%pricepilot.test',
  '%pricepilot.local',
]

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  const expected = (process.env.SCIDE_METRICS_TOKEN ?? '').trim()
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()

  // ── 1. Total real users ─────────────────────────────────────────────
  let total_users: number | null = null
  try {
    let query = supabase.from('profiles').select('id', { count: 'exact', head: true })
    for (const pattern of TEST_EMAIL_PATTERNS) {
      query = query.not('email', 'ilike', pattern)
    }
    const { count, error } = await query
    if (!error) total_users = count ?? 0
  } catch {}

  // ── 2. New signups in last 24 h ─────────────────────────────────────
  let new_signups_24h: number | null = null
  try {
    const since = new Date(Date.now() - 86400_000).toISOString()
    let query = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
    for (const pattern of TEST_EMAIL_PATTERNS) {
      query = query.not('email', 'ilike', pattern)
    }
    const { count, error } = await query
    if (!error) new_signups_24h = count ?? 0
  } catch {}

  // ── 3. Stripe revenue (this calendar month) ─────────────────────────
  let monthly_revenue: number | null = null
  let yearly_revenue: number | null = null
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey) {
      const now = new Date()
      const monthStart = Math.floor(
        new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000
      )
      const res = await fetch(
        `https://api.stripe.com/v1/charges?limit=100&created[gte]=${monthStart}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(stripeKey + ':').toString('base64')}`,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        const charges = (data.data ?? []) as Array<{ status: string; amount: number; refunded: boolean }>
        const total = charges
          .filter((c) => c.status === 'succeeded' && !c.refunded)
          .reduce((sum, c) => sum + c.amount, 0)
        monthly_revenue = total / 100
        yearly_revenue = parseFloat((monthly_revenue * 12).toFixed(2))
      }
    }
  } catch {}

  // ── 4. Active experiments ────────────────────────────────────────────
  let active_experiments: number | null = null
  try {
    const { count, error } = await supabase
      .from('experiments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'running')
    if (!error) active_experiments = count ?? 0
  } catch {}

  // ── 5. Trialing subscriptions (Stripe) ──────────────────────────────
  let trialing_users: number | null = null
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey) {
      const res = await fetch(
        'https://api.stripe.com/v1/subscriptions?status=trialing&limit=100',
        {
          headers: {
            Authorization: `Basic ${Buffer.from(stripeKey + ':').toString('base64')}`,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        trialing_users = (data.data ?? []).length
      }
    }
  } catch {}

  // ── 6. Pro/paid users (Supabase profiles with plan = 'pro') ──────────
  let pro_users: number | null = null
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'pro')
    if (!error) pro_users = count ?? 0
  } catch {}

  return NextResponse.json({
    total_users,
    new_signups_24h,
    monthly_revenue,
    yearly_revenue,
    active_experiments,
    trialing_users,
    pro_users,
    collected_at: new Date().toISOString(),
  })
}
