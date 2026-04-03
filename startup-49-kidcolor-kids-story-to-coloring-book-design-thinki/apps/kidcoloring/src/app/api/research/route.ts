import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function supabaseQuery(path: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options?.headers,
    },
  })
  return res
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table') || 'research_snippets'
  const theme = searchParams.get('theme')
  const sentiment = searchParams.get('sentiment')
  const limit = searchParams.get('limit') || '50'
  const offset = searchParams.get('offset') || '0'

  let path = `/${table}?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`
  if (theme) path += `&theme_tags=cs.{${theme}}`
  if (sentiment) path += `&sentiment=eq.${sentiment}`

  const res = await supabaseQuery(path, {
    headers: { 'Prefer': 'count=exact', 'Range': `${offset}-${parseInt(offset) + parseInt(limit) - 1}` }
  })

  const data = await res.json()
  const total = res.headers.get('Content-Range')?.split('/')[1] || '0'

  return NextResponse.json({ data, total: parseInt(total) })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { table, record } = body

  const res = await supabaseQuery(`/${table}`, {
    method: 'POST',
    body: JSON.stringify(record),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table') || 'research_snippets'
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const res = await supabaseQuery(`/${table}?id=eq.${id}`, { method: 'DELETE' })
  return NextResponse.json({ success: res.ok }, { status: res.status })
}
