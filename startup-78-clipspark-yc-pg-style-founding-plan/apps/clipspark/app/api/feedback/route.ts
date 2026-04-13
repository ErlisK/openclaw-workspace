import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

// POST /api/feedback — store feedback + send to PostHog
export async function POST(request: Request) {
  const body = await request.json()
  const { type, message, email, context, clip_id, positive } = body

  // Get user if authenticated (optional for feedback)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  // Store in feedback table
  await svc.from('feedback').insert({
    user_id: user?.id || null,
    type: type || 'general',
    message: message || null,
    email: email || user?.email || null,
    context: context || null,
    clip_id: clip_id || null,
    positive: positive ?? null,
    metadata: { user_agent: request.headers.get('user-agent') },
  }).select()

  // Fire PostHog server event
  if (user?.id) {
    if (type === 'clip_quality' && clip_id != null) {
      await trackServer(user.id, positive ? 'clip_thumbs_up' : 'clip_thumbs_down', {
        clip_id,
        context,
      })
    } else {
      await trackServer(user.id, 'feedback_submitted', {
        feedback_type: type,
        has_message: !!message,
        has_email: !!email,
        context,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
