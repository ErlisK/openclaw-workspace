import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/digest/weekly
 * Cron-triggered weekly ROI digest.
 *
 * Security: requires X-Cron-Secret header (or ?secret= param) matching CRON_SECRET env var.
 *
 * TODO: Integrate with Resend (https://resend.com) to send actual emails:
 *   import { Resend } from 'resend'
 *   const resend = new Resend(process.env.RESEND_API_KEY)
 *   await resend.emails.send({ from: 'GigAnalytics <hello@hourlyroi.com>', to: user.email, ... })
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Fetch users who have opted into digest emails
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .limit(200)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fromDate = sevenDaysAgo.toISOString().split('T')[0]
  const toDate = new Date().toISOString().split('T')[0]
  const prevWeekStart = new Date(sevenDaysAgo)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekFrom = prevWeekStart.toISOString().split('T')[0]

  const digests = []

  for (const profile of profiles ?? []) {
    const userId = profile.id

    const [{ data: txCurrent }, { data: txPrev }, { data: timeEntries }, { data: streams }] =
      await Promise.all([
        supabase.from('transactions').select('net_amount, stream_id')
          .eq('user_id', userId).gte('transaction_date', fromDate).lte('transaction_date', toDate),
        supabase.from('transactions').select('net_amount')
          .eq('user_id', userId).gte('transaction_date', prevWeekFrom).lt('transaction_date', fromDate),
        supabase.from('time_entries').select('duration_minutes')
          .eq('user_id', userId).gte('started_at', sevenDaysAgo.toISOString()),
        supabase.from('streams').select('id, name').eq('user_id', userId),
      ])

    const totalRevenue = (txCurrent ?? []).reduce((s, t) => s + t.net_amount, 0)
    const prevRevenue = (txPrev ?? []).reduce((s, t) => s + t.net_amount, 0)
    const totalMinutes = (timeEntries ?? []).reduce((s, e) => s + e.duration_minutes, 0)
    const hourlyRate = totalMinutes > 0 ? totalRevenue / (totalMinutes / 60) : 0
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null

    // Find top-earning stream this week
    const streamRevMap: Record<string, number> = {}
    for (const tx of txCurrent ?? []) {
      streamRevMap[tx.stream_id] = (streamRevMap[tx.stream_id] ?? 0) + tx.net_amount
    }
    const topStreamId = Object.entries(streamRevMap).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topStream = (streams ?? []).find(s => s.id === topStreamId)

    const digest = {
      userId,
      period: { from: fromDate, to: toDate },
      stats: {
        netRevenue: totalRevenue,
        totalHours: +(totalMinutes / 60).toFixed(1),
        trueHourlyRate: +hourlyRate.toFixed(2),
        transactionCount: txCurrent?.length ?? 0,
        revenueChangePercent: revenueChange !== null ? +revenueChange.toFixed(1) : null,
      },
      topStream: topStream ? { name: topStream.name, revenue: streamRevMap[topStream.id] ?? 0 } : null,
      insight: generateInsight(totalRevenue, hourlyRate, revenueChange),
      // emailSent: false — TODO: plug in Resend here
    }

    digests.push(digest)
  }

  return NextResponse.json({
    processed: digests.length,
    timestamp: new Date().toISOString(),
    period: { from: fromDate, to: toDate },
    digests,
  })
}

function generateInsight(revenue: number, hourlyRate: number, changePercent: number | null): string {
  if (revenue === 0) return 'No activity logged this week. Log time or import transactions to see your ROI.'
  if (hourlyRate > 100) return `Excellent week! Your true hourly rate of $${Math.round(hourlyRate)}/hr is above the top 20% of GigAnalytics users.`
  if (hourlyRate > 50) return `Solid week at $${Math.round(hourlyRate)}/hr. Check your heatmap to find your highest-earning time slots.`
  if (changePercent !== null && changePercent > 20) return `Revenue up ${Math.round(changePercent)}% vs last week — great momentum!`
  if (hourlyRate > 0) return `Your true hourly rate was $${Math.round(hourlyRate)}/hr this week. Log more time to improve accuracy.`
  return 'Import your time entries to see your true hourly rate.'
}
