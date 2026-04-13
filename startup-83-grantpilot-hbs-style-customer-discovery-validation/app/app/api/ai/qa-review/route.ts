/**
 * POST /api/ai/qa-review
 * AI-powered QA review for grant narratives.
 * Complements the heuristic /api/narrative/qa with deep LLM analysis.
 * Uses Vercel AI Gateway — no API keys required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateObject } from 'ai'
import { defaultModel } from '@/lib/ai-gateway'
import { z } from 'zod'
import { trackServer } from '@/lib/analytics.server'

export const maxDuration = 60

const AIQASchema = z.object({
  overall_score: z.number().min(0).max(100),
  overall_grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  ready_for_submission: z.boolean(),
  executive_summary: z.string().describe('2-3 sentence overall assessment'),
  dimensions: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    assessment: z.string(),
    improvement: z.string().nullable(),
  })).describe('Scores across key dimensions: Funder Alignment, Clarity, Evidence, Structure, Compliance'),
  critical_issues: z.array(z.object({
    severity: z.enum(['blocker', 'major', 'minor']),
    issue: z.string(),
    location: z.string().describe('Where in the text this appears'),
    fix: z.string(),
  })),
  strengths: z.array(z.string()).describe('Top 3-5 things done well'),
  specific_edits: z.array(z.object({
    original: z.string().describe('Exact phrase from the text that should change'),
    suggested: z.string().describe('Improved replacement text'),
    reason: z.string(),
  })).describe('Up to 5 specific line-level edit suggestions'),
  funder_alignment_notes: z.string().describe('How well the narrative speaks to the specific funder priorities'),
  win_probability_impact: z.enum(['increases', 'neutral', 'decreases']).describe('Impact of this section on win probability'),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const {
      narrative_id,
      content,
      section_key,
      section_title,
      rfp_document_id,
      application_id,
      funder_type = 'federal',
      funder_name,
      word_limit,
    } = body

    if (!content && !narrative_id) {
      return NextResponse.json({ error: 'content or narrative_id required' }, { status: 400 })
    }

    const { data: member } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })
    const orgId = member.organization_id

    // Load narrative if id given
    let narrativeContent = content
    let narrativeSectionKey = section_key || 'unknown'
    let narrativeSectionTitle = section_title || 'Section'
    let narrativeWordLimit = word_limit
    let appId = application_id

    if (narrative_id) {
      const { data: n } = await admin.from('narratives').select('*').eq('id', narrative_id).single()
      if (n) {
        narrativeContent = content || n.content_md || ''
        narrativeSectionKey = section_key || n.section_key || 'unknown'
        narrativeSectionTitle = section_title || n.section_title || 'Section'
        narrativeWordLimit = word_limit || n.word_limit
        appId = application_id || n.application_id
      }
    }

    if (!narrativeContent || narrativeContent.trim().length < 50) {
      return NextResponse.json({ error: 'Content too short to review' }, { status: 400 })
    }

    // Load RFP context
    let rfpContext = ''
    let funderPriorities: string[] = []
    if (rfp_document_id || appId) {
      const rfpId = rfp_document_id
      let rfp = null
      if (rfpId) {
        const { data } = await admin.from('rfp_documents').select('*').eq('id', rfpId).single()
        rfp = data
      } else if (appId) {
        const { data: app } = await admin.from('grant_applications').select('rfp_document_id').eq('id', appId).single()
        if (app?.rfp_document_id) {
          const { data } = await admin.from('rfp_documents').select('*').eq('id', app.rfp_document_id).single()
          rfp = data
        }
      }
      if (rfp) {
        const parsed = rfp.parsed_data || {}
        funderPriorities = parsed.funder_priorities || []
        rfpContext = `
**Funder:** ${rfp.funder_name || funder_name || 'Unknown'}
**Program:** ${rfp.program_name || 'Unknown'}
**Funder Priorities:** ${funderPriorities.join(', ') || 'Not specified'}
**Scoring Rubric:** ${(parsed.scoring_rubric || []).slice(0, 6).map((s: { criterion: string; points: number }) => `${s.criterion} (${s.points}pts)`).join(', ') || 'Not specified'}
**Section Requirements:** ${(parsed.required_sections || []).find((s: { title?: string; description?: string; word_limit?: number }) => 
  s.title?.toLowerCase().includes(narrativeSectionKey.replace(/_/g, ' ')))?.description || 'Standard requirements'}
`
      }
    }

    const wordCount = narrativeContent.split(/\s+/).length
    const wordLimitNote = narrativeWordLimit
      ? `Word limit: ${narrativeWordLimit} (current: ${wordCount} — ${wordCount > narrativeWordLimit ? `${wordCount - narrativeWordLimit} OVER limit` : `${narrativeWordLimit - wordCount} under limit`})`
      : `Word count: ${wordCount}`

    const prompt = `You are an expert grant writer and quality reviewer with 20+ years of experience helping nonprofits win grants.
Review this grant narrative section and provide detailed, actionable feedback.

## Section Being Reviewed
**Title:** ${narrativeSectionTitle}
**Section Type:** ${narrativeSectionKey}
**Funder Type:** ${funder_type}
**${wordLimitNote}**

## RFP / Funder Context
${rfpContext || `Funder: ${funder_name || 'Unknown'}\nFunder Type: ${funder_type}`}

## Narrative Text to Review
${narrativeContent}

## Review Instructions
Assess across these dimensions:
1. **Funder Alignment** (0-100): Does it speak directly to funder priorities?
2. **Clarity** (0-100): Is it clear, direct, and free of jargon?
3. **Evidence** (0-100): Are claims backed by data, outcomes, and specifics?
4. **Structure** (0-100): Does it flow logically with strong topic sentences?
5. **Compliance** (0-100): Word limits, required elements, proper framing?

Be honest and specific. Identify the most impactful improvements.`

    const { object: qaResult } = await generateObject({
      model: defaultModel,
      schema: AIQASchema,
      prompt,
    })

    // Save AI QA result
    if (narrative_id) {
      await admin.from('qa_runs').insert({
        narrative_id,
        application_id: appId,
        organization_id: orgId,
        user_id: user.id,
        pass_type: 'ai',
        score: qaResult.overall_score,
        grade: qaResult.overall_grade,
        issues: qaResult.critical_issues.map(i => ({
          type: i.severity === 'blocker' ? 'error' : i.severity === 'major' ? 'warning' : 'info',
          code: `AI_${i.severity.toUpperCase()}`,
          message: i.issue,
          location: i.location,
          suggestion: i.fix,
        })),
        strengths: qaResult.strengths.map(s => ({ code: 'AI_STRENGTH', message: s })),
        suggestions: qaResult.specific_edits.map(e => `${e.original} → ${e.suggested} (${e.reason})`),
        model: 'claude-sonnet-4-6',
      }).catch(console.error)

      // Update narrative QA score if AI score is available
      await admin.from('narratives').update({
        qa_status: qaResult.overall_grade,
        qa_score: qaResult.overall_score,
        updated_at: new Date().toISOString(),
      }).eq('id', narrative_id).catch(console.error)
    }

    trackServer('ai_qa_run', user.id, orgId, {
      section_key: narrativeSectionKey,
      score: qaResult.overall_score,
      grade: qaResult.overall_grade,
      ready: qaResult.ready_for_submission,
      application_id: appId || null,
    }).catch(() => {})

    return NextResponse.json({ qa: qaResult })

  } catch (err) {
    console.error('AI QA error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
