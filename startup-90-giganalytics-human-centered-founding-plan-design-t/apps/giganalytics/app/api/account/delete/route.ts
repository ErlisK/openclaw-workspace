import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  try {
    // Delete all user data respecting FK constraints (most specific → least specific)
    await supabase.from('time_entries').delete().eq('user_id', userId)
    await supabase.from('transactions').delete().eq('user_id', userId)
    await supabase.from('income_streams').delete().eq('user_id', userId)
    await supabase.from('oauth_tokens').delete().eq('user_id', userId)
    await supabase.from('experiments').delete().eq('user_id', userId)
    await supabase.from('utm_events').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)

    // Sign the user out first
    await supabase.auth.signOut()

    // Delete the auth user using service-role admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await adminClient.auth.admin.deleteUser(userId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
  }
}
