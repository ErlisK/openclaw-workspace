import { gateway } from '@ai-sdk/gateway'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { streamMetrics } = body as {
    streamMetrics: Array<{ name: string; net: number; hours: number; effectiveRate: number }>
  }

  if (!streamMetrics || streamMetrics.length === 0) {
    return NextResponse.json({ insights: [] })
  }

  const prompt = `You are an ROI advisor for a freelancer with multiple income streams. 
Based on their income data for the last 30 days:
${JSON.stringify(streamMetrics, null, 2)}

Give 2-3 specific, actionable recommendations to increase their effective hourly rate. 
Be concise, data-driven, and direct. Focus on real behavioral changes.
Format your response as a JSON array of objects with fields: insight (what the data shows), action (what to do), impact (expected result).
Respond ONLY with the JSON array, no other text.`

  try {
    const { text } = await generateText({
      model: gateway('anthropic/claude-haiku-4-5'),
      prompt,
      maxOutputTokens: 600,
    })

    let insights
    try {
      insights = JSON.parse(text)
    } catch {
      // Fallback if model adds text around JSON
      const match = text.match(/\[[\s\S]*\]/)
      insights = match ? JSON.parse(match[0]) : []
    }

    return NextResponse.json({ insights })
  } catch (err) {
    console.error('AI insights error:', err)
    return NextResponse.json({ insights: [], error: 'AI unavailable' }, { status: 200 })
  }
}
