import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/performance/weights — compute adjusted heuristic weights from performance data
// Returns the v0.2 weights tuned by opt-in performance signals
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Base v0.2 weights
  const baseWeights = {
    hook_score:     0.30,
    emotion_score:  0.20,
    density_score:  0.15,
    structure_score: 0.15,
    duration_score:  0.10,
    position_score:  0.10,
  }

  // Fetch clip performance data for this user (opt-in data)
  const { data: perfData } = await supabase
    .from('clip_performance')
    .select(`
      clip_id, views, completion_rate, likes, impressions,
      clip_outputs!inner(heuristic_score, heuristic_signals, template_id, platform)
    `)
    .eq('user_id', user.id)
    .not('views', 'is', null)
    .limit(200)

  // Also fetch global aggregate data (from all opt-in users)
  const { data: globalPerf } = await supabase
    .from('clip_performance')
    .select(`
      clip_id, views, completion_rate,
      clip_outputs!inner(heuristic_signals)
    `)
    .not('views', 'is', null)
    .gt('views', 100)
    .limit(500)

  const allData = [...(perfData || []), ...(globalPerf || [])]

  // If insufficient data, return base weights
  if (allData.length < 5) {
    return NextResponse.json({
      weights: baseWeights,
      data_points: 0,
      tuned: false,
      message: 'Not enough performance data yet. Using base weights.',
      version: 'v0.2',
    })
  }

  // Compute signal-performance correlations
  // For each clip with both signals + performance data, compute pseudo-correlation
  type SignalKey = keyof typeof baseWeights
  const signalCorr: Record<string, { sumXY: number; sumX: number; sumY: number; sumX2: number; n: number }> = {}

  for (const key of Object.keys(baseWeights) as SignalKey[]) {
    signalCorr[key] = { sumXY: 0, sumX: 0, sumY: 0, sumX2: 0, n: 0 }
  }

  for (const entry of allData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clip = (entry as any).clip_outputs
    if (!clip) continue

    // Parse heuristic signals
    let signals: Record<string, number> = {}
    if (clip.heuristic_signals) {
      if (typeof clip.heuristic_signals === 'string') {
        try { signals = JSON.parse(clip.heuristic_signals) } catch { continue }
      } else if (Array.isArray(clip.heuristic_signals)) {
        // Array format from the DB
        for (const sig of clip.heuristic_signals) {
          if (typeof sig === 'object' && sig.key) signals[sig.key] = sig.value || 0
        }
      } else {
        signals = clip.heuristic_signals as Record<string, number>
      }
    }

    // Normalize views (log scale)
    const views = Number(entry.views) || 0
    const completion = Number(entry.completion_rate) || 0
    // Combined outcome score: weighted views + completion
    const outcome = Math.log10(Math.max(1, views)) * 0.6 + completion * 0.4

    // Map DB signal keys to our scoring keys
    const signalMap: Record<string, string> = {
      hook_words: 'hook_score',
      energy: 'emotion_score',
      question: 'emotion_score',
      story: 'emotion_score',
      contrast: 'density_score',
      numbers: 'density_score',
      pause: 'structure_score',
    }

    for (const [rawKey, mappedKey] of Object.entries(signalMap)) {
      if (!(mappedKey in signalCorr)) continue
      const x = signals[rawKey] || 0
      const y = outcome
      signalCorr[mappedKey].sumXY += x * y
      signalCorr[mappedKey].sumX += x
      signalCorr[mappedKey].sumY += y
      signalCorr[mappedKey].sumX2 += x * x
      signalCorr[mappedKey].n++
    }
  }

  // Compute Pearson-like correlation for each signal
  const correlations: Record<string, number> = {}
  for (const [key, c] of Object.entries(signalCorr)) {
    if (c.n < 3) {
      correlations[key] = baseWeights[key as SignalKey]
      continue
    }
    const n = c.n
    const num = n * c.sumXY - c.sumX * c.sumY
    const den = Math.sqrt(
      (n * c.sumX2 - c.sumX * c.sumX) * (n * c.n - c.sumY * c.sumY)
    )
    correlations[key] = den === 0 ? 0 : Math.max(0, num / den)
  }

  // Convert correlations to weights (normalize to sum=1, blend with base weights)
  const corrSum = Object.values(correlations).reduce((a, b) => a + b, 0)
  const tunedWeights: Record<string, number> = {}

  for (const key of Object.keys(baseWeights) as SignalKey[]) {
    if (corrSum > 0) {
      const corrWeight = correlations[key] / corrSum
      // 40% tuned + 60% base to avoid overfitting with small samples
      const blend = allData.length >= 50 ? 0.4 : allData.length >= 20 ? 0.25 : 0.1
      tunedWeights[key] = (baseWeights[key] * (1 - blend)) + (corrWeight * blend)
    } else {
      tunedWeights[key] = baseWeights[key]
    }
  }

  // Re-normalize so weights sum to ~1
  const totalWeight = Object.values(tunedWeights).reduce((a, b) => a + b, 0)
  for (const key of Object.keys(tunedWeights)) {
    tunedWeights[key] = Math.round((tunedWeights[key] / totalWeight) * 1000) / 1000
  }

  // Compute top performing templates
  const { data: templatePerf } = await supabase
    .from('v_template_signal_performance')
    .select('*')
    .order('avg_views', { ascending: false })
    .limit(10)

  // Compute insights
  const insights: string[] = []
  for (const [key, w] of Object.entries(tunedWeights)) {
    const base = baseWeights[key as SignalKey]
    if (w > base * 1.15) insights.push(`${key} is outperforming baseline (+${Math.round((w/base - 1)*100)}%)`)
    if (w < base * 0.85) insights.push(`${key} is underperforming baseline (-${Math.round((1 - w/base)*100)}%)`)
  }

  return NextResponse.json({
    weights: tunedWeights,
    base_weights: baseWeights,
    data_points: allData.length,
    tuned: true,
    insights,
    top_templates: templatePerf || [],
    version: 'v0.2',
    last_computed: new Date().toISOString(),
  })
}
