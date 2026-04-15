import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { CREDIT_PACKS, TIER_CREDITS } from '@/lib/stripe'
import BillingClient from './BillingClient'

export const metadata = {
  title: 'Billing — BetaWindow',
  description: 'Manage your credits and billing history',
}

interface Transaction {
  id: string
  amount_cents: number
  balance_after: number
  kind: string
  description: string | null
  job_id: string | null
  stripe_payment_intent_id: string | null
  created_at: string
}

interface UserProfile {
  credits_balance: number
  credits_held: number
  stripe_customer_id: string | null
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string; session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/billing')
  }

  const admin = createAdminClient()

  // Fetch user profile
  const { data: profile } = await admin
    .from('users')
    .select('credits_balance, credits_held, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const userProfile: UserProfile = profile ?? {
    credits_balance: 0,
    credits_held: 0,
    stripe_customer_id: null,
  }

  // Fetch recent transactions
  const { data: rawTransactions } = await admin
    .from('credit_transactions')
    .select('id, amount_cents, balance_after, kind, description, job_id, stripe_payment_intent_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const transactions: Transaction[] = rawTransactions ?? []

  const sp = await searchParams
  const isSuccess = sp.success === '1'
  const isCancelled = sp.cancelled === '1'
  const sessionId = sp.session_id ?? null

  return (
    <BillingClient
      profile={userProfile}
      transactions={transactions}
      packs={CREDIT_PACKS}
      tierCosts={TIER_CREDITS}
      isSuccess={isSuccess}
      isCancelled={isCancelled}
      sessionId={sessionId}
      userEmail={user.email ?? ''}
    />
  )
}
