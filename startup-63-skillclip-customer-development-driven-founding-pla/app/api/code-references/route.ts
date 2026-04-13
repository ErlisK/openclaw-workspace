import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const regionId = searchParams.get('region_id')
  const tradeId = searchParams.get('trade_id')

  let query = supabase
    .from('code_references')
    .select(`
      id, code_standard, section, title, description, skill_tags, severity,
      region:regions(id, name, region_code, code_standard),
      trade:trades(id, name, slug)
    `)
    .eq('active', true)
    .order('code_standard')
    .order('section')

  if (regionId) query = query.eq('region_id', regionId)
  if (tradeId) query = query.eq('trade_id', tradeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
