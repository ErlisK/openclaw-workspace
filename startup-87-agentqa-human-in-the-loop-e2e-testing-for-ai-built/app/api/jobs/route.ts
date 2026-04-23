import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { captureServerEvent } from '@/lib/analytics/events'

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabase
    .from('test_jobs')
    .select('*')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  // Accept flow_description as an alias for instructions (used by the submit form)
  const rawInstructions = body.instructions ?? body.flow_description ?? ''
  const { url, tier = 'quick', project_id } = body
  // Auto-derive title from URL hostname when not provided
  let title: string = body.title ?? ''
  if (!title && url) {
    try { title = new URL(url).hostname.replace(/^www\./, '') } catch { /* will fail validation below */ }
  }
  const instructions: string = typeof rawInstructions === 'string' ? rawInstructions : ''

  if (!url || !title) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Input length limits
  if (typeof title !== 'string' || title.length > 255) {
    return NextResponse.json({ error: 'title must be ≤255 characters' }, { status: 400 })
  }
  if (typeof instructions === 'string' && instructions.length > 5000) {
    return NextResponse.json({ error: 'instructions must be ≤5000 characters' }, { status: 400 })
  }
  if (typeof url !== 'string' || url.length > 2000) {
    return NextResponse.json({ error: 'url must be ≤2000 characters' }, { status: 400 })
  }

  // URL validation — only http/https allowed; block javascript:, data:, file:, etc.
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: `Disallowed URL scheme: ${parsedUrl.protocol}` }, { status: 400 })
  }
  const normalizedUrl = parsedUrl.toString()

  const PRICE = { quick: 500, standard: 1000, deep: 1500 }
  const price_cents = PRICE[tier as keyof typeof PRICE] ?? 500

  const { data, error } = await supabase
    .from('test_jobs')
    .insert({
      client_id: user.id,
      title,
      url: normalizedUrl,
      tier,
      price_cents,
      instructions,
      project_id: project_id ?? null,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Track job draft creation
  captureServerEvent('create_job_draft', user.id, { job_id: data.id, tier: data.tier, title: data.title }).catch(() => {})
  return NextResponse.json({ job: data, job_id: data.id }, { status: 201 })
}
