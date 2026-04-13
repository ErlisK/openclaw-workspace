/**
 * POST /api/narrative/generate
 * Streaming narrative generation for grant application sections.
 * Uses Vercel AI Gateway (zero-config, no API keys needed).
 */
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { streamText, generateText } from 'ai'
import { defaultModel, fastModel } from '@/lib/ai-gateway'
import { getEntitlementState, logUsage, limitExceededResponse } from '@/lib/entitlements'
import { trackServer } from '@/lib/analytics.server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const admin = createAdminClient()
    const body = await req.json()
    const {
      section_key,
      section_title,
      rfp_document_id,
      application_id,
      org_context,
      tone = 'professional',
      word_limit,
      streaming = true,
    } = body

    if (!section_key) {
      return new Response(JSON.stringify({ error: 'section_key required' }), { status: 400 })
    }

    // Get org
    const { data: member } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return new Response(JSON.stringify({ error: 'No organization' }), { status: 400 })
    const orgId = member.organization_id

    // Entitlement gate
    const ent = await getEntitlementState(user.id)
    if (!ent.can.generate_narrative) {
      return new Response(JSON.stringify(limitExceededResponse(
        'narrative_generate',
        ent.tier,
        ent.usage['narrative_generate'] || 0,
        ent.limits.narrative_generate_per_month
      )), { status: 429 })
    }

    // Load RFP and requirements context
    let rfpContext = ''
    let funderName = ''
    let sectionDescription = ''
    let scoringPoints: number | null = null
    let effectiveWordLimit = word_limit

    if (rfp_document_id) {
      const { data: rfp } = await admin
        .from('rfp_documents')
        .select('*')
        .eq('id', rfp_document_id)
        .single()

      if (rfp) {
        funderName = rfp.funder_name || ''
        const parsed = rfp.parsed_data || {}
        rfpContext = `
**Funder:** ${rfp.funder_name || 'Unknown'}
**Program:** ${rfp.program_name || 'Unknown'}
**Max Award:** ${parsed.max_award_usd ? `$${parsed.max_award_usd.toLocaleString()}` : 'Unknown'}
**Deadline:** ${rfp.deadline || 'Unknown'}
**Funder Priorities:** ${(parsed.funder_priorities || []).join(', ') || 'Not specified'}
**Eligibility:** ${(parsed.eligibility || []).slice(0, 3).join(', ') || 'Not specified'}
**Scoring Rubric:** ${(parsed.scoring_rubric || []).slice(0, 5).map((s: { criterion: string; points: number }) => `${s.criterion} (${s.points} pts)`).join(', ') || 'Not specified'}
`

        // Get specific section requirements
        const { data: reqs } = await admin
          .from('rfp_requirements')
          .select('*')
          .eq('rfp_document_id', rfp_document_id)
        const matchingReq = reqs?.find((r: { section_key?: string; title?: string; description?: string | null; word_limit?: number | null; scoring_points?: number | null }) =>
          r.section_key === section_key ||
          (r.title as string)?.toLowerCase().includes(section_key.replace(/_/g, ' '))
        )
        if (matchingReq) {
          sectionDescription = matchingReq.description || ''
          scoringPoints = matchingReq.scoring_points || null
          effectiveWordLimit = effectiveWordLimit || matchingReq.word_limit
        }
      }
    }

    // Load org context
    let orgInfo = org_context
    if (!orgInfo) {
      const { data: org } = await admin
        .from('organizations')
        .select('name, org_type, annual_budget_usd, grant_focus_areas, city, state, ein')
        .eq('id', orgId)
        .single()
      orgInfo = org
    }

    const sectionLabel = section_title || section_key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    const wordTarget = effectiveWordLimit ? `Target length: ${effectiveWordLimit} words.` : 'Target length: 500-800 words.'

    const systemPrompt = `You are an expert grant writer helping a nonprofit craft compelling, funder-aligned grant applications. 
Your writing is specific, evidence-based, and tailored to each funder's priorities.
Avoid generic language, corporate jargon, and vague claims.
Every sentence should advance the case for funding.
Tone: ${tone}.`

    const userPrompt = `Write the **${sectionLabel}** section for a grant application.

## Organization
${orgInfo ? `
- Name: ${orgInfo.name || 'Our organization'}
- Type: ${orgInfo.org_type || 'Nonprofit'}
- Annual Budget: ${orgInfo.annual_budget_usd ? `$${orgInfo.annual_budget_usd.toLocaleString()}` : 'Not specified'}
- Focus Areas: ${(orgInfo.grant_focus_areas || []).join(', ') || 'Not specified'}
- Location: ${[orgInfo.city, orgInfo.state].filter(Boolean).join(', ') || 'Not specified'}
` : 'Not specified — write with placeholder brackets like [Organization Name]'}

## RFP Context
${rfpContext || 'No RFP loaded — write a strong, adaptable narrative.'}

## Section Requirements
${sectionDescription || `Standard ${sectionLabel} for a grant application.`}
${scoringPoints ? `**Scoring:** ${scoringPoints} points` : ''}
${wordTarget}

## Instructions
- Open with a compelling hook that speaks to the funder's mission
- Use specific data, outcomes, and examples where possible
- Address the scoring criteria directly if specified
- End with a clear ask or next step
- Write in complete paragraphs, not bullets
- Use [brackets] for any specific data points the applicant needs to fill in

Write the section now:`

    // Log usage
    await logUsage(user.id, orgId, 'narrative_generate', 'section', application_id, { section_key })
    trackServer('narrative_generated', user.id, orgId, {
      section_key,
      application_id: application_id || null,
      streaming,
      funder_name: funderName,
    }).catch(() => {})

    if (streaming) {
      const result = await streamText({
        model: defaultModel,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: effectiveWordLimit ? Math.ceil(effectiveWordLimit * 1.5) : 1500,
        temperature: 0.5,
        onFinish: async ({ text }) => {
          // Save the final draft
          if (application_id) {
            await admin.from('narratives').upsert({
              application_id,
              organization_id: orgId,
              section_key,
              section_title: sectionLabel,
              content_md: text,
              word_count: text.split(/\s+/).length,
              word_limit: effectiveWordLimit,
              status: 'draft',
              created_by: user.id,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'application_id,section_key' }).catch(console.error)
          }
        }
      })

      return result.toTextStreamResponse()
    } else {
      // Non-streaming response
      const { text } = await generateText({
        model: defaultModel,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: effectiveWordLimit ? Math.ceil(effectiveWordLimit * 1.5) : 1500,
        temperature: 0.5,
      })

      // Save draft
      if (application_id) {
        await admin.from('narratives').upsert({
          application_id,
          organization_id: orgId,
          section_key,
          section_title: sectionLabel,
          content_md: text,
          word_count: text.split(/\s+/).length,
          word_limit: effectiveWordLimit,
          status: 'draft',
          created_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'application_id,section_key' }).catch(console.error)
      }

      return new Response(JSON.stringify({ text, word_count: text.split(/\s+/).length }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (err) {
    console.error('Narrative generate error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
