import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * /api/v1/profile — Parent profile management
 *
 * GET   /api/v1/profile  — fetch own profile + children count + session count
 * PATCH /api/v1/profile  — update display name, COPPA consent
 * POST  /api/v1/profile  — upsert profile (called after magic-link signup)
 */

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list: {name: string; value: string; options?: Record<string,unknown>}[]) { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])) },
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()

  // Profile
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (pErr && pErr.code !== 'PGRST116') {
    return NextResponse.json({ error: pErr.message }, { status: 500 })
  }

  // Children count
  const { count: childCount } = await sb
    .from('children')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', user.id)
    .is('deleted_at', null)

  // Session count
  const { count: sessionCount } = await sb
    .from('trial_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Exported books
  const { count: exportCount } = await sb
    .from('trial_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('exported_at', 'is', null)

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: profile ?? null,
    stats: {
      childCount: childCount ?? 0,
      sessionCount: sessionCount ?? 0,
      exportCount: exportCount ?? 0,
    },
  })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    displayName?: string
    coppaAgreed?: boolean
    sessionId?: string   // trial session to link
  }

  const sb = admin()

  // Upsert profile
  const profileData: Record<string, unknown> = {
    id: user.id,
    updated_at: new Date().toISOString(),
  }
  if (body.displayName) {
    profileData.display_name = body.displayName.trim().slice(0, 48)
  }
  if (body.coppaAgreed === true) {
    profileData.coppa_agreed = true
    profileData.coppa_agreed_at = new Date().toISOString()
  }

  const { data: profile, error: upsertErr } = await sb
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })
    .select()
    .single()

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  // Optionally link a trial session to this user
  if (body.sessionId) {
    await sb
      .from('trial_sessions')
      .update({ user_id: user.id })
      .eq('id', body.sessionId)
      .is('user_id', null)
  }

  return NextResponse.json({ ok: true, profile })
}

export async function PATCH(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    displayName?: string
    coppaAgreed?: boolean
  }

  const sb = admin()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.displayName !== undefined) {
    updates.display_name = body.displayName.trim().slice(0, 48)
  }
  if (body.coppaAgreed === true) {
    updates.coppa_agreed = true
    updates.coppa_agreed_at = new Date().toISOString()
  }

  const { data: profile, error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, profile })
}
