import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTier, proRequiredResponse } from '@/lib/pro/gate'

// GET /api/benchmark — fetch benchmark data + user opt-in status
// Returns: synthetic + real aggregate snapshots visible to all users
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Pro gate — benchmark access requires Pro
  const { isPro } = await getUserTier(supabase, user.id)
  if (!isPro) return proRequiredResponse('benchmark')

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') ?? undefined
  const platform = searchParams.get('platform') ?? undefined

  // Fetch benchmark snapshots (aggregate + synthetic, no PII)
  let query = supabase
    .from('benchmark_snapshots')
    .select('snapshot_month, service_category, platform, p25_hourly_rate, p50_hourly_rate, p75_hourly_rate, p90_hourly_rate, sample_size, is_synthetic')
    .is('user_id', null)  // aggregate rows have no user_id
    .order('snapshot_month', { ascending: false })
    .limit(200)

  if (category) query = query.eq('service_category', category)
  if (platform) query = query.eq('platform', platform)

  const { data: snapshots } = await query

  // Fetch user's opt-in status
  const { data: optIn } = await supabase
    .from('benchmark_opt_ins')
    .select('opted_in, service_category, consent_version')
    .eq('user_id', user.id)
    .single()

  // User's own percentile for current month (if opted in and has data)
  let userPercentile: { percentile: number; rate: number; category: string } | null = null
  if (optIn?.opted_in) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const { data: userSnap } = await supabase
      .from('benchmark_snapshots')
      .select('user_percentile, user_effective_rate, service_category')
      .eq('user_id', user.id)
      .gte('snapshot_month', monthStart)
      .order('snapshot_month', { ascending: false })
      .limit(1)
      .single()

    if (userSnap?.user_percentile) {
      userPercentile = {
        percentile: userSnap.user_percentile,
        rate: userSnap.user_effective_rate,
        category: userSnap.service_category,
      }
    }
  }

  return NextResponse.json({
    snapshots: snapshots ?? [],
    optIn: optIn ?? { opted_in: false },
    userPercentile,
    categories: Array.from(new Set((snapshots ?? []).map(s => s.service_category))).sort(),
    platforms: Array.from(new Set((snapshots ?? []).map(s => s.platform))).sort(),
  })
}

// POST /api/benchmark — update opt-in status
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Pro gate — benchmark opt-in requires Pro
  const { isPro } = await getUserTier(supabase, user.id)
  if (!isPro) return proRequiredResponse('benchmark')

  const body = await request.json()
  const { optedIn, serviceCategory } = body as { optedIn: boolean; serviceCategory?: string }

  const { data, error } = await supabase
    .from('benchmark_opt_ins')
    .upsert({
      user_id: user.id,
      opted_in: optedIn,
      service_category: serviceCategory ?? 'general',
      consent_version: '1.0',
    }, { onConflict: 'user_id' })
    .select('opted_in, service_category')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, optedIn: data.opted_in })
}
