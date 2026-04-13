/**
 * POST /api/rfp/enhance
 * AI-powered RFP enhancement: takes heuristic-parsed RFP data and enriches it
 * with AI analysis (win strategy, key insights, red flags, competitive angle).
 * Uses Vercel AI Gateway — no API keys required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateObject } from 'ai'
import { defaultModel } from '@/lib/ai-gateway'
import { z } from 'zod'

const EnhancedRFPSchema = z.object({
  win_strategy: z.string().describe('3-5 sentence strategy for winning this grant'),
  key_differentiators: z.array(z.string()).describe('Top 3-5 things applicants should emphasize'),
  red_flags: z.array(z.string()).describe('Potential pitfalls or tricky requirements to watch'),
  funder_priorities: z.array(z.string()).describe('Inferred funder priorities from the RFP language'),
  recommended_tone: z.enum(['formal', 'conversational', 'data-driven', 'community-focused', 'outcomes-focused']),
  estimated_competition: z.enum(['low', 'medium', 'high', 'unknown']),
  win_probability_factors: z.object({
    positive: z.array(z.string()).describe('Factors that could increase win probability'),
    negative: z.array(z.string()).describe('Factors that could decrease win probability'),
  }),
  section_tips: z.array(z.object({
    section: z.string(),
    tip: z.string(),
  })).describe('Specific writing tips for key sections'),
  executive_summary_hook: z.string().describe('Suggested opening hook for the executive summary (1-2 sentences)'),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const { rfp_document_id, org_context } = body

    if (!rfp_document_id) return NextResponse.json({ error: 'rfp_document_id required' }, { status: 400 })

    // Get org
    const { data: member } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    // Load RFP data
    const { data: rfp } = await admin
      .from('rfp_documents')
      .select('*, rfp_requirements(*)')
      .eq('id', rfp_document_id)
      .single()
    if (!rfp) return NextResponse.json({ error: 'RFP not found' }, { status: 404 })

    // Load org context if not provided
    let orgContext = org_context
    if (!orgContext) {
      const { data: org } = await admin
        .from('organizations')
        .select('name, org_type, annual_budget_usd, grant_focus_areas, funder_types, city, state')
        .eq('id', member.organization_id)
        .single()
      orgContext = org
    }

    const parsed = rfp.parsed_data || {}

    const prompt = `You are an expert grant consultant analyzing an RFP to help a nonprofit organization win funding.

## RFP Details
**Title:** ${rfp.title || 'Unknown'}
**Funder:** ${rfp.funder_name || 'Unknown'}
**Program:** ${rfp.program_name || 'Unknown'}
**Max Award:** ${parsed.max_award_usd ? `$${parsed.max_award_usd.toLocaleString()}` : 'Unknown'}
**Deadline:** ${rfp.deadline || 'Unknown'}
**CFDA Number:** ${rfp.cfda_number || 'N/A'}

## Required Sections
${(rfp.rfp_requirements || []).slice(0, 10).map((r: { title: string; description: string | null; word_limit: number | null; scoring_points: number | null }) => 
  `- ${r.title}${r.word_limit ? ` (${r.word_limit} words)` : ''}${r.scoring_points ? ` [${r.scoring_points} pts]` : ''}${r.description ? `: ${r.description}` : ''}`
).join('\n')}

## Scoring Rubric
${(parsed.scoring_rubric || []).slice(0, 8).map((s: { criterion: string; points: number }) => `- ${s.criterion}: ${s.points} pts`).join('\n') || 'Not specified'}

## Eligibility
${(parsed.eligibility || []).slice(0, 5).join(', ') || 'Not specified'}

## Applicant Organization
${orgContext ? `
- Name: ${orgContext.name || 'Unknown'}
- Type: ${orgContext.org_type || 'Nonprofit'}
- Annual Budget: ${orgContext.annual_budget_usd ? `$${orgContext.annual_budget_usd.toLocaleString()}` : 'Unknown'}
- Focus Areas: ${(orgContext.grant_focus_areas || []).join(', ') || 'Not specified'}
- Location: ${[orgContext.city, orgContext.state].filter(Boolean).join(', ') || 'Unknown'}
` : 'Not specified'}

## RFP Key Excerpts
${JSON.stringify(parsed.raw_snippets || {}).slice(0, 2000)}

Analyze this RFP and provide strategic guidance for winning this grant.`

    const { object: enhancement } = await generateObject({
      model: defaultModel,
      schema: EnhancedRFPSchema,
      prompt,
    })

    // Save enhancement to rfp_documents
    await admin.from('rfp_documents')
      .update({
        parsed_data: {
          ...parsed,
          ai_enhancement: enhancement,
          ai_enhanced_at: new Date().toISOString(),
        }
      })
      .eq('id', rfp_document_id)

    return NextResponse.json({
      rfp_id: rfp_document_id,
      enhancement,
    })

  } catch (err) {
    console.error('RFP enhance error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
