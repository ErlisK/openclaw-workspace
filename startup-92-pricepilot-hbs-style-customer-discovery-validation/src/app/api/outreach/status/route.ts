/**
 * GET /api/outreach/status
 * Returns pipeline status: counts by status, recent activity, top categories.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const supabase = getSupabaseAdmin()

  const { data: all } = await supabase
    .from('outreach_targets')
    .select('id, site_name, site_url, contact_email, category, status, sent_at, replied_at, email_subject, suggested_guide, suggested_url')
    .order('created_at', { ascending: false })

  if (!all) return NextResponse.json({ error: 'Could not fetch data' }, { status: 500 })

  const counts: Record<string, number> = {}
  const categories: Record<string, number> = {}
  for (const row of all) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
    categories[row.category] = (categories[row.category] ?? 0) + 1
  }

  const recent = all
    .filter(r => r.sent_at)
    .sort((a, b) => (b.sent_at ?? '').localeCompare(a.sent_at ?? ''))
    .slice(0, 5)

  return NextResponse.json({
    total: all.length,
    by_status: counts,
    by_category: categories,
    recent_sent: recent,
    targets: all,
  })
}
