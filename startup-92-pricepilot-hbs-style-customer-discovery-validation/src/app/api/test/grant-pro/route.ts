/**
 * POST /api/test/grant-pro
 * Test-mode only: grant or revoke Pro for the authenticated user.
 * Requires ALLOW_TEST_GRANTS=true in environment.
 * Body: { action: "grant" | "revoke" }
 * Returns: { plan, changed }
 */
import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  if (process.env.ALLOW_TEST_GRANTS !== 'true') {
    return NextResponse.json({ error: 'Not available — ALLOW_TEST_GRANTS not set' }, { status: 403 })
  }

  const userSupabase = await createUserClient()
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const action = body.action as 'grant' | 'revoke' | undefined
  if (!action || !['grant', 'revoke'].includes(action)) {
    return NextResponse.json({ error: 'action must be "grant" or "revoke"' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const isPro = action === 'grant'
  const plan = isPro ? 'pro' : 'free'

  const upsertData = isPro ? {
    user_id: user.id,
    plan,
    stripe_subscription_id: 'test_sub_e2e',
    plan_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    experiments_limit: null,
    // Pro feature flags
    ai_suggestions_enabled: true,
    email_templates_enabled: true,
    audit_log_enabled: true,
    api_access_enabled: true,
    stripe_connect_enabled: true,
    max_active_experiments: null,
    updated_at: new Date().toISOString(),
  } : {
    user_id: user.id,
    plan,
    stripe_subscription_id: null,
    plan_expires_at: null,
    experiments_limit: 3,
    ai_suggestions_enabled: false,
    email_templates_enabled: false,
    audit_log_enabled: false,
    api_access_enabled: false,
    max_active_experiments: 3,
    updated_at: new Date().toISOString(),
  }

  const { error: upsertErr } = await adminSupabase
    .from('entitlements')
    .upsert(upsertData, { onConflict: 'user_id' })

  if (upsertErr) {
    console.error('[test/grant-pro]', upsertErr)
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ plan, changed: true, user_id: user.id })
}
