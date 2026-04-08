import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { testConnector, type ConnectorConfig, type ConnectorType } from '@/lib/access-layer'

/**
 * POST /api/connectors/[connectorId]/test
 * Validate a connector against a test DOI.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  const { connectorId } = await params
  const body = await request.json().catch(() => ({})) as { testDoi?: string }
  const testDoi = body.testDoi || '10.1038/nature12373'

  const supabase = getSupabaseAdmin()

  // Fetch full connector including credentials
  const { data: c, error } = await supabase
    .from('cc_connectors')
    .select('id, connector_type, display_name, enabled, priority, auth_type, config, proxy_url')
    .eq('id', connectorId)
    .single()

  if (error || !c) return NextResponse.json({ error: 'Connector not found' }, { status: 404 })

  const config = (c.config || {}) as Record<string, string>
  const connector: ConnectorConfig = {
    id: c.id,
    connectorType: c.connector_type as ConnectorType,
    displayName: c.display_name,
    enabled: true,
    priority: c.priority,
    authType: (c.auth_type || 'none') as ConnectorConfig['authType'],
    apiKey: config.api_key,
    proxyUrl: c.proxy_url || config.proxy_url,
    baseUrl: config.base_url,
    email: config.email,
    instToken: config.inst_token,
  }

  const testResult = await testConnector(connector, testDoi)

  // Update connector status
  await supabase
    .from('cc_connectors')
    .update({
      status: testResult.success ? 'active' : 'error',
      last_error: testResult.success ? null : testResult.message,
      last_success_at: testResult.success ? new Date().toISOString() : undefined,
    })
    .eq('id', connectorId)

  return NextResponse.json({ testResult, testDoi })
}
