import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const formData = await request.formData()
  const streamId = formData.get('streamId') as string
  const channel = formData.get('channel') as string
  const amount = parseFloat(formData.get('amount') as string)
  const periodStart = formData.get('period_start') as string
  const periodEnd = formData.get('period_end') as string

  if (!amount || !channel || !periodStart || !periodEnd) {
    return NextResponse.redirect(new URL('/roi?error=missing_fields', request.url))
  }

  await supabase.from('acquisition_costs').insert({
    user_id: user.id,
    stream_id: streamId || null,
    channel,
    amount,
    period_start: periodStart,
    period_end: periodEnd,
  })

  return NextResponse.redirect(new URL('/roi', request.url))
}
