/**
 * POST /api/grants/discover
 * AI-powered grant discovery: given org profile, suggests matching grant opportunities
 * with reasoning and fit scores. Uses Vercel AI Gateway.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateObject } from 'ai'
import { defaultModel } from '@/lib/ai-gateway'
import { z } from 'zod'
import { trackServer } from '@/lib/analytics.server'

export const maxDuration = 60

const DiscoveryResultSchema = z.object({
  matches: z.array(z.object({
    funder_name: z.string(),
    program_name: z.string(),
    funder_type: z.enum(['federal', 'state', 'foundation', 'community', 'corporate', 'municipal']),
    estimated_award_min: z.number().nullable(),
    estimated_award_max: z.number().nullable(),
    fit_score: z.number().min(0).max(100),
    fit_grade: z.enum(['A', 'B', 'C', 'D']),
    why_good_fit: z.string().describe('2-3 sentences on why this is a strong match'),
    eligibility_notes: z.string().describe('Key eligibility factors to verify'),
    typical_deadline_window: z.string().describe('e.g. "Rolling" or "March-April annually"'),
    cfda_number: z.string().nullable().describe('CFDA number for federal grants, null otherwise'),
    where_to_apply: z.string().describe('URL or portal name where to find/apply'),
    action_items: z.array(z.string()).describe('3-5 specific steps to pursue this grant'),
    competition_level: z.enum(['low', 'medium', 'high', 'unknown']),
    previous_award_size: z.string().nullable().describe('Typical award size based on historical data'),
  })),
  search_strategy: z.string().describe('Overall grant seeking strategy recommendation for this org'),
  pipeline_health: z.object({
    recommended_funders_count: z.number(),
    diversification_advice: z.string(),
    timeline_advice: z.string(),
  }),
  focus_areas_identified: z.array(z.string()).describe('Key programmatic focus areas to emphasize in applications'),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const {
      org_id,
      focus_areas,
      budget_range,
      location,
      grant_types = ['federal', 'foundation', 'state'],
      max_results = 10,
      exclude_funders = [],
    } = body

    // Get org
    const { data: member } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    const orgId = org_id || member.organization_id

    // Load org profile
    const { data: org } = await admin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    // Load existing applications to avoid duplicates
    const { data: existingApps } = await admin
      .from('grant_applications')
      .select('funder_name, program_name')
      .eq('organization_id', orgId)
      .limit(20)

    const existingFunders = existingApps?.map(a => a.funder_name).filter(Boolean) || []

    const effectiveFocusAreas = focus_areas || org.grant_focus_areas || []
    const effectiveLocation = location || [org.city, org.state].filter(Boolean).join(', ')
    const effectiveBudget = budget_range || org.annual_budget_usd

    const prompt = `You are an expert grant researcher helping a nonprofit find matching grant opportunities.

## Organization Profile
- **Name:** ${org.name || 'Unknown Organization'}
- **Type:** ${org.org_type || 'Nonprofit 501(c)(3)'}
- **Annual Budget:** ${effectiveBudget ? `$${Number(effectiveBudget).toLocaleString()}` : 'Not specified'}
- **Focus Areas:** ${effectiveFocusAreas.join(', ') || 'Not specified'}
- **Location:** ${effectiveLocation || 'Not specified'}
- **EIN:** ${org.ein ? 'Yes (verified)' : 'Not provided'}
- **Funder Experience:** ${(org.funder_types || []).join(', ') || 'Not specified'}

## Search Parameters
- **Grant Types to Search:** ${grant_types.join(', ')}
- **Max Results:** ${max_results}
- **Already Applied To:** ${[...existingFunders, ...exclude_funders].join(', ') || 'None'}

## Instructions
Identify ${max_results} real, specific grant programs that this organization should pursue.
Focus on:
1. Programs where the org's budget/size/focus areas match eligibility
2. Funders known to support organizations like this one
3. Mix of grant types (${grant_types.join(', ')}) for portfolio diversification
4. Both competitive grants and less-known programs with lower competition

For federal grants, use real CFDA/Assistance Listing numbers.
For foundations, use real program names from major foundations.
Be specific and actionable — not generic categories.
Do NOT suggest funders already listed in "Already Applied To".`

    const { object: discovery } = await generateObject({
      model: defaultModel,
      schema: DiscoveryResultSchema,
      prompt,
    })

    // Save discovery results to a grants_discovery table or return directly
    // Also log this as a usage event
    trackServer('grants_discovered', user.id, orgId, {
      results_count: discovery.matches.length,
      grant_types: grant_types,
      focus_areas: effectiveFocusAreas,
    }).catch(() => {})

    return NextResponse.json({
      organization_id: orgId,
      discovery,
      generated_at: new Date().toISOString(),
    })

  } catch (err) {
    console.error('Grant discovery error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Quick org-profile-based discovery with GET params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ message: 'Use POST with org profile to discover matching grants' })
}
