import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EXPECTED_TABLES = [
  'users', 'projects', 'test_jobs', 'job_assignments',
  'test_sessions', 'session_events', 'feedback', 'feedback_bugs',
  'credit_transactions', 'stripe_customers', 'stripe_events', 'platform_feedback',
  'orders', 'payouts', 'tester_profile',
]

export async function GET() {
  const supabase = await createClient()

  let db_status = 'connected'
  try {
    await supabase.rpc('version').maybeSingle()
  } catch {
    db_status = 'error'
  }

  return NextResponse.json({
    status: 'ok',
    service: 'agentqa',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    db_status,
    schema_tables: EXPECTED_TABLES,
    schema_table_count: EXPECTED_TABLES.length,
  })
}
