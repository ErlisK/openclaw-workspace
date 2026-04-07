import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { collectUserData } from '@/lib/privacy'

/**
 * POST /api/privacy/export
 * GDPR Art. 15 (right of access) + Art. 20 (data portability)
 * CCPA §1798.100 (right to know)
 *
 * Creates a privacy_requests row, collects all user data,
 * and returns a JSON export. For production, this would generate
 * a signed URL; here we return the data directly (within 50KB limit).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const regulation = body.regulation ?? 'gdpr'

  const svc = createServiceClient()

  // Rate-limit: one export per 24h
  const { data: recent } = await svc
    .from('privacy_requests')
    .select('id, requested_at')
    .eq('user_id', user.id)
    .eq('request_type', 'export')
    .gte('requested_at', new Date(Date.now() - 86400_000).toISOString())
    .limit(1)
    .single()

  if (recent) {
    return NextResponse.json({
      error: 'You can request a data export once per 24 hours. Please try again later.',
      nextAvailable: new Date(new Date(recent.requested_at).getTime() + 86400_000).toISOString(),
    }, { status: 429 })
  }

  // Create pending request
  const { data: req } = await svc
    .from('privacy_requests')
    .insert({
      user_id:      user.id,
      request_type: 'export',
      status:       'processing',
      regulation,
      ip_hash:      request.headers.get('x-forwarded-for') ? 'hashed' : null,
    })
    .select('id')
    .single()

  // Collect all data
  const exportData = await collectUserData(user.id)

  // Serialize to JSON
  const json = JSON.stringify(exportData, null, 2)
  const sizeBytes = Buffer.byteLength(json, 'utf8')

  // Mark completed
  await svc.from('privacy_requests').update({
    status:       'completed',
    completed_at: new Date().toISOString(),
    notes:        `Export size: ${(sizeBytes / 1024).toFixed(1)} KB`,
  }).eq('id', req?.id)

  // Return as downloadable JSON file
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="playtestflow-data-export-${new Date().toISOString().slice(0,10)}.json"`,
      'X-Export-Size-Bytes': String(sizeBytes),
      'X-Request-Id': req?.id ?? 'unknown',
    },
  })
}
