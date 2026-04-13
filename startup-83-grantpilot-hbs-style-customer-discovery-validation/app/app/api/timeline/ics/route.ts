import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateICS } from '@/lib/timeline-engine'
import type { Milestone } from '@/lib/timeline-engine'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const application_id = req.nextUrl.searchParams.get('application_id')
  if (!application_id) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

  const admin = createAdminClient()

  const [milestonesRes, appRes] = await Promise.all([
    admin.from('timeline_milestones').select('*').eq('application_id', application_id).order('sort_order'),
    admin.from('grant_applications').select('title, funder_name, deadline').eq('id', application_id).single(),
  ])

  const milestones = (milestonesRes.data || []) as Milestone[]
  const app = appRes.data
  const title = app?.title || 'Grant Application'

  const icsContent = generateICS(milestones, title)

  const safeName = title.replace(/[^a-zA-Z0-9-_ ]/g, '_').slice(0, 40)
  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}-timeline.ics"`,
    },
  })
}
