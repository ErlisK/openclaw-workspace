import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const admin = createAdminClient()
  const url = new URL(req.url)
  const funder = url.searchParams.get('funder') || ''
  const sectionKey = url.searchParams.get('section_key') || ''
  const funderType = url.searchParams.get('funder_type') || ''

  let query = admin.from('templates').select('*').eq('is_public', true)
  if (funderType) query = query.eq('funder_type', funderType)
  if (funder) query = query.ilike('funder_name', `%${funder}%`)
  if (sectionKey) query = query.eq('section_key', sectionKey)

  const { data } = await query.order('use_count', { ascending: false }).limit(50)
  return NextResponse.json({ templates: data || [] })
}
