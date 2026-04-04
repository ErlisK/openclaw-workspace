/**
 * Admin CRUD for feature_flags table
 *
 * GET  /api/admin/flags          — list all flags with resolved values
 * PATCH /api/admin/flags         — update one or more flag values
 *   body: { key: string, value: string, updatedBy?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { invalidateFlagCache, getRawFlags } from '@/lib/flags'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET() {
  try {
    const rows = await getRawFlags()
    return NextResponse.json({ ok: true, flags: rows })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { key: string; value: string; updatedBy?: string }
    const { key, value, updatedBy } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value required' }, { status: 400 })
    }
    if (!/^FLAG_[A-Z_]+$/.test(key)) {
      return NextResponse.json({ error: 'invalid key format' }, { status: 400 })
    }

    const client = sb()
    const { error } = await client
      .from('feature_flags')
      .update({
        value: String(value),
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || 'admin-ui',
      })
      .eq('key', key)

    if (error) throw error

    // Invalidate server-side cache immediately
    invalidateFlagCache()

    // Log the change as an event
    await client.from('events').insert({
      event_name: 'flag_changed',
      properties: { key, value, updated_by: updatedBy || 'admin-ui', _ts: Date.now() },
    })

    return NextResponse.json({ ok: true, key, value })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
