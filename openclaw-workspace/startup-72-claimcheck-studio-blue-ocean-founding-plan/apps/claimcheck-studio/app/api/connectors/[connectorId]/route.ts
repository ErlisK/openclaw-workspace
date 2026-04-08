import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { testConnector, type ConnectorConfig, type ConnectorType } from '@/lib/access-layer'

/**
 * GET    /api/connectors/[connectorId]  — get connector details
 * PATCH  /api/connectors/[connectorId]  — update connector
 * DELETE /api/connectors/[connectorId]  — disable connector
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  const { connectorId } = await params
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('cc_connectors')
    .select('id, connector_type, display_name, enabled, priority, auth_type, status, last_error, last_success_at, total_requests, error_rate, metadata_only, allowed_storage, license_type, created_at')
    .eq('id', connectorId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch recent access audit stats for this connector
  const { data: stats } = await supabase
    .from('cc_access_audit')
    .select('access_type, access_granted, created_at')
    .eq('connector_id', connectorId)
    .order('created_at', { ascending: false })
    .limit(100)

  const successRate = stats?.length
    ? stats.filter(s => s.access_granted).length / stats.length
    : null

  return NextResponse.json({ connector: data, recentStats: { total: stats?.length || 0, successRate } })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  const { connectorId } = await params
  const body = await request.json() as {
    enabled?: boolean
    priority?: number
    displayName?: string
    config?: Record<string, unknown>
    metadataOnly?: boolean
    allowedStorage?: boolean
    licenseType?: string
  }

  const supabase = getSupabaseAdmin()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.enabled !== undefined) update.enabled = body.enabled
  if (body.priority !== undefined) update.priority = body.priority
  if (body.displayName) update.display_name = body.displayName
  if (body.config) update.config = body.config
  if (body.metadataOnly !== undefined) update.metadata_only = body.metadataOnly
  if (body.allowedStorage !== undefined) update.allowed_storage = body.allowedStorage
  if (body.licenseType) update.license_type = body.licenseType

  const { data, error } = await supabase
    .from('cc_connectors')
    .update(update)
    .eq('id', connectorId)
    .select('id, connector_type, display_name, enabled, priority, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connector: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  const { connectorId } = await params
  const supabase = getSupabaseAdmin()

  await supabase
    .from('cc_connectors')
    .update({ enabled: false, status: 'disabled' })
    .eq('id', connectorId)

  return NextResponse.json({ disabled: true })
}
