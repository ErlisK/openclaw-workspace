import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/analytics/summary — returns basic counts for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { count: transaction_count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: product_count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: suggestion_count } = await supabase
    .from('suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending')

  return NextResponse.json({
    transaction_count: transaction_count ?? 0,
    product_count: product_count ?? 0,
    suggestion_count: suggestion_count ?? 0,
  })
}
