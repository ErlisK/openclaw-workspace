import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(_req: NextRequest) {
  const db = sb()

  const [
    { data: controls },
    { data: dpias },
    { data: rlsAudit },
    { data: secrets },
    { data: dataInventory },
  ] = await Promise.all([
    db.from('cc_soc2_controls').select('*').order('control_id'),
    db.from('cc_dpia_records').select('*').order('created_at'),
    db.from('cc_rls_audit').select('table_name,rls_enabled,policy_count,notes').order('table_name').limit(80),
    db.from('cc_secrets_log').select('secret_name,environment,rotated_at,next_rotation,status').order('rotated_at', { ascending: false }),
    db.from('cc_data_inventory').select('*').order('sensitivity', { ascending: false }),
  ])

  // SOC 2 summary by category
  const byCategory: Record<string, { total: number; evidenced: number; implemented: number; inProgress: number }> = {}
  const statusCounts = { evidenced: 0, implemented: 0, in_progress: 0, not_started: 0 }
  controls?.forEach(c => {
    if (!byCategory[c.category]) byCategory[c.category] = { total: 0, evidenced: 0, implemented: 0, inProgress: 0 }
    byCategory[c.category].total++
    if (c.status === 'evidenced') { byCategory[c.category].evidenced++; statusCounts.evidenced++ }
    else if (c.status === 'implemented') { byCategory[c.category].implemented++; statusCounts.implemented++ }
    else if (c.status === 'in_progress') { byCategory[c.category].inProgress++; statusCounts.in_progress++ }
    else statusCounts.not_started++
  })

  const totalControls = controls?.length || 0
  const readyControls = statusCounts.evidenced + statusCounts.implemented
  const readinessPct = totalControls > 0 ? Math.round((readyControls / totalControls) * 100) : 0

  const rlsEnabled = rlsAudit?.filter(r => r.rls_enabled).length || 0
  const rlsTotal = rlsAudit?.length || 0

  const highSensitivity = dataInventory?.filter(d => d.sensitivity === 'high' || d.sensitivity === 'critical') || []
  const piiTables = dataInventory?.filter(d => d.contains_pii) || []
  const rotationDue = secrets?.filter(s => s.next_rotation && new Date(s.next_rotation) <= new Date(Date.now() + 30 * 86400000)) || []

  return NextResponse.json({
    soc2: {
      controls: controls || [],
      byCategory,
      statusCounts,
      totalControls,
      readyControls,
      readinessPct,
      type1TargetDate: '2026-09-30',
    },
    dpia: { records: dpias || [], approved: dpias?.filter(d => d.status === 'approved').length || 0 },
    rls: { audit: rlsAudit || [], enabled: rlsEnabled, total: rlsTotal, pct: Math.round((rlsEnabled / (rlsTotal || 1)) * 100) },
    secrets: { log: secrets || [], rotationDue: rotationDue.length },
    dataInventory: {
      tables: dataInventory || [],
      highSensitivity: highSensitivity.length,
      piiTables: piiTables.length,
      total: dataInventory?.length || 0,
    },
  })
}
