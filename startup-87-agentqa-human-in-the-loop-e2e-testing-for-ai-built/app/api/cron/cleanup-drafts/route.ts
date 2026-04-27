/**
 * GET /api/cron/cleanup-drafts
 * Called by Vercel Cron (daily at 03:00 UTC).
 *
 * Finds draft jobs that are more than 7 days old and have never been published.
 * These are abandoned sessions — the user submitted the form but never paid/published.
 * Marks them as `cancelled` so the database doesn't accumulate zombie rows.
 *
 * Draft jobs do NOT have held credits (credits are held on publish), so no credit
 * release is needed. We just mark them cancelled and log the count.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const DRAFT_TTL_DAYS = 7

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const cutoff = new Date(Date.now() - DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Find stale draft jobs: status=draft, created_at older than cutoff, never published
  const { data: stale, error: selectError } = await admin
    .from('test_jobs')
    .select('id, title, client_id, created_at')
    .eq('status', 'draft')
    .is('published_at', null)
    .lt('created_at', cutoff)
    .limit(200)

  if (selectError) {
    console.error('[cron/cleanup-drafts] DB select error:', selectError.message)
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ ok: true, cancelled: 0 })
  }

  const ids = stale.map((j: { id: string }) => j.id)

  const { error: updateError } = await admin
    .from('test_jobs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'draft') // guard against race conditions

  if (updateError) {
    console.error('[cron/cleanup-drafts] DB update error:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  console.log(`[cron/cleanup-drafts] Cancelled ${stale.length} stale draft jobs older than ${DRAFT_TTL_DAYS} days`)
  return NextResponse.json({ ok: true, cancelled: stale.length, job_ids: ids })
}
