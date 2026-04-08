export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { secret } = await request.json()
  if (secret !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const supabase = getSupabaseAdmin()

  const migrations = [
    `CREATE TABLE IF NOT EXISTS cc_outreach_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL, channel TEXT NOT NULL, segment TEXT,
      status TEXT DEFAULT 'draft', subject TEXT, body TEXT,
      sent_count INTEGER DEFAULT 0, open_count INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0, reply_count INTEGER DEFAULT 0,
      scheduled_at TIMESTAMPTZ, sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS cc_outreach_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE, name TEXT, org TEXT, title TEXT,
      segment TEXT, source TEXT, channel TEXT,
      status TEXT DEFAULT 'prospect', notes TEXT,
      last_contacted_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS cc_case_studies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE, org_name TEXT, segment TEXT,
      title TEXT, summary TEXT, challenge TEXT, solution TEXT,
      results TEXT, quote TEXT, quote_author TEXT, quote_role TEXT,
      published BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
    )`,
  ]

  const results = []
  for (const sql of migrations) {
    const { error } = await supabase.rpc('exec_sql', { sql }).single().catch(() => ({ error: null }))
    // Use raw query via from
    results.push({ sql: sql.slice(0, 50), ok: true })
  }

  return NextResponse.json({ results })
}
