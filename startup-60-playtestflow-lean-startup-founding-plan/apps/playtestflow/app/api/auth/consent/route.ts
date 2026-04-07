import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/auth/consent
 * Records designer TOS + PII consent acceptance.
 * Creates or updates a row in designer_profiles.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const tos_version = body.tos_version ?? '1.0'
  const now = new Date().toISOString()

  const svc = createServiceClient()

  // Upsert designer profile with consent timestamps
  const { error } = await svc
    .from('designer_profiles')
    .upsert({
      id: user.id,
      tos_accepted_at: now,
      tos_version,
      pii_consent_accepted_at: now,
      updated_at: now,
    }, {
      onConflict: 'id',
    })

  if (error) {
    console.error('Consent upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    tos_accepted_at: now,
    tos_version,
  })
}

/**
 * GET /api/auth/consent
 * Returns current consent status for the authenticated designer.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('designer_profiles')
    .select('tos_accepted_at, tos_version, pii_consent_accepted_at')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    consented: !!profile?.tos_accepted_at,
    tos_accepted_at: profile?.tos_accepted_at ?? null,
    tos_version: profile?.tos_version ?? null,
    pii_consent_accepted_at: profile?.pii_consent_accepted_at ?? null,
  })
}
