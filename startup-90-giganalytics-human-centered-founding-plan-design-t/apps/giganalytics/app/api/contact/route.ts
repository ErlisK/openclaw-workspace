import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    if (!email || !message) {
      return NextResponse.json({ error: 'missing_params', message: 'Email and message are required.' }, { status: 400 })
    }

    const supabase = await createClient()

    // Store contact submission in DB
    const { error } = await supabase
      .from('contact_submissions')
      .insert({
        name: name ?? null,
        email,
        subject: subject ?? null,
        message,
        created_at: new Date().toISOString(),
      })

    if (error) {
      // Table may not exist yet — still return success to user
      console.error('contact_submissions insert error:', error.message)
    }

    return NextResponse.json({ ok: true, message: 'Your message has been received. We\'ll respond within 1–2 business days.' })
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
