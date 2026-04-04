import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/v1/free-pack
 * Tracks a free pack download, increments download_count, optionally captures email.
 * Body: { packId, email? }
 */
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  let body: { packId?: string; email?: string }
  try { body = await req.json() as typeof body }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { packId, email } = body
  if (!packId) return NextResponse.json({ error: 'packId required' }, { status: 400 })

  const sb  = admin()
  const now = new Date().toISOString()

  // Increment download counter
  const { data: pack } = await sb.from('free_packs').select('download_count').eq('id', packId).single()
  const count = ((pack as { download_count?: number } | null)?.download_count ?? 0) + 1
  await sb.from('free_packs').update({ download_count: count }).eq('id', packId)

  // Log download with optional email
  await sb.from('free_pack_downloads').insert({
    pack_id:    packId,
    email:      email ?? null,
    created_at: now,
  })

  // If email provided, log as a potential lead
  if (email) {
    await sb.from('events').insert({
      event_name: 'free_pack_email_capture',
      properties: { pack_id: packId, email },
    })
  }

  return NextResponse.json({ ok: true })
}

/**
 * GET /api/v1/free-pack
 * Returns current week's pack info (for client-side polling)
 */
export async function GET() {
  const sb = admin()
  const { data } = await sb
    .from('free_packs')
    .select('id, week_key, theme, title, description, page_urls, download_count, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return NextResponse.json({ pack: null })
  return NextResponse.json({ pack: data })
}
