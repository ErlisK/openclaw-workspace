/**
 * POST /api/v1/survey — submit a CSAT rating + optional follow-up answer
 * GET  /api/v1/survey — analytics summary (all time)
 *
 * Body:
 *   sessionId?  string
 *   csatRating  'good' | 'neutral' | 'bad'
 *   questionKey string   (e.g. 'what_made_it_great')
 *   answer      string   (e.g. 'kid_loved_it')
 *   source?     string   default 'post_export'
 *   properties? object
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const VALID_RATINGS   = new Set(['good', 'neutral', 'bad'])
const VALID_QUESTIONS = new Set([
  'what_made_it_great',   // shown after 'good'
  'what_could_improve',   // shown after 'neutral'
  'what_went_wrong',      // shown after 'bad'
])

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId?: string
      csatRating: string
      questionKey: string
      answer: string
      source?: string
      properties?: Record<string, unknown>
    }

    const { sessionId, csatRating, questionKey, answer, source = 'post_export', properties = {} } = body

    if (!VALID_RATINGS.has(csatRating)) {
      return NextResponse.json({ error: 'invalid csatRating' }, { status: 400 })
    }
    if (questionKey && !VALID_QUESTIONS.has(questionKey)) {
      return NextResponse.json({ error: 'invalid questionKey' }, { status: 400 })
    }
    if (!answer?.trim()) {
      return NextResponse.json({ error: 'answer required' }, { status: 400 })
    }

    const client = sb()

    // Write to survey_responses
    await client.from('survey_responses').insert({
      session_id:   sessionId,
      csat_rating:  csatRating,
      question_key: questionKey,
      answer,
      source,
      properties,
    })

    // Mirror csat_rating to events for cross-funnel queries
    await client.from('events').insert({
      event_name:  'csat_submitted',
      session_id:  sessionId,
      properties: { rating: csatRating, question_key: questionKey, answer, source, ...properties },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const client = sb()

    // Rating distribution
    const { data: ratings } = await client
      .from('survey_responses')
      .select('csat_rating')

    const ratingCounts: Record<string, number> = { good: 0, neutral: 0, bad: 0 }
    for (const row of ratings ?? []) {
      const r = row.csat_rating as string
      ratingCounts[r] = (ratingCounts[r] || 0) + 1
    }
    const total = Object.values(ratingCounts).reduce((s, n) => s + n, 0)
    const goodPct = total > 0 ? Math.round(100 * ratingCounts.good / total) : null

    // Answer distribution by question
    const { data: answers } = await client
      .from('survey_responses')
      .select('question_key, answer')

    const answerMap: Record<string, Record<string, number>> = {}
    for (const row of answers ?? []) {
      const q = row.question_key as string
      const a = row.answer as string
      if (!answerMap[q]) answerMap[q] = {}
      answerMap[q][a] = (answerMap[q][a] || 0) + 1
    }

    // Daily trend (last 7 days)
    const { data: trend } = await client
      .from('survey_responses')
      .select('created_at, csat_rating')
      .gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString())
      .order('created_at')

    const dailyMap: Record<string, Record<string, number>> = {}
    for (const row of trend ?? []) {
      const day = (row.created_at as string).slice(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { good: 0, neutral: 0, bad: 0 }
      const r = row.csat_rating as string
      dailyMap[day][r] = (dailyMap[day][r] || 0) + 1
    }

    return NextResponse.json({
      ok: true,
      summary: {
        total,
        ...ratingCounts,
        goodPct,
        meetsTarget: goodPct !== null && goodPct >= 70,
      },
      answersByQuestion: answerMap,
      dailyTrend: Object.entries(dailyMap).map(([day, counts]) => ({ day, ...counts })),
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
