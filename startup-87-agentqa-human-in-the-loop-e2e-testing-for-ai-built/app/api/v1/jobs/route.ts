/**
 * Agent API v1 — /api/v1/jobs
 *
 * Auth: Authorization: Bearer aqk_<key>
 *
 * GET  /api/v1/jobs           — list jobs submitted by this API key's owner
 * POST /api/v1/jobs           — create (and optionally auto-submit) a test job
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/agent-auth'
import { createClient } from '@/lib/supabase/server'

const PRICE: Record<string, number> = { quick: 500, standard: 1000, deep: 1500 }

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized — provide a valid API key' }, { status: 401 })

  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const { data, error, count } = await supabase
    .from('test_jobs')
    .select('*', { count: 'exact' })
    .eq('client_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    jobs: data,
    pagination: { total: count, limit, offset },
  })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized — provide a valid API key' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    title,
    url,
    tier = 'quick',
    instructions = '',
    project_id,
    auto_submit = false,
    webhook_url,
  } = body as {
    title?: string
    url?: string
    tier?: string
    instructions?: string
    project_id?: string
    auto_submit?: boolean
    webhook_url?: string
  }

  if (!title || !url) {
    return NextResponse.json({ error: 'title and url are required' }, { status: 400 })
  }
  if (typeof title !== 'string' || title.length > 255) {
    return NextResponse.json({ error: 'title must be a string ≤255 chars' }, { status: 400 })
  }
  if (typeof instructions === 'string' && instructions.length > 5000) {
    return NextResponse.json({ error: 'instructions must be ≤5000 chars' }, { status: 400 })
  }
  if (!['quick', 'standard', 'deep'].includes(tier as string)) {
    return NextResponse.json({ error: 'tier must be quick | standard | deep' }, { status: 400 })
  }

  // Validate webhook_url if provided — must be HTTPS
  if (webhook_url !== undefined) {
    let parsedWebhook: URL
    try {
      parsedWebhook = new URL(webhook_url as string)
    } catch {
      return NextResponse.json({ error: 'Invalid webhook_url' }, { status: 400 })
    }
    if (parsedWebhook.protocol !== 'https:') {
      return NextResponse.json({ error: 'webhook_url must use HTTPS' }, { status: 400 })
    }
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url as string)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: `Disallowed URL scheme: ${parsedUrl.protocol}` }, { status: 400 })
  }

  const price_cents = PRICE[tier as string] ?? 500
  const status = auto_submit ? 'pending' : 'draft'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('test_jobs')
    .insert({
      client_id: auth.userId,
      title,
      url: parsedUrl.toString(),
      tier,
      price_cents,
      instructions,
      project_id: project_id ?? null,
      status,
      webhook_url: webhook_url ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ job: data }, { status: 201 })
}
