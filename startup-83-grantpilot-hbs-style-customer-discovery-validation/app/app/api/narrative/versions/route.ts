import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const narrativeId = url.searchParams.get('narrative_id')
    if (!narrativeId) return NextResponse.json({ error: 'narrative_id required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: versions } = await admin
      .from('narrative_versions')
      .select('id, version, word_count, change_type, change_summary, created_at, content_md')
      .eq('narrative_id', narrativeId)
      .order('version', { ascending: false })
      .limit(20)

    return NextResponse.json({ versions: versions || [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
