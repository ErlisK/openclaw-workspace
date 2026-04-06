import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/sessions/[sessionId]/notify
 * Send confirmation emails to testers for a session.
 * Designer-authenticated. Sends via AgentMail.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify session belongs to this designer
  const { data: session } = await supabase
    .from('playtest_sessions')
    .select(`
      id, title, scheduled_at, duration_minutes, platform, meeting_url,
      projects ( name )
    `)
    .eq('id', sessionId)
    .eq('designer_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const body = await request.json()
  const { emailType = 'confirmation', signupIds } = body
  // emailType: 'confirmation' | 'reminder' | 'post_session'

  const serviceSupabase = createServiceClient()

  // Get signups to notify
  let signupsQuery = serviceSupabase
    .from('session_signups')
    .select('id, tester_name, tester_email, consent_token, tester_id, status')
    .eq('session_id', sessionId)

  if (signupIds && signupIds.length > 0) {
    signupsQuery = signupsQuery.in('id', signupIds)
  } else if (emailType === 'confirmation') {
    signupsQuery = signupsQuery.eq('status', 'confirmed')
  }

  const { data: signups } = await signupsQuery

  if (!signups || signups.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No eligible signups' })
  }

  const project = session.projects as any
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'

  const scheduledStr = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
        timeZoneName: 'short',
      })
    : 'TBD'

  let sent = 0
  let failed = 0

  for (const signup of signups) {
    const consentUrl = `${siteUrl}/consent/${signup.consent_token}`
    const preSurveyUrl = `${siteUrl}/survey/pre/${signup.consent_token}`
    const postSurveyUrl = `${siteUrl}/survey/post/${signup.consent_token}`
    const icsUrl = `${siteUrl}/api/sessions/${sessionId}/ics`

    let subject = ''
    let html = ''

    if (emailType === 'confirmation') {
      subject = `You're confirmed for: ${session.title} 🎲`
      html = buildConfirmationEmail({
        testerName: signup.tester_name,
        sessionTitle: session.title,
        gameName: project?.name,
        scheduledStr,
        platform: session.platform,
        meetingUrl: session.meeting_url,
        consentUrl,
        preSurveyUrl,
        icsUrl,
        testerId: signup.tester_id,
        siteUrl,
      })
    } else if (emailType === 'reminder') {
      subject = `Reminder: "${session.title}" is coming up 🎲`
      html = buildReminderEmail({
        testerName: signup.tester_name,
        sessionTitle: session.title,
        scheduledStr,
        platform: session.platform,
        meetingUrl: session.meeting_url,
        consentUrl,
        preSurveyUrl,
        icsUrl,
        siteUrl,
      })
    } else if (emailType === 'post_session') {
      subject = `Thanks for playtesting "${project?.name || session.title}"! Leave your feedback 📝`
      html = buildPostSessionEmail({
        testerName: signup.tester_name,
        sessionTitle: session.title,
        gameName: project?.name,
        postSurveyUrl,
        siteUrl,
      })
    }

    // Send via AgentMail
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

    if (mailRes.ok) {
      sent++
      // Track that email was sent
      await serviceSupabase.from('session_signups').update({
        [`last_${emailType}_sent_at`]: new Date().toISOString(),
      } as any).eq('id', signup.id)
    } else {
      failed++
      console.error('Mail failed for', signup.tester_email, await mailRes.text())
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: signups.length })
}

// ─── Email Templates ─────────────────────────────────────────────────────────

