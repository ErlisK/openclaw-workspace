import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabase
    .from('projects')
    .select('*, test_jobs(count)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data })
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { name, description, url } = body
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .insert({ owner_id: user.id, name, description: description ?? null, url: url ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data }, { status: 201 })
}
