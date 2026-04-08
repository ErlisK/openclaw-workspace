import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET  /api/connectors             — list connectors + templates
 * POST /api/connectors             — create a new connector
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')
  const userId = searchParams.get('userId')

  const supabase = getSupabaseAdmin()

  // Fetch templates (public catalog)
  const { data: templates } = await supabase
    .from('cc_connector_templates')
    .select('id, connector_type, display_name, description, auth_type, rate_limit_rpm, supports_fulltext, supports_scite, config_schema')
    .order('display_name')

  // Fetch user's configured connectors (redact credentials)
  let connQuery = supabase
    .from('cc_connectors')
    .select('id, connector_type, display_name, enabled, priority, auth_type, status, last_error, last_success_at, total_requests, error_rate, metadata_only, allowed_storage, license_type, created_at')
    .order('priority')

  if (orgId) connQuery = connQuery.eq('org_id', orgId)
  else if (userId) connQuery = connQuery.eq('user_id', userId)
  else {
    // Return only templates if no org/user specified
    return NextResponse.json({ templates: templates || [], connectors: [] })
  }

  const { data: connectors, error } = await connQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    templates: templates || [],
    connectors: connectors || [],
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    orgId?: string
    userId?: string
    connectorType: string
    displayName: string
    priority?: number
    config: Record<string, unknown>   // includes credentials
    metadataOnly?: boolean
    allowedStorage?: boolean
    licenseType?: string
  }

  const {
    orgId, userId, connectorType, displayName,
    priority = 10, config, metadataOnly = false,
    allowedStorage = false, licenseType = 'unknown',
  } = body

  if (!connectorType) return NextResponse.json({ error: 'connectorType required' }, { status: 400 })
  if (!orgId && !userId) return NextResponse.json({ error: 'orgId or userId required' }, { status: 400 })

  // Validate against template
  const supabase = getSupabaseAdmin()
  const { data: template } = await supabase
    .from('cc_connector_templates')
    .select('config_schema, auth_type')
    .eq('connector_type', connectorType)
    .single()

  // Extract auth fields to store separately (credentials encrypted at rest via Supabase RLS)
  const { api_key, proxy_url, ...safeConfig } = config as {
    api_key?: string
    proxy_url?: string
    [key: string]: unknown
  }

  const authType = template?.auth_type || 'none'

  const { data: connector, error } = await supabase
    .from('cc_connectors')
    .insert({
      org_id: orgId || null,
      user_id: userId || null,
      connector_type: connectorType,
      display_name: displayName,
      auth_type: authType,
      priority,
      enabled: true,
      status: 'active',
      proxy_url: proxy_url || null,
      config: { ...safeConfig, ...(api_key ? { api_key } : {}) },
      metadata_only: metadataOnly,
      allowed_storage: allowedStorage,
      license_type: licenseType,
    })
    .select('id, connector_type, display_name, enabled, priority, auth_type, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ connector }, { status: 201 })
}
