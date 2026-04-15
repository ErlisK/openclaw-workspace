import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import AdminCreditsClient from './AdminCreditsClient'

export const metadata = {
  title: 'Admin — Credit Audit',
}

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string; kind?: string; user_id?: string; job_id?: string; from?: string; to?: string
  }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/credits')

  const admin = createAdminClient()
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (dbUser?.role !== 'admin') {
    return (
      <div data-testid="admin-forbidden" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: 16
      }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Access Denied</h1>
        <p style={{ color: '#64748b' }}>Admin role required to view this page.</p>
        <a href="/dashboard" style={{ color: '#3b82f6', fontSize: 14 }}>← Back to Dashboard</a>
      </div>
    )
  }

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const kind = sp.kind ?? ''
  const userId = sp.user_id ?? ''
  const jobId = sp.job_id ?? ''
  const from = sp.from ?? ''
  const to = sp.to ?? ''
  const limit = 50

  // Build query
  let q = admin
    .from('credit_transactions')
    .select(`
      id, user_id, amount_cents, balance_after, kind, description,
      job_id, stripe_payment_intent_id, created_at,
      users!credit_transactions_user_id_fkey ( email, credits_balance, credits_held )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (kind)   q = q.eq('kind', kind) as typeof q
  if (userId) q = q.eq('user_id', userId) as typeof q
  if (jobId)  q = q.eq('job_id', jobId) as typeof q
  if (from)   q = q.gte('created_at', from) as typeof q
  if (to)     q = q.lte('created_at', to) as typeof q

  const { data: transactions, count } = await q

  // Platform stats
  const { data: userStats } = await admin.from('users').select('credits_balance, credits_held')
  const { data: allTxStats } = await admin.from('credit_transactions').select('kind, amount_cents')

  const summary = (allTxStats ?? []).reduce(
    (acc: Record<string, { count: number; total_cents: number }>, tx: { kind: string; amount_cents: number }) => {
      if (!acc[tx.kind]) acc[tx.kind] = { count: 0, total_cents: 0 }
      acc[tx.kind].count++
      acc[tx.kind].total_cents += tx.amount_cents
      return acc
    }, {}
  )

  const platform = {
    total_users: userStats?.length ?? 0,
    total_credits_outstanding: userStats?.reduce((s: number, u: { credits_balance: number | null }) => s + (u.credits_balance ?? 0), 0) ?? 0,
    total_credits_held: userStats?.reduce((s: number, u: { credits_held: number | null }) => s + (u.credits_held ?? 0), 0) ?? 0,
    total_credits_available: (userStats?.reduce((s: number, u: { credits_balance: number | null }) => s + (u.credits_balance ?? 0), 0) ?? 0)
      - (userStats?.reduce((s: number, u: { credits_held: number | null }) => s + (u.credits_held ?? 0), 0) ?? 0),
  }

  return (
    <AdminCreditsClient
      transactions={(transactions ?? []) as AdminTransaction[]}
      pagination={{ page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) }}
      summary={summary}
      platform={platform}
      filters={{ kind, user_id: userId, job_id: jobId, from, to }}
    />
  )
}

export interface AdminTransaction {
  id: string
  user_id: string
  amount_cents: number
  balance_after: number
  kind: string
  description: string | null
  job_id: string | null
  stripe_payment_intent_id: string | null
  created_at: string
  users: { email: string; credits_balance: number; credits_held: number } | null
}
