/**
 * POST /api/ai/win-score
 * AI-powered grant win probability scoring.
 * Analyzes org-RFP fit and returns a win score with reasoning.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateObject } from 'ai'
import { defaultModel } from '@/lib/ai-gateway'
import { z } from 'zod'

const WinScoreSchema = z.object({
  score: z.number().min(0).max(100).describe('Win probability score 0-100'),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']).describe('Letter grade'),
  confidence: z.enum(['high', 'medium', 'low']),
  summary: z.string().describe('2-3 sentence summary of the assessment'),
  strengths: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    detail: z.string(),
  })).describe('Factors that increase win probability'),
  weaknesses: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    detail: z.string(),
    mitigation: z.string(),
  })).describe('Factors that decrease win probability'),
  critical_gaps: z.array(z.string()).describe('Must-fix issues before submitting'),
  recommended_actions: z.array(z.string()).describe('Top 3-5 actions to improve win probability'),
  comparable_funded_orgs: z.string().describe('Description of the typical type of organization that wins this type of grant'),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const { application_id, rfp_document_id } = body

    if (!application_id && !rfp_document_id) {
      return NextResponse.json({ error: 'application_id or rfp_document_id required' }, { status: 400 })
    }

    // Get org
    const { data: member } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    // Load org
    const { data: org } = await admin
      .from('organizations')
      .select('*')
      .eq('id', member.organization_id)
      .single()

    // Load application + RFP
    let app = null
    let rfp = null

    if (application_id) {
      const { data } = await admin
        .from('grant_applications')
        .select('*, rfp_documents(*)')
        .eq('id', application_id)
        .single()
      app = data
      rfp = data?.rfp_documents
    }

    if (!rfp && rfp_document_id) {
      const { data } = await admin.from('rfp_documents').select('*').eq('id', rfp_document_id).single()
      rfp = data
    }

    const parsed = rfp?.parsed_data || {}

    const prompt = `You are an expert grant consultant assessing the win probability for a grant application.

## Grant Opportunity
- **Funder:** ${rfp?.funder_name || 'Unknown'}
- **Program:** ${rfp?.program_name || 'Unknown'}
- **Max Award:** ${parsed.max_award_usd ? `$${parsed.max_award_usd.toLocaleString()}` : 'Unknown'}
- **CFDA:** ${rfp?.cfda_number || 'N/A'}
- **Eligibility Requirements:** ${(parsed.eligibility || []).join(', ') || 'Not specified'}
- **Ineligible:** ${(parsed.ineligible || []).join(', ') || 'Not specified'}
- **Scoring Rubric:** ${(parsed.scoring_rubric || []).map((s: { criterion: string; points: number }) => `${s.criterion} (${s.points} pts)`).join(', ') || 'Not specified'}
- **Period of Performance:** ${parsed.period_of_performance_months ? `${parsed.period_of_performance_months} months` : 'Unknown'}
- **Matching Required:** ${parsed.matching_required ? `Yes (${parsed.matching_pct || '?'}%)` : 'No'}

## Applicant Organization
- **Name:** ${org?.name || 'Unknown'}
- **Type:** ${org?.org_type || 'Nonprofit'}
- **Annual Budget:** ${org?.annual_budget_usd ? `$${org.annual_budget_usd.toLocaleString()}` : 'Unknown'}
- **Focus Areas:** ${(org?.grant_focus_areas || []).join(', ') || 'Not specified'}
- **Funder Types Experience:** ${(org?.funder_types || []).join(', ') || 'Not specified'}
- **Location:** ${[org?.city, org?.state].filter(Boolean).join(', ') || 'Unknown'}
- **EIN:** ${org?.ein ? 'Yes' : 'Not provided'}

## Application Status
- **Status:** ${app?.status || 'N/A'}
- **Amount Requested:** ${app?.ask_amount_usd ? `$${app.ask_amount_usd.toLocaleString()}` : 'Not set'}

Assess the win probability for this organization on this grant opportunity. Be realistic and specific.`

    const { object: winScore } = await generateObject({
      model: defaultModel,
      schema: WinScoreSchema,
      prompt,
    })

    // Save win score to application
    if (application_id) {
      await admin.from('grant_applications')
        .update({
          win_score: winScore.score,
          win_score_data: winScore,
          win_score_updated_at: new Date().toISOString(),
        })
        .eq('id', application_id)
        .catch(console.error)
    }

    return NextResponse.json({
      application_id: application_id || null,
      rfp_id: rfp_document_id || rfp?.id || null,
      win_score: winScore,
    })

  } catch (err) {
    console.error('Win score error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
