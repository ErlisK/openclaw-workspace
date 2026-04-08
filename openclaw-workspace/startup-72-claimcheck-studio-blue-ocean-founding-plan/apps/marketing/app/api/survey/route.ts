export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    email, segment, role, orgSize,
    tooCheap, cheap, expensive, tooExpensive,
    currentSpend, variant = 'v1',
  } = body

  if (!tooCheap || !cheap || !expensive || !tooExpensive) {
    return NextResponse.json({ error: 'All four price points required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cc_vw_surveys')
    .insert({
      email: email?.toLowerCase().trim() || null,
      segment: segment || 'other',
      role: role || null,
      org_size: orgSize || null,
      too_cheap: parseInt(tooCheap),
      cheap: parseInt(cheap),
      expensive: parseInt(expensive),
      too_expensive: parseInt(tooExpensive),
      current_spend: currentSpend || null,
      variant,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submitted: true, id: data.id }, { status: 201 })
}

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cc_vw_surveys')
    .select('too_cheap, cheap, expensive, too_expensive, segment, variant, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ n: 0, results: null })

  // Van Westendorp analysis
  const n = data.length
  const prices = [5, 9, 15, 19, 25, 29, 39, 49, 59, 69, 79, 89, 99, 119, 149, 179, 199, 249, 299, 399, 499]

  function cumPct(values: number[], threshold: number, direction: 'above' | 'below') {
    const count = direction === 'above'
      ? values.filter(v => v >= threshold).length
      : values.filter(v => v <= threshold).length
    return count / values.length
  }

  const tooCheapVals  = data.map(r => r.too_cheap)
  const cheapVals     = data.map(r => r.cheap)
  const expensiveVals = data.map(r => r.expensive)
  const tooExpVals    = data.map(r => r.too_expensive)

  // Build curves
  const curves = prices.map(p => ({
    price: p,
    pTooCheap:    cumPct(tooCheapVals, p, 'above'),   // % who say ≤p is too cheap
    pCheap:       cumPct(cheapVals, p, 'above'),       // % who say ≤p is cheap
    pExpensive:   cumPct(expensiveVals, p, 'below'),   // % who say ≥p is expensive
    pTooExpensive:cumPct(tooExpVals, p, 'below'),      // % who say ≥p is too expensive
  }))

  // Find intersections
  let pmcPx = 0, pmePoint = 0, iapLow = 0, iapHigh = 0
  for (let i = 0; i < curves.length - 1; i++) {
    const c = curves[i]
    // PMC: too_cheap crosses cheap (not-cheap)
    if (!pmcPx && c.pTooCheap >= (1 - c.pCheap)) pmcPx = c.price
    // PME: expensive crosses too_expensive
    if (!pmePoint && c.pExpensive >= (1 - c.pTooExpensive)) pmePoint = c.price
    // IAP: cheap crosses expensive
    if (!iapLow && (1 - c.pCheap) >= c.pExpensive) iapLow = c.price
    if ((1 - c.pCheap) >= c.pExpensive) iapHigh = c.price
  }

  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.floor(s.length / 2)]
  }

  return NextResponse.json({
    n,
    medians: {
      tooCheap:    median(tooCheapVals),
      cheap:       median(cheapVals),
      expensive:   median(expensiveVals),
      tooExpensive:median(tooExpVals),
    },
    vanWestendorp: {
      pmcPoint: pmcPx,     // Point of Marginal Cheapness
      pmePoint,            // Point of Marginal Expensiveness
      iapRange: { low: iapLow, high: iapHigh }, // Acceptable Price Range
      recommendedPrice: Math.round((pmcPx + pmePoint) / 2),
    },
    curves: curves.slice(0, 15), // trim for payload size
    bySegment: Object.fromEntries(
      ['pharma','health_media','agency','researcher','hospital','other'].map(seg => [
        seg,
        {
          n: data.filter(r => r.segment === seg).length,
          medExpensive: median(data.filter(r => r.segment === seg).map(r => r.expensive)) || null,
        },
      ])
    ),
  })
}
