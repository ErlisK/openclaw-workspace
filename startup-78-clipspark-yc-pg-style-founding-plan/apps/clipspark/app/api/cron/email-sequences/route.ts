import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { WELCOME_SEQUENCE, sendEmail, scheduleWelcomeSequence } from '@/lib/email-sequences'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results: Array<{ user_id: string; step: number; status: string; error?: string }> = []
  const newSequences: string[] = []

  // ── 1. Schedule welcome sequences for new users that don't have one yet ──
  const { data: newUsers } = await supabase
    .from('users')
    .select('id, email, full_name, creator_segment, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()) // last 24h
    .eq('onboarding_done', false)

  for (const u of (newUsers || [])) {
    // Check if sequence already exists
    const { count } = await supabase
      .from('email_sequences')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .eq('sequence_name', 'welcome')

    if ((count || 0) === 0) {
      await scheduleWelcomeSequence(supabase as Parameters<typeof scheduleWelcomeSequence>[0], u.id, new Date(u.created_at))
      newSequences.push(u.id)
    }
  }

  // ── 2. Send due emails ───────────────────────────────────────────────────
  const { data: dueEmails } = await supabase
    .from('email_sequences')
    .select(`
      id, user_id, sequence_name, step_index,
      users!inner(email, full_name, creator_segment)
    `)
    .lte('scheduled_at', new Date().toISOString())
    .is('sent_at', null)
    .is('skipped_at', null)
    .limit(50)

  for (const item of (dueEmails || [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (item as any).users
    if (!user?.email) continue

    // Get the right sequence + step
    let subject = ''
    let body = ''

    if (item.sequence_name === 'welcome') {
      const step = WELCOME_SEQUENCE.find(s => s.step_index === item.step_index)
      if (!step) {
        await supabase.from('email_sequences')
          .update({ skipped_at: new Date().toISOString() })
          .eq('id', item.id)
        continue
      }

      const firstName = user.full_name?.split(' ')[0] || ''
      subject = step.subject
      body = step.template({
        first_name: firstName,
        creator_segment: user.creator_segment,
        email: user.email,
      })
    } else {
      // Unknown sequence — skip
      await supabase.from('email_sequences')
        .update({ skipped_at: new Date().toISOString() })
        .eq('id', item.id)
      continue
    }

    const { message_id, error } = await sendEmail({
      to: user.email,
      subject,
      body,
    })

    if (error) {
      results.push({ user_id: item.user_id, step: item.step_index, status: 'error', error })
      // Mark as skipped after failed send to avoid retry loops
      await supabase.from('email_sequences')
        .update({ skipped_at: new Date().toISOString() })
        .eq('id', item.id)
    } else {
      await supabase.from('email_sequences')
        .update({ sent_at: new Date().toISOString(), message_id })
        .eq('id', item.id)
      results.push({ user_id: item.user_id, step: item.step_index, status: 'sent' })
    }
  }

  return NextResponse.json({
    new_sequences_scheduled: newSequences.length,
    emails_processed: results.length,
    sent: results.filter(r => r.status === 'sent').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { count: pending } = await supabase
    .from('email_sequences')
    .select('id', { count: 'exact', head: true })
    .lte('scheduled_at', new Date().toISOString())
    .is('sent_at', null)
    .is('skipped_at', null)

  const { count: total_sent } = await supabase
    .from('email_sequences')
    .select('id', { count: 'exact', head: true })
    .not('sent_at', 'is', null)

  return NextResponse.json({ pending_emails: pending || 0, total_sent: total_sent || 0 })
}
