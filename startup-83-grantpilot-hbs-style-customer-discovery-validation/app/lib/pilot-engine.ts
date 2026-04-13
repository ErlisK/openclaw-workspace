/**
 * Grant Pilot — Prompt Assembly Engine
 * 
 * Retrieves matching funder templates from the corpus and assembles
 * a structured prompt for narrative generation.
 * 
 * Works without an LLM key by returning the assembled prompt for inspection.
 * When OPENAI_API_KEY is set, streams the generation.
 */

export interface PilotConfig {
  id?: string
  name: string
  funder_profile: FunderProfile
  tone: ToneOption
  org_context: OrgContext
  system_prompt_override?: string
  retrieve_templates: boolean
  max_template_tokens: number
  llm_model: string
  temperature: number
}

export interface FunderProfile {
  funder_name?: string
  funder_type?: 'federal' | 'state' | 'foundation' | 'community' | 'corporate' | 'municipal'
  program_name?: string
  cfda_number?: string
  priorities?: string[]
  known_preferences?: string[]   // e.g. "emphasizes data-driven approach", "values community voice"
}

export interface OrgContext {
  org_name?: string
  org_type?: string
  mission?: string
  service_area?: string
  population_served?: string
  annual_budget?: number
  founding_year?: number
  key_programs?: string[]
  past_grants?: string[]
  ein?: string
}

export type ToneOption = 
  | 'professional'      // neutral, formal, policy-aligned
  | 'community'         // warm, asset-based, community-voice centered
  | 'academic'          // evidence-heavy, citations, technical
  | 'advocacy'          // urgent, equity-framing, systemic analysis
  | 'concise'           // tight prose, no fluff, direct

export const TONE_DESCRIPTIONS: Record<ToneOption, { label: string; description: string; example: string }> = {
  professional: {
    label: 'Professional / Policy',
    description: 'Formal, data-driven, policy-aligned language typical of federal grants. Neutral and authoritative.',
    example: '"Organization Name has demonstrated measurable capacity to implement evidence-based programs with fidelity to model specifications."'
  },
  community: {
    label: 'Community-Centered',
    description: 'Warm, asset-based, centers community voice and lived experience. Strong for foundations.',
    example: '"Rooted in the [neighborhood] community for 15 years, our neighbors have taught us that lasting change begins with..."'
  },
  academic: {
    label: 'Academic / Research',
    description: 'Evidence-heavy, references research literature, technical rigor. Best for NSF, NIH, CDC research grants.',
    example: '"Consistent with the social-ecological model (Bronfenbrenner, 1979), our multi-level intervention addresses..."'
  },
  advocacy: {
    label: 'Advocacy / Equity',
    description: 'Centers structural inequity, systemic analysis, and urgency. Strong for RWJF, equity-focused foundations.',
    example: '"The persistent health gap in [community] is not a natural phenomenon — it is the predictable result of decades of disinvestment..."'
  },
  concise: {
    label: 'Concise / Direct',
    description: 'Tight, punchy prose with no filler. Good for LOIs, page-limited sections, executive summaries.',
    example: '"[Organization]: 12 years, 4,200 families served, 74% program completion. We know what works."'
  },
}

export interface MatchedTemplate {
  id: string
  title: string
  funder_name: string | null
  section_key: string
  content_md: string
  score: number     // 0–1 relevance score
  reason: string    // why this template was selected
}

export interface AssembledPrompt {
  system_prompt: string
  user_prompt: string
  matched_templates: MatchedTemplate[]
  estimated_tokens: number
  config_summary: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Template retrieval (keyword/heuristic RAG — no vector store needed)
// ─────────────────────────────────────────────────────────────────────────────

export function scoreTemplate(
  template: { funder_name: string | null; funder_type: string; section_key: string; tags: string[]; win_count: number; use_count: number },
  funderProfile: FunderProfile,
  sectionKey: string
): number {
  let score = 0

  // Exact funder name match
  if (funderProfile.funder_name && template.funder_name) {
    const fn = funderProfile.funder_name.toLowerCase()
    const tn = template.funder_name.toLowerCase()
    if (tn === fn || fn.includes(tn) || tn.includes(fn.split(' ')[0])) score += 0.4
  }

  // Funder type match
  if (funderProfile.funder_type && template.funder_type === funderProfile.funder_type) score += 0.2

  // Section key match
  if (template.section_key === sectionKey) score += 0.25

  // CFDA match
  if (funderProfile.cfda_number && template.tags?.includes(funderProfile.cfda_number)) score += 0.15

  // Win/use weight (popularity signal)
  const useScore = Math.min((template.use_count || 0) / 40, 0.1)
  const winScore = Math.min((template.win_count || 0) / 10, 0.05)
  score += useScore + winScore

  return Math.min(score, 1)
}

export function retrieveTemplates(
  allTemplates: Array<Record<string, unknown>>,
  funderProfile: FunderProfile,
  sectionKey: string,
  maxCount = 3
): MatchedTemplate[] {
  const scored = allTemplates.map(t => {
    const s = scoreTemplate(
      {
        funder_name: t.funder_name as string | null,
        funder_type: t.funder_type as string,
        section_key: t.section_key as string,
        tags: t.tags as string[],
        win_count: t.win_count as number,
        use_count: t.use_count as number,
      },
      funderProfile,
      sectionKey
    )
    return { template: t, score: s }
  })
  .filter(x => x.score > 0.1)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxCount)

