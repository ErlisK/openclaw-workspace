import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendEmail, buildReminderEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/cron/reminders
 * Vercel Cron Job — runs every 15 minutes.
 * Sends 24h and 1h reminder emails to registered testers for upcoming sessions.
 *
 * Flow:
 *   1. Find confirmed signups for sessions in the next 24h–25h window (24h reminder)
 *      and 45min–75min window (1h reminder)
 *   2. Check scheduled_emails dedup table to avoid re-sends
 *   3. Send via AgentMail, log result
 *   4. Record cron_job_runs row
 */
export async function POST(request: NextRequest) {
  // Validate cron secret
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

  // ── Helper: process one reminder window ────────────────────────────────────
  async function processWindow(
    emailType: '24h_reminder' | '1h_reminder',
    windowStart: Date,
    windowEnd: Date,
    hoursUntil: number
  ) {
    // Find confirmed signups for sessions in this window
    const { data: signups } = await svc
      .from('session_signups')
      .select(`
        id,
        tester_name,
        tester_email,
        tester_id,
        session_id,
        playtest_sessions!inner(
          id, title, scheduled_at, designer_id,
          designer_profiles(display_name)
        )
      `)
      .in('status', ['confirmed', 'registered'])
      .not('tester_email', 'is', null)
      .gte('playtest_sessions.scheduled_at', windowStart.toISOString())
      .lte('playtest_sessions.scheduled_at', windowEnd.toISOString())

    if (!signups?.length) return

    for (const signup of signups) {
      const session = signup.playtest_sessions as unknown as Record<string, unknown>
      if (!session) continue

      // Hash email for dedup (same pattern as DB trigger)
      const hashedEmail = `ptf_dedup_${Buffer.from(String(signup.tester_email ?? signup.tester_id ?? signup.id)).toString('base64')}`

      // Check dedup
      const { data: existing } = await svc
        .from('scheduled_emails')
        .select('id')
        .eq('email_type', emailType)
        .eq('signup_id', signup.id)
        .in('status', ['sent', 'pending'])
        .single()

      if (existing) { skipped++; continue }

      // Mark as pending (dedup guard)
      const { data: scheduled } = await svc
        .from('scheduled_emails')
        .insert({
          email_type: emailType,
          session_id: signup.session_id,
          signup_id: signup.id,
          recipient_hashed: hashedEmail,
          scheduled_for: new Date(Date.now() + 60_000).toISOString(), // immediate
          status: 'pending',
        })
        .select('id')
        .single()

      if (!scheduled) { errors++; continue }

      const designerProfiles = session.designer_profiles as Record<string, unknown>[] | Record<string, unknown> | null
      const designerName = Array.isArray(designerProfiles)
        ? (designerProfiles[0]?.display_name as string) ?? 'the designer'
        : (designerProfiles?.display_name as string) ?? 'the designer'

      const { subject, html } = buildReminderEmail({
        testerName:   String(signup.tester_name ?? 'Playtester'),
        sessionTitle: String(session.title),
        sessionTime:  String(session.scheduled_at),
        sessionUrl:   `${APP_URL}/recruit/${signup.session_id}`,
        designerName,
        hoursUntil,
      })

      const result = await sendEmail({
        to:      String(signup.tester_email),
        subject,
        html,
      })

      // Update scheduled_email row
      await svc
        .from('scheduled_emails')
        .update({
          status:           result.ok ? 'sent' : 'failed',
          sent_at:          result.ok ? new Date().toISOString() : null,
          agentmail_msg_id: result.messageId ?? null,
          error_message:    result.error ?? null,
        })
        .eq('id', scheduled.id)

      // Log to email_log
      await svc.from('email_log').insert({
        session_id:       signup.session_id,
        signup_id:        signup.id,
        tester_email:     signup.tester_email,
        tester_id:        signup.tester_id,
        email_type:       emailType,
        subject,
        agentmail_msg_id: result.messageId ?? null,
        status:           result.ok ? 'sent' : 'failed',
        error_message:    result.error ?? null,
        sent_at:          new Date().toISOString(),
      })

      if (result.ok) sent++
      else errors++
    }
  }

  // ── Run both windows ────────────────────────────────────────────────────────
  // 24h window: sessions scheduled 24h–25h from now
  await processWindow(
    '24h_reminder',
    new Date(now.getTime() + 23.5 * 3600_000),
    new Date(now.getTime() + 25.5 * 3600_000),
    24
  )

  // 1h window: sessions scheduled 45min–75min from now
  await processWindow(
    '1h_reminder',
    new Date(now.getTime() + 45 * 60_000),
    new Date(now.getTime() + 75 * 60_000),
    1
  )

  // ── Record cron run ─────────────────────────────────────────────────────────
  await svc.from('cron_job_runs').insert({
    job_name:       'reminders',
    status:         errors > 0 && sent === 0 ? 'failed' : 'completed',
    rows_processed: sent,
    completed_at:   new Date().toISOString(),
    metadata:       { sent, skipped, errors, duration_ms: Date.now() - jobStart },
  })

  return NextResponse.json({ ok: true, sent, skipped, errors, duration_ms: Date.now() - jobStart })
}

// Allow GET for manual testing via browser
export async function GET(request: NextRequest) {
  return POST(request)
}
