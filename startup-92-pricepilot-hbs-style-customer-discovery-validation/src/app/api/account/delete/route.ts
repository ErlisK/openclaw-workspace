import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdminClient()

  try {
    // Delete user-owned data in dependency order
    await admin.from('suggestions').delete().eq('user_id', user.id)
    await admin.from('experiments').delete().eq('user_id', user.id)
    await admin.from('transactions').delete().eq('user_id', user.id)
    await admin.from('products').delete().eq('user_id', user.id)
    await admin.from('stripe_connections').delete().eq('user_id', user.id)
    await admin.from('entitlements').delete().eq('user_id', user.id)

    // Delete the auth user
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)
    if (deleteErr) {
      console.error('[account/delete] Failed to delete auth user:', deleteErr)
      return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
    }

    return NextResponse.json({
      deleted: true,
      message: 'Your account and all associated data have been permanently deleted.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Deletion failed'
    console.error('[account/delete] Error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
