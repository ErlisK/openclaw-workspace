/**
 * GET /api/admin/credit-transactions
 * Owner-only: returns all credit transactions with user email, paginated.
 * Query params:
 *   ?page=1&limit=50&kind=job_hold&user_id=xxx&job_id=xxx&from=ISO&to=ISO
 *
 * Auth: requires user with role='admin' in users table.
 * Returns 403 for non-admins, 401 for unauthenticated.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const admin = createAdminClient()
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (dbUser?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // Parse query params
  const sp = req.nextUrl.searchParams
  const page   = Math.max(1, parseInt(sp.get('page')  ?? '1', 10))
  const limit  = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)))
  const kind   = sp.get('kind')    ?? null
  const userId = sp.get('user_id') ?? null
  const jobId  = sp.get('job_id')  ?? null
  const from   = sp.get('from')    ?? null
  const to     = sp.get('to')      ?? null
  const offset = (page - 1) * limit

  // Build query with filters
  let q = admin
    .from('credit_transactions')
    .select(`
      id,
      user_id,
      amount_cents,
      balance_after,
      kind,
      description,
      job_id,
      stripe_payment_intent_id,
      created_at,
      users!credit_transactions_user_id_fkey (
        email,
        role,
        credits_balance,
        credits_held
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (kind)   q = q.eq('kind', kind)
  if (userId) q = q.eq('user_id', userId)
  if (jobId)  q = q.eq('job_id', jobId)
  if (from)   q = q.gte('created_at', from)
  if (to)     q = q.lte('created_at', to)

  const { data: transactions, error: txError, count } = await q

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  // Aggregate stats
  const { data: stats } = await admin
    .from('credit_transactions')
    .select('kind, amount_cents')

  const summary = (stats ?? []).reduce(
    (acc: Record<string, { count: number; total_cents: number }>, tx: { kind: string; amount_cents: number }) => {
      if (!acc[tx.kind]) acc[tx.kind] = { count: 0, total_cents: 0 }
      acc[tx.kind].count++
      acc[tx.kind].total_cents += tx.amount_cents
      return acc
    },
    {}
  )

  // Also get total user count + credit distribution
  const { data: userStats } = await admin
    .from('users')
    .select('credits_balance, credits_held')

  const totalUsers = userStats?.length ?? 0
  const totalBalance = userStats?.reduce((s: number, u: { credits_balance: number | null }) => s + (u.credits_balance ?? 0), 0) ?? 0
  const totalHeld = userStats?.reduce((s: number, u: { credits_held: number | null }) => s + (u.credits_held ?? 0), 0) ?? 0

  return NextResponse.json({
    transactions: transactions ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    },
    summary,
    platform: {
      total_users: totalUsers,
      total_credits_outstanding: totalBalance,
      total_credits_held: totalHeld,
      total_credits_available: totalBalance - totalHeld,
    },
    filters: { kind, user_id: userId, job_id: jobId, from, to },
  })
}
