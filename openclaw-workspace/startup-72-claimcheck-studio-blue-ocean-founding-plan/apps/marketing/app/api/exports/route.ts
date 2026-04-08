import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET: export templates
export async function GET(_req: NextRequest) {
  const db = sb()
  const { data } = await db.from('cc_export_templates').select('*').eq('active', true).order('target_system')
  return NextResponse.json({ templates: data || [] })
}

// POST: create export job
export async function POST(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { org_id, session_id, target_cms, export_format, compliance_pack } = body

  if (!target_cms || !export_format) {
    return NextResponse.json({ error: 'target_cms and export_format required' }, { status: 400 })
  }

  const { data, error } = await db.from('cc_cms_export_jobs').insert({
    org_id, session_id, target_cms, export_format, compliance_pack,
    status: 'pending',
  }).select('id,status,created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