function emailBase(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e6edf3;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td style="padding:0 0 20px 0;">
    <span style="font-size:22px;font-weight:700;color:#f97316;">🎲 PlaytestFlow</span>
  </td></tr>
  ${body}
  <tr><td style="padding:32px 0 0 0;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:#6e7681;">
    Powered by <a href="https://playtestflow.vercel.app" style="color:#f97316;text-decoration:none;">PlaytestFlow</a> · 
    Remote playtest management for indie designers
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

function btn(url: string, text: string, primary = true) {
  const bg = primary ? '#f97316' : 'rgba(255,255,255,0.08)'
  const color = primary ? '#fff' : '#e6edf3'
  return `<a href="${url}" style="display:inline-block;background:${bg};color:${color};padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:4px 8px 4px 0;">${text}</a>`
}

function buildConfirmationEmail(p: {
  testerName: string; sessionTitle: string; gameName?: string; scheduledStr: string
  platform?: string; meetingUrl?: string; consentUrl: string; preSurveyUrl: string
  icsUrl: string; testerId?: string; siteUrl: string
}) {
  return emailBase(`
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;margin-bottom:16px;">
    <p style="font-size:22px;font-weight:700;margin:0 0 8px 0;">You're in! 🎉</p>
    <p style="color:#8b949e;margin:0 0 24px 0;">Hi ${p.testerName}, your spot is confirmed for:</p>
    
    <p style="font-size:18px;font-weight:700;color:#f97316;margin:0 0 4px 0;">${p.sessionTitle}</p>
    ${p.gameName ? `<p style="color:#8b949e;margin:0 0 20px 0;">Game: ${p.gameName}</p>` : ''}
    
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
      <tr><td style="background:rgba(255,255,255,0.06);border-radius:8px;padding:12px 16px;margin-bottom:8px;">
        <span style="color:#8b949e;font-size:12px;display:block;margin-bottom:2px;">WHEN</span>
        <span style="font-weight:600;">${p.scheduledStr}</span>
      </td></tr>
      ${p.platform ? `<tr><td style="height:8px;"></td></tr><tr><td style="background:rgba(255,255,255,0.06);border-radius:8px;padding:12px 16px;">
        <span style="color:#8b949e;font-size:12px;display:block;margin-bottom:2px;">PLATFORM</span>
        <span style="font-weight:600;">${p.platform}</span>
        ${p.meetingUrl ? `<br><a href="${p.meetingUrl}" style="color:#f97316;font-size:13px;">${p.meetingUrl}</a>` : ''}
      </td></tr>` : ''}
    </table>
    
    <p style="font-weight:700;margin:0 0 12px 0;">Action required before the session:</p>
    <div style="margin-bottom:24px;">
      ${btn(p.consentUrl, '1. Sign Consent Form')}
      ${btn(p.preSurveyUrl, '2. Pre-Session Survey', false)}
    </div>
    
    <div>
      ${btn(p.icsUrl, '📅 Add to Calendar', false)}
    </div>
    
    ${p.testerId ? `<p style="font-size:12px;color:#6e7681;margin:24px 0 0 0;">Your anonymous tester ID: <code style="background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">${p.testerId}</code></p>` : ''}
  </td></tr>`)
}

function buildReminderEmail(p: {
  testerName: string; sessionTitle: string; scheduledStr: string
  platform?: string; meetingUrl?: string; consentUrl: string
  preSurveyUrl: string; icsUrl: string; siteUrl: string
}) {
  return emailBase(`
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;">
    <p style="font-size:22px;font-weight:700;margin:0 0 8px 0;">Session coming up ⏰</p>
    <p style="color:#8b949e;margin:0 0 20px 0;">Hi ${p.testerName}, just a reminder about your upcoming playtest:</p>
    
    <p style="font-size:18px;font-weight:700;color:#f97316;margin:0 0 16px 0;">${p.sessionTitle}</p>
    <p style="margin:0 0 8px 0;"><strong>When:</strong> ${p.scheduledStr}</p>
    ${p.platform ? `<p style="margin:0 0 16px 0;"><strong>Platform:</strong> ${p.platform}${p.meetingUrl ? ` — <a href="${p.meetingUrl}" style="color:#f97316;">${p.meetingUrl}</a>` : ''}</p>` : ''}
    
    <p style="margin:0 0 12px 0;">If you haven't already, please complete these before the session:</p>
    <div style="margin-bottom:8px;">
      ${btn(p.consentUrl, 'Consent + Pre-Survey')}
    </div>
  </td></tr>`)
}

function buildPostSessionEmail(p: {
  testerName: string; sessionTitle: string; gameName?: string; postSurveyUrl: string; siteUrl: string
}) {
  return emailBase(`
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;">
    <p style="font-size:22px;font-weight:700;margin:0 0 8px 0;">Thanks for playtesting! 🙏</p>
    <p style="color:#8b949e;margin:0 0 20px 0;">
      Hi ${p.testerName}, we hope you had a great time with "${p.gameName || p.sessionTitle}".
      Your feedback is incredibly valuable for improving the game.
    </p>
    
    <p style="margin:0 0 16px 0;">It only takes about 5 minutes — please share your honest thoughts:</p>
    <div style="margin-bottom:24px;">${btn(p.postSurveyUrl, 'Leave My Feedback →')}</div>
    
    <p style="font-size:13px;color:#8b949e;margin:0;">
      Your feedback is anonymous and linked only to your tester ID. The designer receives 
      aggregated insights, not your name or email.
    </p>
  </td></tr>`)
}
