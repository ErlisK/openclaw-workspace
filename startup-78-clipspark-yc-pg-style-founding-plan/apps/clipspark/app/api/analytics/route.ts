import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/analytics — record PostHog-style event (server-side)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json()
  const { event, properties = {} } = body

  if (!event) return NextResponse.json({ error: 'event required' }, { status: 400 })

  const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (POSTHOG_KEY && user) {
    // Fire PostHog server-side event
    const phPayload = {
      api_key: POSTHOG_KEY,
      event,
      distinct_id: user.id,
      properties: {
        ...properties,
        $current_url: properties.url || '',
        timestamp: new Date().toISOString(),
      },
    }
    fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(phPayload),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
