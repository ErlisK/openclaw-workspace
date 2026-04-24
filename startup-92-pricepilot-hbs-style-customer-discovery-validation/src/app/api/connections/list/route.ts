import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getEntitlement } from '@/lib/entitlements'

export async function GET() {
  const entResult = await getEntitlement()
  if (entResult instanceof NextResponse) return entResult

  const supabase = await createClient()
  const { data: conn } = await supabase
    .from('stripe_connections')
    .select('id, label, key_hint, account_id, account_name, is_test_mode, last_imported_at, import_count, created_at')
    .eq('user_id', entResult.user.id)
    .single()

  return NextResponse.json({
    stripe: conn ? {
      connected: true,
      label: conn.label,
      key_hint: conn.key_hint,
      account_id: conn.account_id,
      account_name: conn.account_name,
      is_test_mode: conn.is_test_mode,
      last_imported_at: conn.last_imported_at,
      import_count: conn.import_count,
      connected_at: conn.created_at,
    } : { connected: false },
  })
}
