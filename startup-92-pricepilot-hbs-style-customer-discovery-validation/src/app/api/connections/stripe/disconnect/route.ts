import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getEntitlement } from '@/lib/entitlements'

export async function DELETE() {
  const entResult = await getEntitlement()
  if (entResult instanceof NextResponse) return entResult

  const supabase = await createClient()
  const { error } = await supabase
    .from('stripe_connections')
    .delete()
    .eq('user_id', entResult.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ disconnected: true })
}
