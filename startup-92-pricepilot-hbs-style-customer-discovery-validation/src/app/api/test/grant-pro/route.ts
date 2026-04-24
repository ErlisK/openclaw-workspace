/**
 * POST /api/test/grant-pro
 * Test-mode only: grant or revoke Pro for the authenticated user.
 * Requires ALLOW_TEST_GRANTS=true in environment.
 * Body: { action: "grant" | "revoke" }
 * Returns: { plan, changed }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase'

export async function POST(request: Request) {
  // Only available in test mode
  if (process.env.ALLOW_TEST_GRANTS !== 'true') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const userSupabase = await createUserClient()
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const action = body.action as 'grant' | 'revoke' | undefined
  if (!action || !['grant', 'revoke'].includes(action)) {
    return NextResponse.json({ error: 'action must be "grant" or "revoke"' }, { status: 400 })
  }

  // Use service-role to bypass RLS for direct write
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const plan = action === 'grant' ? 'pro' : 'free'
  const { error: upsertErr } = await adminSupabase
    .from('entitlements')
    .upsert({
      user_id: user.id,
      plan,
      stripe_subscription_id: action === 'grant' ? 'test_sub_e2e' : null,
      plan_expires_at: action === 'grant' ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
      experiments_limit: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({ plan, changed: true, user_id: user.id })
}
