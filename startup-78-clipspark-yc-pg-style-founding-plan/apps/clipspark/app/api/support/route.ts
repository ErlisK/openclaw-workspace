import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/support — contact form → email via AgentMail + stored in DB
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, type, message } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  // Get current user if logged in (optional — form is also accessible logged out)
  let userId: string | null = null
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
  } catch {}

  const svc = createServiceClient()

  // Store in feedback table
  await svc.from('feedback').insert({
    user_id: userId,
    type: `support:${type || 'general'}`,
    content: message,
    metadata: { name: name || null, contact_email: email || null },
    created_at: new Date().toISOString(),
  })

  // Forward to support inbox via AgentMail
  const agentMailKey = process.env.AGENTMAIL_API_KEY
  if (agentMailKey) {
    try {
      const subject = `[ClipSpark Support] ${type || 'general'} — ${(message || '').slice(0, 60)}`
      const emailBody = [
        `Type: ${type || 'general'}`,
        `Name: ${name || '(not provided)'}`,
        `Email: ${email || '(not provided)'}`,
        `User ID: ${userId || '(not logged in)'}`,
        ``,
        `Message:`,
        message,
        ``,
        `---`,
        `Submitted via /community contact form`,
        `Time: ${new Date().toISOString()}`,
      ].join('\n')

      // Create draft
      const draftRes = await fetch(
        'https://api.agentmail.to/v0/inboxes/hello.clipspark@agentmail.to/drafts',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${agentMailKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: ['hello.clipspark@agentmail.to'],
            subject,
            text: emailBody,
          }),
        }
      )

      if (draftRes.ok) {
        const draft = await draftRes.json()
        await fetch(
          `https://api.agentmail.to/v0/inboxes/hello.clipspark@agentmail.to/drafts/${draft.draft_id}/send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${agentMailKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          }
        )
      }
    } catch (err) {
      console.error('[SUPPORT] Failed to forward to AgentMail:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
