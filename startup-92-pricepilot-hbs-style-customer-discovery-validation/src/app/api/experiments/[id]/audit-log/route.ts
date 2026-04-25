/**
 * GET /api/experiments/[id]/audit-log
 * Returns the audit trail for a specific experiment (auth-required, user-scoped).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: experimentId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('audit_log')
    .select('id, action, old_value, new_value, occurred_at')
    .eq('user_id', user.id)
    .eq('entity_type', 'experiment')
    .eq('entity_id', experimentId)
    .order('occurred_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ experiment_id: experimentId, entries: data ?? [] })
}
