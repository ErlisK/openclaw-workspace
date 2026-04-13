import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/sessions/[sessionId]/notify
 * Send transactional emails to testers for a session.
 * Designer-authenticated. Sends via AgentMail. Logs all sends to email_log.
 *
 * emailType: 'confirmation' | 'reminder' | 'post_session' | 'availability_request' | 'scheduling_update'
 * signupIds?: string[] — if omitted, sends to all eligible testers
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('playtest_sessions')
    .select(`id, title, scheduled_at, duration_minutes, platform, meeting_url, projects(name)`)
    .eq('id', sessionId)
    .eq('designer_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const body = await request.json()
  const { emailType = 'confirmation', signupIds, customMessage } = body

  const svc = createServiceClient()

  // Build signups query
  let signupsQuery = svc
    .from('session_signups')
    .select('id, tester_name, tester_email, consent_token, tester_id, status')
    .eq('session_id', sessionId)

  if (signupIds?.length > 0) {
    signupsQuery = signupsQuery.in('id', signupIds)
  } else {
    if (emailType === 'confirmation') signupsQuery = signupsQuery.in('status', ['confirmed', 'registered'])
    else if (emailType === 'reminder') signupsQuery = signupsQuery.in('status', ['confirmed', 'registered'])
    else if (emailType === 'post_session') signupsQuery = signupsQuery.eq('status', 'attended')
    else if (emailType === 'availability_request') signupsQuery = signupsQuery.in('status', ['registered', 'confirmed'])
  }

  const { data: signups } = await signupsQuery
  if (!signups || signups.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No eligible signups' })
  }

  const project = (session.projects as any)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'

  const scheduledStr = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
      })
    : 'TBD'

  // Build calendar links
  const start = session.scheduled_at ? new Date(session.scheduled_at) : null
  const end = start ? new Date(start.getTime() + (session.duration_minutes || 90) * 60000) : null

  const googleLink = start && end ? buildGoogleCalendarLink({
    title: `${project?.name ?? 'PlaytestFlow'}: ${session.title}`,
    start, end,
    description: `Playtest session via PlaytestFlow. Platform: ${session.platform || 'Online'}${session.meeting_url ? `\nJoin: ${session.meeting_url}` : ''}`,
    location: session.meeting_url || session.platform || 'Online',
  }) : null

  const icsUrl = `${siteUrl}/api/sessions/${sessionId}/ics`

  let sent = 0, failed = 0
  const emailLogs: any[] = []

  for (const signup of signups) {
    const urls = {
      consent: `${siteUrl}/consent/${signup.consent_token}`,
      preSurvey: `${siteUrl}/survey/pre/${signup.consent_token}`,
      postSurvey: `${siteUrl}/survey/post/${signup.consent_token}`,
      availability: `${siteUrl}/availability/${sessionId}?token=${signup.consent_token}`,
      ics: `${icsUrl}?token=${signup.consent_token}`,
      gcal: googleLink,
    }

    let subject = '', html = ''

    switch (emailType) {
      case 'confirmation':
        subject = `You're confirmed for "${session.title}" 🎲`
        html = confirmationEmail({ signup, session, project, scheduledStr, urls, siteUrl })
        break
      case 'reminder':
        subject = `Reminder: "${session.title}" is coming up ⏰`
        html = reminderEmail({ signup, session, project, scheduledStr, urls, siteUrl })
        break
      case 'post_session':
        subject = `How was "${project?.name || session.title}"? Leave your feedback 📝`
        html = postSessionEmail({ signup, session, project, urls, siteUrl })
        break
      case 'availability_request':
        subject = `When are you free? Help us schedule "${session.title}"`
        html = availabilityRequestEmail({ signup, session, project, urls, siteUrl })
        break
      case 'scheduling_update':
        subject = `Session scheduled: "${session.title}" — ${scheduledStr}`
        html = schedulingUpdateEmail({ signup, session, project, scheduledStr, urls, siteUrl, customMessage })
        break
    }

    const mailRes = await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: signup.tester_email,
        subject,
        html,
        reply_to: 'scide-founder@agentmail.to',
      }),
    })

    const mailData = mailRes.ok ? await mailRes.json() : null
    const messageId = mailData?.message_id ?? null

    if (mailRes.ok) {
      sent++
      // Update signup tracking column
      const col = emailType === 'confirmation' ? 'last_confirmation_sent_at'
        : emailType === 'reminder' ? 'last_reminder_sent_at'
        : emailType === 'post_session' ? 'last_post_session_sent_at'
        : null
      if (col) {
        await svc.from('session_signups').update({ [col]: new Date().toISOString() }).eq('id', signup.id)
      }
    } else {
      failed++
    }

    emailLogs.push({
      session_id: sessionId,
      signup_id: signup.id,
      tester_id: signup.tester_id,
      tester_email: signup.tester_email,
      email_type: emailType,
      subject,
      agentmail_message_id: messageId,
      status: mailRes.ok ? 'sent' : 'failed',
      error_message: !mailRes.ok ? (await mailRes.text().catch(() => 'unknown')) : null,
    })
  }

  // Bulk insert email log
  if (emailLogs.length > 0) {
    await svc.from('email_log').insert(emailLogs)
  }

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: signups.length,
    email_type: emailType,
  })
}

