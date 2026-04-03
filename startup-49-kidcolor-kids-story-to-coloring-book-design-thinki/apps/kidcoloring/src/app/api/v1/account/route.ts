import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// POST /api/v1/account — link a trial session to the authenticated user
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json() as { sessionId: string }
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    // Get the auth token from the Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    // Verify token with Supabase
    const sbAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: { user }, error: authErr } = await sbAnon.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // Link session to user (service role)
    const sbAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { error: updateErr } = await sbAdmin
      .from('trial_sessions')
      .update({ user_id: user.id })
      .eq('id', sessionId)

    if (updateErr) throw updateErr

    // Upsert profile
    await sbAdmin.from('profiles').upsert({
      id: user.id,
      email: user.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET /api/v1/account — fetch all books for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const sbAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: { user }, error: authErr } = await sbAnon.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const sbAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: sessions, error } = await sbAdmin
      .from('trial_sessions')
      .select(`
        id, concept, status, page_count, share_slug, preview_image_url,
        config, created_at, exported_at,
        trial_pages(id, image_url, sort_order, status)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ user: { id: user.id, email: user.email }, sessions: sessions || [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
