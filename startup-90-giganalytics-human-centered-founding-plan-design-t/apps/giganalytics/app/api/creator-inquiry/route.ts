import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const InquirySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  platform: z.string().max(200).optional(),
  audience_size: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = InquirySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Please check your inputs.' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = await createClient()

    // Store inquiry
    const { error: dbError } = await supabase.from('creator_inquiries').insert({
      name: data.name,
      email: data.email,
      platform: data.platform ?? null,
      audience_size: data.audience_size ?? null,
      message: data.message ?? null,
    })

    if (dbError) {
      // Graceful degradation — table may not exist yet, still return success
      console.error('Supabase creator_inquiries insert error:', dbError.message)
    }

    // Send email notification via AgentMail
    try {
      const agentMailKey = process.env.AGENTMAIL_API_KEY
      if (agentMailKey) {
        await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${agentMailKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: 'scide-founder@agentmail.to',
            subject: `New Creator Partnership Inquiry — ${data.name}`,
            text: [
              `New creator inquiry from the GigAnalytics for-creators page.`,
              ``,
              `Name: ${data.name}`,
              `Email: ${data.email}`,
              `Platform/Handle: ${data.platform ?? 'Not specified'}`,
              `Audience Size: ${data.audience_size ?? 'Not specified'}`,
              `Message: ${data.message ?? 'None'}`,
              ``,
              `Reply to: ${data.email}`,
            ].join('\n'),
          }),
        })
      }
    } catch (emailErr) {
      console.error('AgentMail notification error:', emailErr)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Creator inquiry API error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
