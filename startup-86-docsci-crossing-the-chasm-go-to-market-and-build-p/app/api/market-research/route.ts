import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: check is_admin flag for user
  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'all'
  const search = url.searchParams.get('q') || ''
  const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 200)
  const supabase = createClient()

  let query = supabase
    .from('market_research')
    .select('id,research_type,title,content,tags,source,priority,created_at')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type !== 'all') query = query.eq('research_type', type)
  if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Query failed' }, { status: 400 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: check is_admin flag for user
  const supabase = createClient()
  const body = await req.json()
  const { research_type, title, content, tags, source, priority } = body

  if (!research_type || !title) {
    return NextResponse.json({ error: 'research_type and title are required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('market_research').insert({
    research_type,
    title,
    content,
    tags: Array.isArray(tags) ? tags : [],
    source: source || '',
    priority: typeof priority === 'number' ? priority : 5,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ record: data }, { status: 201 })
}
