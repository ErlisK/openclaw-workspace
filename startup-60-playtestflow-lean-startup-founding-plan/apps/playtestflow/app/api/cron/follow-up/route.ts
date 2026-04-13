import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendEmail, buildFollowUpEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/cron/follow-up
 * Vercel Cron Job — runs every hour.
 * Sends post-session follow-up emails to testers for sessions that ended
 * in the past 1–3 hours asking for feedback.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET ?? 'ptf-cron-dev'
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const jobStart = Date.now()
  const now = new Date()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'

  let sent = 0
  let skipped = 0
  let errors = 0

  // Sessions that ended 1–3 hours ago (scheduled_at + duration_minutes)
  // We approximate: sessions with scheduled_at between 4h ago and 1h ago
  const windowStart = new Date(now.getTime() - 4 * 3600_000)
  const windowEnd   = new Date(now.getTime() - 1 * 3600_000)

  const { data: signups } = await svc
    .from('session_signups')
    .select(`
      id,
      tester_name,
      tester_email,
      tester_id,
      session_id,
      reward_code,
      playtest_sessions!inner(
        id, title, scheduled_at, duration_minutes, designer_id,
        designer_profiles(display_name)
      )
    `)
    .in('status', ['confirmed', 'registered', 'completed'])
    .not('tester_email', 'is', null)
    .gte('playtest_sessions.scheduled_at', windowStart.toISOString())
    .lte('playtest_sessions.scheduled_at', windowEnd.toISOString())

  for (const signup of signups ?? []) {
    const session = signup.playtest_sessions as unknown as Record<string, unknown>
    if (!session) continue

    const hashedEmail = `ptf_followup_${Buffer.from(String(signup.tester_email ?? signup.id)).toString('base64')}`

    // Dedup check
    const { data: existing } = await svc
      .from('scheduled_emails')
      .select('id')
      .eq('email_type', 'follow_up')
      .eq('signup_id', signup.id)
      .in('status', ['sent', 'pending'])
      .single()

    if (existing) { skipped++; continue }

    const { data: scheduled } = await svc
      .from('scheduled_emails')
      .insert({
        email_type:      'follow_up',
        session_id:      signup.session_id,
        signup_id:       signup.id,
        recipient_hashed: hashedEmail,
        scheduled_for:   new Date().toISOString(),
        status:          'pending',
      })
      .select('id')
      .single()

    if (!scheduled) { errors++; continue }

    const designerProfiles = session.designer_profiles as Record<string, unknown>[] | Record<string, unknown> | null
    const designerName = Array.isArray(designerProfiles)
      ? (designerProfiles[0]?.display_name as string) ?? 'the designer'
      : (designerProfiles?.display_name as string) ?? 'the designer'

    const rewardDesc = signup.reward_code
      ? `Reward code: ${signup.reward_code}`
      : undefined

    const { subject, html } = buildFollowUpEmail({
      testerName:        String(signup.tester_name ?? 'Playtester'),
      sessionTitle:      String(session.title),
      feedbackUrl:       `${APP_URL}/feedback/${signup.session_id}?tester=${signup.tester_id ?? signup.id}`,
      designerName,
      rewardDescription: rewardDesc,
    })

    const result = await sendEmail({
      to:      String(signup.tester_email),
      subject,
      html,
    })

    await svc.from('scheduled_emails').update({
      status:           result.ok ? 'sent' : 'failed',
      sent_at:          result.ok ? new Date().toISOString() : null,
      agentmail_msg_id: result.messageId ?? null,
      error_message:    result.error ?? null,
    }).eq('id', scheduled.id)

    await svc.from('email_log').insert({
      session_id:       signup.session_id,
      signup_id:        signup.id,
      tester_email:     signup.tester_email,
      tester_id:        signup.tester_id,
      email_type:       'follow_up',
      subject,
      agentmail_msg_id: result.messageId ?? null,
      status:           result.ok ? 'sent' : 'failed',
      error_message:    result.error ?? null,
      sent_at:          new Date().toISOString(),
    })

    if (result.ok) sent++
    else errors++
  }

  await svc.from('cron_job_runs').insert({
    job_name:       'follow-up',
    status:         errors > 0 && sent === 0 ? 'failed' : 'completed',
    rows_processed: sent,
    completed_at:   new Date().toISOString(),
    metadata:       { sent, skipped, errors, duration_ms: Date.now() - jobStart },
  })

  return NextResponse.json({ ok: true, sent, skipped, errors, duration_ms: Date.now() - jobStart })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
