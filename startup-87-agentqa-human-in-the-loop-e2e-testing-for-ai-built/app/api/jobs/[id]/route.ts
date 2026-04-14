import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabase
    .from('test_jobs')
    .select('*, feedback(*), job_assignments(*)')
    .eq('id', id)
    .eq('client_id', user.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ job: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { title, url, tier, instructions, status, project_id } = body

  const PRICE = { quick: 500, standard: 1000, deep: 1500 }
  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (url !== undefined) updates.url = url
  if (tier !== undefined) { updates.tier = tier; updates.price_cents = PRICE[tier as keyof typeof PRICE] }
  if (instructions !== undefined) updates.instructions = instructions
  if (status !== undefined) updates.status = status
  if (project_id !== undefined) updates.project_id = project_id
  if (status === 'published') updates.published_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('test_jobs')
    .update(updates)
    .eq('id', id)
    .eq('client_id', user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ job: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Only allow deleting draft jobs
  const { data: job } = await supabase
    .from('test_jobs')
    .select('status')
    .eq('id', id)
    .eq('client_id', user.id)
    .single()
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.status !== 'draft') return NextResponse.json({ error: 'Only draft jobs can be deleted' }, { status: 400 })

  const { error } = await supabase.from('test_jobs').delete().eq('id', id).eq('client_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
