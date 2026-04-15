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
  const { title, url, tier = 'quick', instructions = '', project_id } = body

  if (!url || !title) {
    return NextResponse.json({ error: 'title and url are required' }, { status: 400 })
  }

  const PRICE = { quick: 500, standard: 1000, deep: 1500 }
  const price_cents = PRICE[tier as keyof typeof PRICE] ?? 500

  const { data, error } = await supabase
    .from('test_jobs')
    .insert({
      client_id: user.id,
      title,
      url,
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
  return NextResponse.json({ job: data }, { status: 201 })
}