// ─── Calendar link builder ────────────────────────────────────────────────────

function buildGoogleCalendarLink({ title, start, end, description, location }: {
  title: string; start: Date; end: Date; description: string; location: string
}) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description,
    location,
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

// ─── Email base template ──────────────────────────────────────────────────────

function emailBase(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e6edf3;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td style="padding:0 0 20px 0;"><span style="font-size:22px;font-weight:700;color:#f97316;">🎲 PlaytestFlow</span></td></tr>
  ${body}
  <tr><td style="padding:28px 0 0 0;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:#6e7681;">
    Powered by <a href="https://playtestflow.vercel.app" style="color:#f97316;text-decoration:none;">PlaytestFlow</a>
    · Remote playtest management for indie designers
    · Reply to unsubscribe
  </td></tr>
</table></td></tr></table></body></html>`
}

function btn(url: string, label: string, primary = true): string {
  const bg = primary ? '#f97316' : 'rgba(255,255,255,0.08)'
  return `<a href="${url}" style="display:inline-block;background:${bg};color:${primary ? '#fff' : '#e6edf3'};padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:4px 6px 4px 0;">${label}</a>`
}

// ─── Email templates ──────────────────────────────────────────────────────────

function confirmationEmail({ signup, session, project, scheduledStr, urls, siteUrl }: any) {
  return emailBase(`
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;">
    <p style="font-size:22px;font-weight:700;margin:0 0 6px 0;">You're confirmed! 🎉</p>
    <p style="color:#8b949e;margin:0 0 20px 0;">Hi ${signup.tester_name}, your spot is locked in.</p>

    <p style="font-size:18px;font-weight:700;color:#f97316;margin:0 0 4px 0;">${session.title}</p>
    ${project?.name ? `<p style="color:#8b949e;margin:0 0 16px 0;">${project.name}</p>` : ''}

    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;width:100%;">
      <tr><td style="background:rgba(255,255,255,0.06);border-radius:8px;padding:10px 14px;margin-bottom:8px;">
        <span style="color:#8b949e;font-size:11px;display:block;">WHEN</span>
        <span style="font-weight:600;">${scheduledStr}</span>
      </td></tr>
      ${session.platform ? `<tr><td style="height:8px;"></td></tr><tr><td style="background:rgba(255,255,255,0.06);border-radius:8px;padding:10px 14px;">
        <span style="color:#8b949e;font-size:11px;display:block;">PLATFORM</span>
        <span style="font-weight:600;">${session.platform}</span>
        ${session.meeting_url ? `<br><a href="${session.meeting_url}" style="color:#f97316;font-size:13px;">${session.meeting_url}</a>` : ''}
      </td></tr>` : ''}
    </table>

    <p style="font-weight:700;margin:0 0 10px 0;">To-do before the session:</p>
    <p style="margin:0 0 16px 0;">
      ${btn(urls.consent, '1. Sign consent form')}
      ${btn(urls.preSurvey, '2. Pre-session survey', false)}
    </p>

    <p style="font-weight:700;margin:0 0 10px 0;">Add to calendar:</p>
    <p style="margin:0 0 16px 0;">
      ${btn(urls.ics, '📅 Download .ICS', false)}
      ${urls.gcal ? btn(urls.gcal, '📅 Google Calendar', false) : ''}
    </p>

    ${signup.tester_id ? `<p style="font-size:12px;color:#6e7681;margin:16px 0 0 0;">Your anonymous tester ID: <code style="background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">${signup.tester_id}</code></p>` : ''}
  </td></tr>`)
}

function reminderEmail({ signup, session, project, scheduledStr, urls, siteUrl }: any) {
  return emailBase(`
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;">
    <p style="font-size:22px;font-weight:700;margin:0 0 6px 0;">Session reminder ⏰</p>
    <p style="color:#8b949e;margin:0 0 20px 0;">Hi ${signup.tester_name}, your playtest is coming up!</p>

    <p style="font-size:18px;font-weight:700;color:#f97316;margin:0 0 4px 0;">${session.title}</p>
    <p style="margin:0 0 8px 0;"><strong>When:</strong> ${scheduledStr}</p>
    ${session.meeting_url ? `<p style="margin:0 0 16px 0;"><strong>Join:</strong> <a href="${session.meeting_url}" style="color:#f97316;">${session.meeting_url}</a></p>` : ''}

    <p style="margin:0 0 8px 0;">Please complete these steps if you haven't already:</p>
    <p>${btn(urls.consent, '✓ Consent + Pre-survey')}${btn(urls.ics, '📅 .ICS Calendar', false)}</p>
  </td></tr>`)
}

function postSessionEmail({ signup, session, project, urls, siteUrl }: any) {
  return emailBase(`
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;">
    <p style="font-size:22px;font-weight:700;margin:0 0 6px 0;">Thanks for playtesting! 🙏</p>
    <p style="color:#8b949e;margin:0 0 20px 0;">
      Hi ${signup.tester_name}, we hope you had a great session! 
      Your feedback directly helps improve ${project?.name || session.title}.
    </p>
    <p style="margin:0 0 4px 0;font-size:14px;color:#8b949e;">It takes about 5 minutes:</p>
    <p style="margin:0 0 20px 0;">${btn(urls.postSurvey, 'Leave My Feedback →')}</p>
    <p style="font-size:13px;color:#8b949e;margin:0;">
      Your feedback is anonymous and tied only to your tester ID — the designer sees aggregated data, not your name.
    </p>
  </td></tr>`)
}

function availabilityRequestEmail({ signup, session, project, urls, siteUrl }: any) {
  return emailBase(`
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;">
    <p style="font-size:22px;font-weight:700;margin:0 0 6px 0;">When are you free? 📅</p>
    <p style="color:#8b949e;margin:0 0 20px 0;">
      Hi ${signup.tester_name}, we're scheduling "${session.title}" and want to find a time that works for everyone.
    </p>
    <p style="margin:0 0 4px 0;">Takes under 1 minute — just pick your available times:</p>
    <p style="margin:0 0 20px 0;">${btn(urls.availability, 'Share My Availability →')}</p>
    <p style="font-size:13px;color:#8b949e;">
      Game: ${project?.name || 'Untitled'} · Platform: ${session.platform || 'Online'}
    </p>
  </td></tr>`)
}

function schedulingUpdateEmail({ signup, session, project, scheduledStr, urls, customMessage, siteUrl }: any) {
  return emailBase(`
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;">
    <p style="font-size:22px;font-weight:700;margin:0 0 6px 0;">Session scheduled! 🗓</p>
    <p style="color:#8b949e;margin:0 0 20px 0;">Hi ${signup.tester_name}, we've confirmed the time for your playtest:</p>

    <p style="font-size:18px;font-weight:700;color:#f97316;margin:0 0 4px 0;">${session.title}</p>
    <p style="margin:0 0 4px 0;"><strong>When:</strong> ${scheduledStr}</p>
    ${session.platform ? `<p style="margin:0 0 4px 0;"><strong>Platform:</strong> ${session.platform}</p>` : ''}
    ${session.meeting_url ? `<p style="margin:0 0 16px 0;"><strong>Join:</strong> <a href="${session.meeting_url}" style="color:#f97316;">${session.meeting_url}</a></p>` : ''}

    ${customMessage ? `<p style="background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);border-radius:8px;padding:12px 14px;font-size:14px;">${customMessage}</p>` : ''}

    <p style="margin:16px 0 8px 0;">
      ${btn(urls.ics, '📅 Download .ICS')}
      ${urls.gcal ? btn(urls.gcal, '📅 Google Calendar', false) : ''}
    </p>
    <p>${btn(urls.consent, '→ Complete consent + pre-survey', false)}</p>
  </td></tr>`)
}
