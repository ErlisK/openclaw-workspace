/**
 * POST /api/user/complete-onboarding
 * Sets onboarding_completed = true for the current user.
 * Called when the user skips onboarding or completes the flow.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  captureServerEvent(user.id, 'onboarding_completed', {
    funnel: 'activation',
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
