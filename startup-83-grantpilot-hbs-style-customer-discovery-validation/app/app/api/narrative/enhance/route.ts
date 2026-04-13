/**
 * POST /api/narrative/enhance
 * AI-powered narrative enhancement: takes draft text and improves it with
 * funder-specific language, stronger evidence framing, and structural edits.
 * Uses Vercel AI Gateway — no API keys required.
 */
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { streamText, generateText } from 'ai'
import { defaultModel } from '@/lib/ai-gateway'
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
      narrative_id,
      content,
      section_key,
      section_title,
      rfp_document_id,
      application_id,
      enhancement_type = 'full', // 'full' | 'tone' | 'evidence' | 'structure' | 'concise'
      funder_name,
      funder_type,
      word_limit,
      streaming = true,
    } = body

    if (!content && !narrative_id) {
      return new Response(JSON.stringify({ error: 'content or narrative_id required' }), { status: 400 })
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

    // Load narrative if id provided
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
      return new Response(JSON.stringify({ error: 'Content too short to enhance (minimum 50 characters)' }), { status: 400 })
    }

    // Load RFP context if available
    let rfpContext = ''
    let funderPriorities: string[] = []
    if (rfp_document_id) {
      const { data: rfp } = await admin.from('rfp_documents').select('*').eq('id', rfp_document_id).single()
      if (rfp) {
        const parsed = rfp.parsed_data || {}
        funderPriorities = parsed.funder_priorities || []
        rfpContext = `
**Funder:** ${rfp.funder_name || funder_name || 'Unknown'}
**Program:** ${rfp.program_name || 'Unknown'}
**Funder Priorities:** ${funderPriorities.join(', ') || 'Not specified'}
**Scoring:** ${(parsed.scoring_rubric || []).slice(0, 5).map((s: { criterion: string; points: number }) => `${s.criterion} (${s.points}pts)`).join(', ') || 'Not specified'}
`
      }
    }

    // Build enhancement instructions based on type
    const enhancementInstructions: Record<string, string> = {
      full: `Comprehensively improve the narrative by:
1. Strengthening the opening hook to immediately speak to the funder's mission
2. Adding specific data points and evidence where claims are vague (use [brackets] for placeholders)
3. Improving logical flow and transitions between paragraphs  
4. Sharpening the call to action and funding impact statement
5. Removing filler words and generic language
6. Ensuring every paragraph advances the case for funding`,

      tone: `Improve the tone and voice by:
1. Making the language more compelling and funder-aligned
2. Replacing passive voice with active voice
3. Removing bureaucratic jargon and replacing with clear language
4. Ensuring the narrative sounds human and genuine, not AI-generated
5. Calibrating formality to match ${funder_type || 'federal'} grant standards`,

      evidence: `Strengthen the evidence and data by:
1. Identifying every vague claim and suggesting specific data to add
2. Adding statistical context where possible (use [brackets] for specific numbers to fill in)
3. Including outcome-focused language (not just activities, but results)
4. Adding community/constituent voice where appropriate
5. Referencing relevant research, reports, or comparable programs`,

      structure: `Improve the structure and organization by:
1. Ensuring the narrative has a clear problem → solution → evidence → ask flow
2. Adding or improving section headers if appropriate
3. Breaking up overly long paragraphs
4. Creating stronger topic sentences for each paragraph
5. Ensuring the conclusion reinforces the key ask`,

      concise: `Make the narrative more concise while preserving impact:
1. Remove redundant sentences and phrases
2. Cut filler words and unnecessary qualifiers
3. Combine related points into single, powerful sentences
4. Target ~${narrativeWordLimit || 500} words if currently over limit
5. Preserve all substantive content and key data points`,
    }

    const instructions = enhancementInstructions[enhancement_type] || enhancementInstructions.full
    const wordGuidance = narrativeWordLimit
      ? `\nWord limit: ${narrativeWordLimit} words. Current draft: ~${narrativeContent.split(/\s+/).length} words.`
      : ''

    const systemPrompt = `You are an expert grant writer and editor helping nonprofits win funding. 
You improve grant narratives to be more compelling, specific, and funder-aligned.
Return ONLY the improved narrative text — no commentary, no preamble, no "Here is the improved version:".
Preserve the author's voice while making the writing stronger.`

    const userPrompt = `Enhance this grant narrative section.

## Section
**Title:** ${narrativeSectionTitle}
**Section Key:** ${narrativeSectionKey}

## RFP Context
${rfpContext || `Funder: ${funder_name || 'Unknown'}\nFunder Type: ${funder_type || 'Not specified'}`}
${wordGuidance}

## Enhancement Instructions
${instructions}

## Original Draft
${narrativeContent}

## Enhanced Version`

    // Log usage
    await logUsage(user.id, orgId, 'narrative_generate', 'enhance', appId, { section_key: narrativeSectionKey, enhancement_type })
    trackServer('narrative_enhanced', user.id, orgId, {
      section_key: narrativeSectionKey,
      enhancement_type,
      application_id: appId || null,
    }).catch(() => {})

    if (streaming) {
      const result = await streamText({
        model: defaultModel,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: narrativeWordLimit ? Math.ceil(narrativeWordLimit * 1.5) : 1800,
        temperature: 0.4,
        onFinish: async ({ text }) => {
          // Save as new version if we have a narrative_id
          if (narrative_id) {
            await admin.from('narratives').update({
              content_md: text,
              word_count: text.split(/\s+/).length,
              status: 'draft',
              updated_at: new Date().toISOString(),
            }).eq('id', narrative_id).catch(console.error)
          } else if (appId && narrativeSectionKey) {
            // Upsert
            await admin.from('narratives').upsert({
              application_id: appId,
              organization_id: orgId,
              section_key: narrativeSectionKey,
              section_title: narrativeSectionTitle,
              content_md: text,
              word_count: text.split(/\s+/).length,
              word_limit: narrativeWordLimit,
              status: 'draft',
              created_by: user.id,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'application_id,section_key' }).catch(console.error)
          }
        }
      })
      return result.toTextStreamResponse()
    } else {
      const { text } = await generateText({
        model: defaultModel,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: narrativeWordLimit ? Math.ceil(narrativeWordLimit * 1.5) : 1800,
        temperature: 0.4,
      })

      if (narrative_id) {
        await admin.from('narratives').update({
          content_md: text,
          word_count: text.split(/\s+/).length,
          updated_at: new Date().toISOString(),
        }).eq('id', narrative_id).catch(console.error)
      }

      return new Response(JSON.stringify({
        text,
        word_count: text.split(/\s+/).length,
        enhancement_type,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

  } catch (err) {
    console.error('Narrative enhance error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
