import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCreditBalance, getCreditTransactions, getTopupPackages } from '@/lib/credits'

/**
 * GET /api/credits
 * Returns current user's credit balance, recent transactions, and available packages.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [balance, transactions, packages] = await Promise.all([
      getCreditBalance(user.id),
      getCreditTransactions(user.id, 10),
      getTopupPackages(),
    ])

    return NextResponse.json({ balance, transactions, packages })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching credits'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
