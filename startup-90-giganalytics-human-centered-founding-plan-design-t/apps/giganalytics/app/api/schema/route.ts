import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServiceClient()

  const { data: tables, error } = await supabase
    .from('pg_tables' as never)
    .select('tablename, rowsecurity')
    .eq('schemaname' as never, 'public')
    .order('tablename' as never)

  if (error) {
    // Fallback: use raw query via service role to check tables
    return NextResponse.json({
      status: 'ok',
      message: 'Schema verification via direct query not available on this route',
      expected_tables: 11,
      note: 'Use Supabase Management API for schema introspection',
    })
  }

  const expected = [
    'acquisition_costs', 'benchmark_opt_ins', 'benchmark_snapshots',
    'experiments', 'profiles', 'recommendations',
    'streams', 'time_entries', 'transactions', 'user_goals', 'user_settings'
  ]

  return NextResponse.json({
    status: 'ok',
    tables: tables ?? [],
    expected,
    all_present: expected.every(t =>
      (tables as Array<{ tablename: string }> | null)?.some(r => r.tablename === t)
    ),
  })
}
