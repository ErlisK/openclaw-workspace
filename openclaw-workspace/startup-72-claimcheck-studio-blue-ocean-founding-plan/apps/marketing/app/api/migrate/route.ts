export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Run DDL via Supabase service role using pg_catalog queries
// Supabase JS client doesn't support arbitrary DDL, so we use the REST API directly
async function runSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Supabase exposes pg-meta at /pg/query for service role
  const res = await fetch(`${sbUrl}/pg/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${svcKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (res.ok) return { ok: true }
  const body = await res.text()
  return { ok: false, error: body.slice(0, 100) }
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS cc_discovery_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_name TEXT NOT NULL,
    prospect_email TEXT,
    org TEXT,
    title TEXT,
    segment TEXT,
    stage TEXT DEFAULT 'scheduled',
    call_date TIMESTAMPTZ,
    duration_min INTEGER,
    notes TEXT,
    next_steps TEXT,
    willingness_to_pay TEXT,
    mou_signed BOOLEAN DEFAULT false,
    converted_to_pilot_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS cc_pilot_mous (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    segment TEXT,
    pilot_tier TEXT,
    monthly_value INTEGER NOT NULL,
    duration_months INTEGER DEFAULT 3,
    start_date DATE,
    end_date DATE,
    signed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft',
    mou_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS cc_security_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name TEXT NOT NULL,
    contact_email TEXT,
    questionnaire_type TEXT DEFAULT 'standard',
    submitted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    data_residency TEXT DEFAULT 'us-east-1',
    encryption_at_rest BOOLEAN DEFAULT true,
    encryption_in_transit BOOLEAN DEFAULT true,
    soc2_status TEXT DEFAULT 'in_progress',
    hipaa_baa_available BOOLEAN DEFAULT false,
    data_retention_days INTEGER DEFAULT 90,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS cc_funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT,
    session_id TEXT,
    user_id TEXT,
    event TEXT NOT NULL,
    page TEXT,
    source TEXT,
    medium TEXT,
    campaign TEXT,
    segment TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_funnel_events_event ON cc_funnel_events(event)`,
  `CREATE INDEX IF NOT EXISTS idx_funnel_events_visitor ON cc_funnel_events(visitor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_funnel_events_created ON cc_funnel_events(created_at DESC)`,
  `INSERT INTO cc_schema_migrations(version,description) VALUES ('012','sales motion — discovery_calls, pilot_mous, security_questionnaires, funnel_events') ON CONFLICT DO NOTHING`,
]

export async function POST(request: NextRequest) {
  const { secret } = await request.json().catch(() => ({}))
  if (secret !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const results = []
  for (const sql of MIGRATIONS) {
    const r = await runSQL(sql)
    results.push({ sql: sql.slice(0, 60).replace(/\n/g, ' '), ...r })
  }

  const failed = results.filter(r => !r.ok)
  return NextResponse.json({
    ok: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results,
  })
}
