import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  const tables = ['research_snippets', 'comp_matrix', 'search_intent']
  const counts: Record<string, number> = {}

  for (const table of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'count=exact',
        'Range': '0-0',
      },
    })
    const cr = res.headers.get('Content-Range') || '0/0'
    counts[table] = parseInt(cr.split('/')[1] || '0')
  }

  // Theme frequency from research_snippets
  const snippetsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/research_snippets?select=theme_tags&limit=1000`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    }
  )
  const snippets = await snippetsRes.json()
  const themeFreq: Record<string, number> = {}
  for (const row of snippets) {
    for (const tag of (row.theme_tags || [])) {
      themeFreq[tag] = (themeFreq[tag] || 0) + 1
    }
  }
  const topThemes = Object.entries(themeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => ({ tag, count }))

  // Sentiment distribution
  const sentimentRes = await fetch(
    `${SUPABASE_URL}/rest/v1/research_snippets?select=sentiment&limit=1000`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    }
  )
  const sentimentData = await sentimentRes.json()
  const sentimentFreq: Record<string, number> = {}
  for (const row of sentimentData) {
    const s = row.sentiment || 'unknown'
    sentimentFreq[s] = (sentimentFreq[s] || 0) + 1
  }

  return NextResponse.json({ counts, topThemes, sentimentFreq })
}
