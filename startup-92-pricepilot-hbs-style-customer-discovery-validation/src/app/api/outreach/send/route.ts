/**
 * POST /api/outreach/send
 * Send drafted outreach emails via AgentMail (scide-founder@agentmail.to).
 * Only sends emails with status='drafted' and a contact_email.
 *
 * Body: { target_id: string } | { batch: true, limit?: number }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY!
const FROM_EMAIL = 'scide-founder@agentmail.to'
const FROM_NAME  = 'Erlis @ PricingSim'
const BASE_URL   = 'https://pricingsim.com'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  // AgentMail REST API: POST /v0/inboxes/{inbox_id}/messages
  const inboxId = FROM_EMAIL  // inbox_id == email address
  const payload = {
    to: [{ email: to }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    text: body,
    // Add a plain-text footer with unsubscribe instruction
    text_footer: `\n\n---\nYou received this because PricingSim's founder reached out personally. Reply to this email or visit ${BASE_URL} to learn more. To opt out, reply "unsubscribe".`,
  }

  const resp = await fetch(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await resp.json().catch(() => ({}))

  if (!resp.ok) {
    return { sent: false, error: data.error || `HTTP ${resp.status}` }
  }

  return { sent: true, messageId: data.id || data.message_id }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const supabase = getSupabaseAdmin()

  if (body.target_id) {
    const { data: target, error } = await supabase
      .from('outreach_targets')
      .select('*')
      .eq('id', body.target_id)
      .single()

    if (error || !target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }
    if (target.status !== 'drafted' && target.status !== 'ready') {
      return NextResponse.json({ error: `Target status is '${target.status}', not 'drafted'` }, { status: 400 })
    }
    if (!target.contact_email) {
      return NextResponse.json({ error: 'No contact_email for this target' }, { status: 400 })
    }
    if (!target.email_body) {
      return NextResponse.json({ error: 'No email_body drafted for this target' }, { status: 400 })
    }

    const result = await sendEmail(target.contact_email, target.email_subject, target.email_body)

    if (result.sent) {
      await supabase
        .from('outreach_targets')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', body.target_id)
    }

    return NextResponse.json({ ...result, target_id: body.target_id, to: target.contact_email })

  } else if (body.batch) {
    const limit = Math.min(body.limit ?? 5, 10)  // conservative default to avoid spam
    const { data: targets } = await supabase
      .from('outreach_targets')
      .select('*')
      .in('status', ['drafted', 'ready'])
      .not('contact_email', 'is', null)
      .not('email_body', 'is', null)
      .limit(limit)

    if (!targets?.length) {
      return NextResponse.json({ sent: 0, message: 'No drafted targets with email addresses' })
    }

    const results = []
    for (const target of targets) {
      const result = await sendEmail(target.contact_email!, target.email_subject!, target.email_body!)
      if (result.sent) {
        await supabase
          .from('outreach_targets')
          .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', target.id)
      }
      results.push({
        id: target.id,
        site_name: target.site_name,
        to: target.contact_email,
        ...result,
      })
      // Rate limit: 1 email per second to avoid bursting AgentMail
      await new Promise(r => setTimeout(r, 1000))
    }

    return NextResponse.json({
      sent: results.filter(r => r.sent).length,
      failed: results.filter(r => !r.sent).length,
      results,
    })
  }

  return NextResponse.json({ error: 'Provide target_id or batch:true' }, { status: 400 })
}
