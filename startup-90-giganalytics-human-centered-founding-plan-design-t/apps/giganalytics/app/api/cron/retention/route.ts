/**
 * Retention email cron — runs daily via Vercel Cron
 * Sends re-engagement email to users inactive 7 days
 * Sends power-user feedback request to active users at day 14
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://giganalytics.com'

export async function GET(req: Request) {
  // Basic auth check for cron
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const day7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const day14ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const day8ago = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
  const day15ago = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()

  // Find users who signed up 7 days ago (day 7 window) and have no login since signup
  const { data: inactiveUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at, last_sign_in')
    .gte('created_at', day8ago)
    .lte('created_at', day7ago)
    .filter('last_sign_in', 'is', null)
    .limit(50)

  // Find power users: signed up 14 days ago, logged in 3+ times
  const { data: powerUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at, login_count')
    .gte('created_at', day15ago)
    .lte('created_at', day14ago)
    .gte('login_count', 3)
    .limit(50)

  const results = { reengagement: 0, powerUser: 0, errors: 0 }

  // Send re-engagement emails
  for (const user of inactiveUsers ?? []) {
    try {
      await fetch(`${BASE_URL}/api/email/reengagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.full_name }),
      })
      results.reengagement++
    } catch { results.errors++ }
  }

  // Send power user feedback emails
  for (const user of powerUsers ?? []) {
    try {
      await fetch(`${BASE_URL}/api/email/power-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.full_name }),
      })
      results.powerUser++
    } catch { results.errors++ }
  }

  return NextResponse.json({ ok: true, ...results })
}
