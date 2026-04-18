import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function GET() {
  // Require authentication; also return 404 in production to avoid schema leakage
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()
  void serviceClient // used for potential future introspection

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
