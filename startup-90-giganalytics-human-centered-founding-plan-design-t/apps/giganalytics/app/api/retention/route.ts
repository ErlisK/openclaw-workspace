import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/retention
 * Returns at-risk users (no sign-in in 24–72h) for re-engagement campaigns.
 * Marks them as at_risk in user_settings so the dashboard can surface nudges.
 *
 * Designed to be called by a scheduled cron (Vercel Cron or external).
 * Secured with CRON_SECRET header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const now = new Date()
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const cutoff72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()

  // Find users whose last sign-in was 24–72h ago (at-risk window)
  const { data: atRiskUsers, error } = await supabase
    .from('profiles')
    .select('id, email, created_at, updated_at')
    .lt('updated_at', cutoff24h)
    .gt('updated_at', cutoff72h)

  if (error) {
    console.error('[retention] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = atRiskUsers ?? []

  // Upsert at_risk flag into user_settings for each at-risk user
  let flagged = 0
  for (const user of users) {
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: user.id, key: 'retention_at_risk', value: 'true', updated_at: now.toISOString() },
        { onConflict: 'user_id,key' }
      )
    if (!upsertError) flagged++
  }

  // Also clear the flag for recently active users (signed in within 24h)
  const { data: activeUsers } = await supabase
    .from('profiles')
    .select('id')
    .gte('updated_at', cutoff24h)

  let cleared = 0
  for (const user of activeUsers ?? []) {
    const { error: clearError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user.id)
      .eq('key', 'retention_at_risk')
    if (!clearError) cleared++
  }

  return NextResponse.json({
    at_risk_users: users.length,
    flagged,
    cleared,
    window: { from: cutoff72h, to: cutoff24h },
    timestamp: now.toISOString(),
  })
}

/**
 * POST /api/retention/dismiss
 * Called when a user re-engages — clears their at-risk flag.
 */
export async function POST(request: Request) {
  const supabase = await createServiceClient()

  let userId: string
  try {
    const body = await request.json()
    userId = body.user_id
    if (!userId) throw new Error('missing user_id')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', userId)
    .eq('key', 'retention_at_risk')

  return NextResponse.json({ success: true, user_id: userId })
}
