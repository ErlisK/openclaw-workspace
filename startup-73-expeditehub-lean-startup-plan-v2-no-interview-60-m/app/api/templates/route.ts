import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/templates?jurisdiction=Austin,TX&form_type=ADU_BP001
export async function GET(req: NextRequest) {
  const db = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const jurisdiction = searchParams.get('jurisdiction') || 'Austin, TX'
  const form_type = searchParams.get('form_type') || 'ADU_BP001'
  const version = searchParams.get('version')

  let query = db
    .from('form_templates')
    .select('*')
    .eq('jurisdiction', jurisdiction)
    .eq('form_type', form_type)
    .eq('is_active', true)
    .order('version', { ascending: false })

  if (version) query = query.eq('version', parseInt(version))

  const { data, error } = await query.limit(1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// POST /api/templates — save updated template (admin only)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()
  const body = await req.json()
  const { id, fields, autofill_rules, notes, zoning_context, accuracy_score } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await db
    .from('form_templates')
    .update({ fields, autofill_rules, notes, zoning_context, accuracy_score, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
