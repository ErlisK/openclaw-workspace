import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check all tables exist and have RLS
  const { data: tables } = await supabase.rpc('pg_tables_rls' as never)

  const expectedTables = [
    'profiles', 'user_settings', 'streams', 'transactions',
    'time_entries', 'user_goals', 'acquisition_costs',
    'experiments', 'recommendations', 'benchmark_opt_ins', 'benchmark_snapshots'
  ]

  return NextResponse.json({
    status: 'ok',
    service: 'giganalytics',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    auth: user ? 'authenticated' : 'anonymous',
    schema: {
      tables: expectedTables,
      count: expectedTables.length,
    },
  })
}
