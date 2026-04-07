import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const {
    email, full_name, company_name, company_size, role,
    plan_selected, plan_price_monthly, plan_price_per_assessment,
    monthly_assessments_estimate,
    trades, regions,
    top_use_case, biggest_pain, current_solution,
    signed_loi, loi_terms_accepted, notes,
    utm_source, utm_campaign,
  } = body

  if (!email || !plan_selected) {
    return NextResponse.json({ error: 'email and plan_selected required' }, { status: 400 })
  }

  // Calculate monthly cost estimate based on plan
  let monthly_cost_estimate = plan_price_monthly || 0
  if (monthly_assessments_estimate && plan_price_per_assessment) {
    monthly_cost_estimate += monthly_assessments_estimate * plan_price_per_assessment
  }

  const { data, error } = await supabase
    .from('pricing_responses')
    .insert({
      email, full_name, company_name, company_size, role,
      plan_selected, plan_price_monthly, plan_price_per_assessment,
      monthly_assessments_estimate,
      monthly_cost_estimate,
      trades: trades || [],
      regions: regions || [],
      top_use_case, biggest_pain, current_solution,
      signed_loi: signed_loi || false,
      loi_terms_accepted: loi_terms_accepted || false,
      notes,
      utm_source, utm_campaign,
      referral_source: utm_source || 'pricing_page',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id, monthly_cost_estimate })
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pricing_responses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
