import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const {
    name, slug, domain, industry, company_size, hires_per_year,
    primary_trades, primary_regions, plan, billing_email,
    owner_email, ats_integration,
  } = body

  if (!name || !plan || !billing_email) {
    return NextResponse.json({ error: 'name, plan, and billing_email required' }, { status: 400 })
  }

  const planPrices: Record<string, number> = {
    free: 0, starter: 14900, professional: 0, enterprise: 59900
  }

  // Get or create owner profile
  let ownerProfileId = null
  if (owner_email) {
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('email', owner_email).single()
    ownerProfileId = profile?.id
  }

  const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  const { data: org, error } = await supabase
    .from('orgs')
    .insert({
      name, slug: orgSlug, domain, industry, company_size,
      hires_per_year: hires_per_year || 0,
      primary_trades: primary_trades || [],
      primary_regions: primary_regions || [],
      plan: plan || 'free',
      plan_price_monthly: planPrices[plan] || 0,
      plan_started_at: plan !== 'free' ? new Date().toISOString() : null,
      billing_email,
      owner_profile_id: ownerProfileId,
      ats_integration,
      onboarding_completed: false,
      onboarding_step: 'team_setup',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create payment record for paid plans
  if (plan !== 'free' && plan !== 'professional') {
    await supabase.from('payments').insert({
      org_id: org.id,
      payment_type: 'subscription',
      status: 'pending',
      amount_cents: planPrices[plan],
      description: `CertClip ${plan.charAt(0).toUpperCase() + plan.slice(1)} — Setup`,
      metadata: { plan, org_name: name },
    })
  }

  return NextResponse.json({ org })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  let query = supabase.from('orgs').select(`
    id, name, slug, domain, industry, company_size, hires_per_year,
    primary_trades, primary_regions, plan, plan_price_monthly, plan_started_at,
    billing_email, onboarding_completed, onboarding_step, api_key,
    owner:profiles!orgs_owner_profile_id_fkey(full_name, email)
  `)

  if (slug) query = query.eq('slug', slug)
  const { data, error } = await query.limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(slug ? data?.[0] : data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { org_id, ...updates } = body
  if (!org_id) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('orgs').update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', org_id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ org: data })
}
