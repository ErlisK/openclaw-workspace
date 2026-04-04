import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * /api/v1/children — CRUD for child profiles (parent-owned accounts)
 *
 * GET    /api/v1/children              — list parent's children
 * POST   /api/v1/children              — create child profile
 * PATCH  /api/v1/children?id=:id       — update child profile
 * DELETE /api/v1/children?id=:id       — soft-delete child profile
 *
 * COPPA compliance:
 *   - Only authenticated parents can manage children
 *   - No child-identifiable email or login credentials stored
 *   - Children are referenced by nickname + age range only
 *   - parent_id is auth.uid() from JWT — never from request body
 */

// Build server supabase client (respects auth cookie)
async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list: {name: string; value: string; options?: Record<string,unknown>}[]) { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])) },
      },
    }
  )
}

// Service-role client (bypasses RLS — used only after user is verified)
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Verify caller and return their user ID
async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const supabase = await getServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Also verify COPPA consent before allowing child management
  const { data: profile } = await adminClient()
    .from('profiles')
    .select('coppa_agreed')
    .eq('id', user.id)
    .single()
  if (!profile?.coppa_agreed) {
    return NextResponse.json({ error: 'coppa_required', message: 'You must agree to COPPA terms before managing child profiles.' }, { status: 403 })
  }
  return { userId: user.id }
}

// ── GET /api/v1/children ──────────────────────────────────────────────────────
export async function GET() {
  const supabase = await getServerSupabase()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: children, error } = await adminClient()
    .from('children')
    .select('id, nickname, age_years, interests, created_at')
    .eq('parent_id', user.id)
    .is('deleted_at', null)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ children: children ?? [] })
}

// ── POST /api/v1/children ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const body = await req.json().catch(() => ({})) as {
    nickname?: string
    ageYears?: number
    interests?: string[]
  }

  // Validate
  const nickname = (body.nickname ?? '').trim().slice(0, 24).replace(/[^a-zA-Z0-9\s\-']/g, '')
  if (!nickname) return NextResponse.json({ error: 'nickname required' }, { status: 400 })

  const ageYears = Math.max(2, Math.min(18, Math.round(Number(body.ageYears) || 6)))
  const interests = (body.interests ?? []).slice(0, 8).map(i => String(i).slice(0, 32))

  // Limit: max 5 children per parent (abuse prevention)
  const { count } = await adminClient()
    .from('children')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', userId)
    .is('deleted_at', null)
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'max_children', message: 'Maximum 5 children per account.' }, { status: 400 })
  }

  const { data: child, error } = await adminClient()
    .from('children')
    .insert({ parent_id: userId, nickname, age_years: ageYears, interests })
    .select('id, nickname, age_years, interests, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ child }, { status: 201 })
}

// ── PATCH /api/v1/children?id=:id ────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const childId = req.nextUrl.searchParams.get('id')
  if (!childId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Verify ownership before update
  const { data: existing } = await adminClient()
    .from('children').select('id').eq('id', childId).eq('parent_id', userId).single()
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({})) as {
    nickname?: string; ageYears?: number; interests?: string[]
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.nickname) updates.nickname = body.nickname.trim().slice(0, 24).replace(/[^a-zA-Z0-9\s\-']/g, '')
  if (body.ageYears) updates.age_years = Math.max(2, Math.min(18, Math.round(Number(body.ageYears))))
  if (body.interests) updates.interests = body.interests.slice(0, 8)

  const { data: child, error } = await adminClient()
    .from('children').update(updates).eq('id', childId).select('id, nickname, age_years, interests').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ child })
}

// ── DELETE /api/v1/children?id=:id ───────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const childId = req.nextUrl.searchParams.get('id')
  if (!childId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Soft-delete only (GDPR / COPPA right-to-erasure handled separately)
  const { error } = await adminClient()
    .from('children')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', childId)
    .eq('parent_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
