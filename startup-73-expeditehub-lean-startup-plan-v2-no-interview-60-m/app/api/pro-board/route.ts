import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/pro-board — list submitted projects for pros
export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { searchParams } = req.nextUrl
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, address, zip, city, state,
      proposed_adu_type, proposed_adu_sqft,
      zoning, lot_size_sqft, year_built, existing_sqft,
      has_plans, plans_ready, timeline,
      packet_status, autofill_score,
      status, created_at,
      file_urls
    `)
    .in('status', ['submitted', 'quoted'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const projects = data ?? []

  // Fire-and-forget: auto-generate packets for any project that doesn't have one yet
  const needsPacket = projects.filter(p => p.packet_status === 'pending')
  if (needsPacket.length > 0) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://startup-73-expeditehub-lean-startup.vercel.app'
    needsPacket.forEach(p => {
      fetch(`${baseUrl}/api/projects/${p.id}/packet`, { method: 'POST' }).catch(() => {})
    })
  }

  return NextResponse.json({ projects, total: projects.length })
}
