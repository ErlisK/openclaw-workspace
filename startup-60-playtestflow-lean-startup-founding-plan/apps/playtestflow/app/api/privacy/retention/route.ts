import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getRetentionSettings, upsertRetentionSettings, applyRetentionPolicy } from '@/lib/privacy'

/**
 * GET /api/privacy/retention
 * Returns current retention settings for the authenticated user.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getRetentionSettings(user.id)
  return NextResponse.json({ settings })
}

/**
 * PATCH /api/privacy/retention
 * Update retention policy settings.
 *
 * Body: Partial<RetentionSettings>
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  // Validate ranges
  const testerPiiDays = typeof body.testerPiiDays === 'number'
    ? Math.min(Math.max(body.testerPiiDays, 0), 3650)
    : undefined
  const feedbackDays = typeof body.feedbackDays === 'number'
    ? Math.min(Math.max(body.feedbackDays, 30), 3650)
    : undefined
  const eventsDays = typeof body.eventsDays === 'number'
    ? Math.min(Math.max(body.eventsDays, 30), 3650)
    : undefined

  await upsertRetentionSettings(user.id, {
    testerPiiDays,
    feedbackDays,
    eventsDays,
    anonymizeNotDelete: typeof body.anonymizeNotDelete === 'boolean' ? body.anonymizeNotDelete : undefined,
    notifyBeforeCleanup: typeof body.notifyBeforeCleanup === 'boolean' ? body.notifyBeforeCleanup : undefined,
  })

  const updated = await getRetentionSettings(user.id)
  return NextResponse.json({ ok: true, settings: updated })
}

/**
 * POST /api/privacy/retention (action: 'apply')
 * Manually trigger retention cleanup for the current user.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getRetentionSettings(user.id)
  const result = await applyRetentionPolicy(user.id, settings)

  return NextResponse.json({
    ok:              result.ok,
    rowsAnonymized:  result.rowsAnonymized,
    tablesAffected:  result.tables,
    message: result.rowsAnonymized > 0
      ? `Anonymized ${result.rowsAnonymized} rows across ${result.tables.join(', ')}.`
      : 'No data matched your retention policy thresholds.',
  })
}
