import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { assemblePilotPrompt, retrieveTemplates } from '@/lib/pilot-engine'
import type { PilotConfig, FunderProfile } from '@/lib/pilot-engine'
import { getEntitlementState, logUsage, limitExceededResponse } from '@/lib/entitlements'
import { trackServer } from '@/lib/analytics.server'
import { generateText } from 'ai'
import { defaultModel, fastModel } from '@/lib/ai-gateway'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()

    const {
      section_key,
      section_title,
      rfp_document_id,
      application_id,
      pilot_config_id,
      pilot_config_override,
    } = body

    if (!section_key) return NextResponse.json({ error: 'section_key required' }, { status: 400 })

    // Get org
    const { data: member } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })
    const orgId = member.organization_id

    // ── Entitlement gate ──────────────────────────────────────────────────────
    const ent = await getEntitlementState(user.id)
    if (!ent.can.generate_narrative) {
      return limitExceededResponse(
        'narrative_generate',
        ent.tier,
        ent.usage['narrative_generate'] || 0,
        ent.limits.narrative_generate_per_month
      )
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Load pilot config
    let pilotConfig: PilotConfig | null = null
    if (pilot_config_id) {
      const { data } = await admin.from('pilot_configs').select('*').eq('id', pilot_config_id).single()
      if (data) pilotConfig = { ...data, funder_profile: data.funder_profile, org_context: data.org_context }
    }
    if (!pilotConfig) {
      // Load default or use override
      const { data: defaultConfig } = await admin
        .from('pilot_configs')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_default', true)
        .single()
      pilotConfig = defaultConfig ? { ...defaultConfig, funder_profile: defaultConfig.funder_profile, org_context: defaultConfig.org_context } : null
    }

    // Merge any runtime override
    if (pilot_config_override) {
      pilotConfig = {
        name: 'Runtime Config',
        funder_profile: {},
        tone: 'professional',
        org_context: {},
        retrieve_templates: true,
        max_template_tokens: 2000,
        llm_model: 'gpt-4o-mini',
        temperature: 0.4,
        ...pilotConfig,
        ...pilot_config_override,
      }
    }
    if (!pilotConfig) {
      pilotConfig = {
        name: 'Default',
        funder_profile: {},
        tone: 'professional',
        org_context: {},
        retrieve_templates: true,
        max_template_tokens: 2000,
        llm_model: 'gpt-4o-mini',
        temperature: 0.4,
      }
    }

    // Load RFP context
    let rfpContext: Record<string, unknown> = {}
    let funderProfile: FunderProfile = pilotConfig.funder_profile

    if (rfp_document_id) {
      const { data: rfp } = await admin.from('rfp_documents').select('*').eq('id', rfp_document_id).single()
      if (rfp) {
        const parsed = rfp.parsed_data || {}
        rfpContext = {
          title: rfp.title,
          funder_name: rfp.funder_name,
          deadline: rfp.deadline,
          scoring_rubric: parsed.scoring_rubric || [],
        }
        // Auto-enhance funder profile from RFP
        funderProfile = {
          funder_name: rfp.funder_name || funderProfile.funder_name,
          cfda_number: rfp.cfda_number || funderProfile.cfda_number,
          ...funderProfile,
        }
        // Find specific section requirements
        const { data: reqs } = await admin
          .from('rfp_requirements')
          .select('*')
          .eq('rfp_document_id', rfp_document_id)
          .eq('req_type', 'narrative')
        const matchingReq = reqs?.find((r: Record<string, unknown>) => r.section_key === section_key || (r.title as string)?.toLowerCase().includes(section_key.replace(/_/g, ' ')))
        if (matchingReq) {
          rfpContext.word_limit = matchingReq.word_limit
          rfpContext.page_limit = matchingReq.page_limit
          rfpContext.scoring_points = matchingReq.scoring_points
          rfpContext.section_description = matchingReq.description
        }
      }
    }

    // Retrieve matching templates
    let matchedTemplates: ReturnType<typeof retrieveTemplates> = []
    if (pilotConfig.retrieve_templates) {
      const { data: allTemplates } = await admin
        .from('templates')
        .select('id,title,funder_name,funder_type,section_key,tags,win_count,use_count,content_md')
        .eq('is_public', true)
      if (allTemplates) {
        matchedTemplates = retrieveTemplates(allTemplates, funderProfile, section_key, 3)
      }
    }

    // Assemble prompt
    const pilotConfigWithFunder = { ...pilotConfig, funder_profile: funderProfile }
    const assembled = assemblePilotPrompt(
      pilotConfigWithFunder,
      section_key,
      section_title || section_key.replace(/_/g, ' '),
      rfpContext as Parameters<typeof assemblePilotPrompt>[3],
      matchedTemplates,
    )

    // Call LLM via Vercel AI Gateway (zero-config, no API keys needed)
    let generatedText: string | null = null

    try {
      // Choose model based on section complexity — use sonnet for full narratives, haiku for short sections
      const isComplexSection = ['executive_summary', 'project_narrative', 'problem_statement', 'project_description'].includes(section_key)
      const model = isComplexSection ? defaultModel : fastModel

      const { text } = await generateText({
        model,
        system: assembled.system_prompt,
        prompt: assembled.user_prompt,
        maxOutputTokens: 2000,
        temperature: pilotConfig.temperature || 0.4,
      })
      generatedText = text || null
    } catch (llmErr) {
      console.warn('AI Gateway call failed:', llmErr)
    }

    // Save to ai_drafts
    if (application_id) {
      await admin.from('ai_drafts').insert({
        application_id,
        organization_id: orgId,
        section_key,
        section_title: section_title || section_key,
        pilot_config_id: pilot_config_id || null,
        prompt_used: assembled.user_prompt,
        templates_retrieved: matchedTemplates.map(t => ({ id: t.id, title: t.title, score: t.score })),
        draft_text: generatedText,
        word_count: generatedText ? generatedText.split(/\s+/).length : null,
        status: generatedText ? 'draft' : 'prompt_only',
        created_by: user.id,
      }).select('id').single()
    }

    // Log to audit_log
    await admin.from('audit_log').insert({
      organization_id: orgId,
      user_id: user.id,
      event_type: 'ai_draft_generate',
      table_name: 'ai_drafts',
      record_id: null,
      metadata: {
        section_key,
        funder_name: funderProfile.funder_name,
        tone: pilotConfig.tone,
        templates_count: matchedTemplates.length,
        has_generation: !!generatedText,
      }
    })

    // Metered usage
    await logUsage(user.id, orgId, 'narrative_generate', 'section', application_id, { section_key })
    // Analytics
    trackServer('narrative_generated', user.id, orgId, {
      section_key,
      application_id: application_id || null,
      has_llm: true,
      templates_count: matchedTemplates.length,
    }).catch(() => {})

    return NextResponse.json({
      prompt: assembled,
      generated_text: generatedText,
      has_llm: true,
      config_summary: assembled.config_summary,
    })

  } catch (err) {
    console.error('Pilot generate error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