  return scored.map(({ template: t, score }) => ({
    id: t.id as string,
    title: t.title as string,
    funder_name: t.funder_name as string | null,
    section_key: t.section_key as string,
    content_md: t.content_md as string,
    score,
    reason: score >= 0.6 ? 'Strong funder+section match' : score >= 0.3 ? 'Section type match' : 'General relevance',
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt assembly
// ─────────────────────────────────────────────────────────────────────────────

export function assemblePilotPrompt(
  config: PilotConfig,
  sectionKey: string,
  sectionTitle: string,
  rfpContext: {
    title?: string
    funder_name?: string
    deadline?: string
    word_limit?: number
    page_limit?: number
    scoring_points?: number
    section_description?: string
    eligibility?: string[]
    scoring_rubric?: Array<{ criterion: string; points: number }>
  },
  matchedTemplates: MatchedTemplate[],
): AssembledPrompt {
  const { funder_profile, org_context, tone } = config
  const toneDesc = TONE_DESCRIPTIONS[tone]

  // ── System prompt ──────────────────────────────────────────────────────────
  const systemParts: string[] = []

  systemParts.push(`You are GrantPilot, an expert grant writer specializing in ${funder_profile.funder_type || 'various'} grant applications.`)
  systemParts.push(`\nTone: ${toneDesc.label} — ${toneDesc.description}`)
  systemParts.push(`\nWrite in a ${tone === 'academic' ? 'third' : 'first'} person perspective from the applicant organization's voice.`)

  if (config.system_prompt_override) {
    systemParts.push(`\n\nAdditional instructions:\n${config.system_prompt_override}`)
  }

  systemParts.push(`\n\nOutput requirements:
- Write polished, submission-ready prose, not placeholder text
- Fill in [bracketed placeholders] with the most appropriate language given context, or mark clearly as [REQUIRED: description]
- Do not include meta-commentary or explain what you are doing
- Match the tone consistently throughout
- Use active voice and concrete specifics where possible
- Vary sentence length for readability`)

  if (org_context.org_name) {
    systemParts.push(`\nOrganization: ${org_context.org_name}`)
    if (org_context.mission) systemParts.push(`Mission: ${org_context.mission}`)
    if (org_context.service_area) systemParts.push(`Service area: ${org_context.service_area}`)
    if (org_context.population_served) systemParts.push(`Population served: ${org_context.population_served}`)
    if (org_context.founding_year) systemParts.push(`Founded: ${org_context.founding_year}`)
    if (org_context.annual_budget) systemParts.push(`Annual budget: $${org_context.annual_budget.toLocaleString()}`)
  }

  const systemPrompt = config.system_prompt_override 
    ? config.system_prompt_override + '\n\n' + systemParts.slice(1).join('\n')
    : systemParts.join('\n')

  // ── User prompt ────────────────────────────────────────────────────────────
  const userParts: string[] = []

  userParts.push(`Write the "${sectionTitle}" section for the following grant application:\n`)
  userParts.push(`**Grant**: ${rfpContext.title || rfpContext.funder_name || 'Grant Application'}`)
  if (rfpContext.funder_name) userParts.push(`**Funder**: ${rfpContext.funder_name}`)
  if (rfpContext.deadline) userParts.push(`**Deadline**: ${rfpContext.deadline}`)
  if (rfpContext.word_limit) userParts.push(`**Word limit**: ${rfpContext.word_limit} words`)
  if (rfpContext.page_limit) userParts.push(`**Page limit**: ${rfpContext.page_limit} pages`)
  if (rfpContext.scoring_points) userParts.push(`**Points**: ${rfpContext.scoring_points} points`)
  if (rfpContext.section_description) userParts.push(`**Section instructions**: ${rfpContext.section_description}`)

  // Scoring rubric context
  if (rfpContext.scoring_rubric && rfpContext.scoring_rubric.length > 0) {
    userParts.push('\n**Full scoring rubric** (write to maximize points):')
    rfpContext.scoring_rubric.forEach(r => userParts.push(`- ${r.criterion}: ${r.points} pts`))
  }

  // Funder priorities
  if (funder_profile.priorities && funder_profile.priorities.length > 0) {
    userParts.push(`\n**Funder priorities to address**: ${funder_profile.priorities.join(', ')}`)
  }
  if (funder_profile.known_preferences && funder_profile.known_preferences.length > 0) {
    userParts.push(`**Known funder preferences**: ${funder_profile.known_preferences.join('; ')}`)
  }

  // Template examples for RAG
  if (matchedTemplates.length > 0) {
    userParts.push('\n---\n**REFERENCE TEMPLATES** (adapt these to your organization — do not copy verbatim):')
    matchedTemplates.forEach((t, i) => {
      userParts.push(`\n*Template ${i + 1}: ${t.title} [${t.reason}, score ${t.score.toFixed(2)}]*`)
      // Truncate template to stay within token budget
      const maxChars = Math.floor((config.max_template_tokens / matchedTemplates.length) * 4)
      const content = t.content_md.length > maxChars ? t.content_md.slice(0, maxChars) + '...[truncated]' : t.content_md
      userParts.push(content)
    })
    userParts.push('\n---')
  }

  userParts.push('\nNow write the section. Do not include a heading — output body text only:')

  const userPrompt = userParts.join('\n')

  // Estimate tokens (rough: 1 token ≈ 4 chars)
  const estimatedTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4)

  const configSummary = [
    `Funder: ${funder_profile.funder_name || funder_profile.funder_type || 'General'}`,
    `Tone: ${toneDesc.label}`,
    `Templates: ${matchedTemplates.length} retrieved`,
    `~${estimatedTokens.toLocaleString()} tokens`,
  ].join(' · ')

  return { system_prompt: systemPrompt, user_prompt: userPrompt, matched_templates: matchedTemplates, estimated_tokens: estimatedTokens, config_summary: configSummary }
}
