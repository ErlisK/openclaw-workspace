/**
 * RFP Parser — heuristic extraction engine
 * Extracts structured grant metadata from raw text without requiring an LLM API key.
 * Designed as a deterministic first pass; LLM can enhance later when key is available.
 */

export interface ParsedRFP {
  title: string | null
  funder_name: string | null
  program_name: string | null
  cfda_number: string | null
  deadline: string | null          // ISO date YYYY-MM-DD
  deadline_time: string | null     // HH:MM or "5:00 PM ET"
  submission_portal: string | null // grants.gov | email | online_portal | mail
  portal_url: string | null
  max_award_usd: number | null
  min_award_usd: number | null
  eligibility: string[]
  ineligible: string[]
  required_sections: RequiredSection[]
  attachments: Attachment[]
  scoring_rubric: ScoringItem[]
  page_limit: number | null
  matching_required: boolean
  matching_pct: number | null
  period_of_performance_months: number | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  geography: string | null
  raw_snippets: Record<string, string>   // key: section → raw text excerpt
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
}

export interface RequiredSection {
  title: string
  req_type: 'narrative' | 'form' | 'attachment' | 'certification' | 'budget' | 'other'
  description: string | null
  word_limit: number | null
  page_limit: number | null
  scoring_points: number | null
  is_required: boolean
  sort_order: number
}

export interface Attachment {
  name: string
  is_required: boolean
  format: string | null
}

export interface ScoringItem {
  criterion: string
  points: number
  pct: number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Main parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseRFP(text: string): ParsedRFP {
  const warnings: string[] = []
  const raw_snippets: Record<string, string> = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const lower = text.toLowerCase()

  // ── Title ──────────────────────────────────────────────────────────────────
  const title = extractTitle(lines)

  // ── Funder & Program ───────────────────────────────────────────────────────
  const funder_name = extractFunder(text, lines)
  const program_name = extractProgram(text, lines, title)
  const cfda_number = extractCFDA(text)

  // ── Deadline ───────────────────────────────────────────────────────────────
  const { deadline, deadline_time } = extractDeadline(text, lines)
  if (!deadline) warnings.push('Could not extract deadline — review manually')

  // ── Award amounts ──────────────────────────────────────────────────────────
  const { max_award_usd, min_award_usd } = extractAwardAmounts(text)

  // ── Submission portal ──────────────────────────────────────────────────────
  const { submission_portal, portal_url } = extractPortal(text, lower)

  // ── Eligibility ────────────────────────────────────────────────────────────
  const { eligibility, ineligible } = extractEligibility(text, lines)
  raw_snippets.eligibility = extractSnippet(text, /eligib/i, 600)

  // ── Required sections ──────────────────────────────────────────────────────
  const required_sections = extractSections(text, lines)
  raw_snippets.sections = extractSnippet(text, /application component|required section|narrative section|table of content/i, 800)

  // ── Attachments ────────────────────────────────────────────────────────────
  const attachments = extractAttachments(text, lines)

  // ── Scoring rubric ─────────────────────────────────────────────────────────
  const scoring_rubric = extractScoring(text, lines)
  if (scoring_rubric.length === 0) warnings.push('No scoring rubric found — check Section 5 / Evaluation Criteria')
  raw_snippets.scoring = extractSnippet(text, /evaluat|scoring|review criteria|selection criteria/i, 600)

  // ── Constraints ────────────────────────────────────────────────────────────
  const page_limit = extractPageLimit(text)
  const period_of_performance_months = extractPeriod(text)
  const { matching_required, matching_pct } = extractMatching(text)

  // ── Contact ────────────────────────────────────────────────────────────────
  const { contact_name, contact_email, contact_phone } = extractContact(text, lines)

  // ── Geography ─────────────────────────────────────────────────────────────
  const geography = extractGeography(text)

  // ── Confidence ────────────────────────────────────────────────────────────
  const confidence = scoreConfidence({ title, funder_name, deadline, required_sections, scoring_rubric })

  return {
    title, funder_name, program_name, cfda_number,
    deadline, deadline_time,
    submission_portal, portal_url,
    max_award_usd, min_award_usd,
    eligibility, ineligible,
    required_sections, attachments, scoring_rubric,
    page_limit, matching_required, matching_pct,
    period_of_performance_months,
    contact_name, contact_email, contact_phone,
    geography,
    raw_snippets, confidence, warnings
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractTitle(lines: string[]): string | null {
  // Look for "Funding Opportunity Title:", "NOFO:", "Program:", or first capitalized heading
  for (const line of lines.slice(0, 50)) {
    const m = line.match(/(?:funding opportunity (?:title|announcement|number)|NOFO|solicitation)[:\s]+(.{10,120})/i)
    if (m) return m[1].trim()
  }
  // First long all-caps or title-case line
  for (const line of lines.slice(0, 30)) {
    if (line.length > 20 && line.length < 150 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
      return toTitleCase(line)
    }
  }
  // First line with "grant" or "program"
  for (const line of lines.slice(0, 40)) {
    if (/grant|program|funding|opportunity/i.test(line) && line.length > 15 && line.length < 150) {
      return line.replace(/^#+\s*/, '')
    }
  }
  return null
}

function extractFunder(text: string, lines: string[]): string | null {
  // Known federal agencies
  const agencies: [RegExp, string][] = [
    [/\bHUD\b|Department of Housing/i, 'HUD'],
    [/\bDOJ\b|Department of Justice|Bureau of Justice/i, 'DOJ'],
    [/\bSAMHSA\b/i, 'SAMHSA'],
    [/\bCDC\b|Centers for Disease Control/i, 'CDC'],
    [/\bNIH\b|National Institutes of Health/i, 'NIH'],
    [/\bNSF\b|National Science Foundation/i, 'NSF'],
    [/\bDOE\b|Department of Energy/i, 'DOE'],
    [/\bEPA\b|Environmental Protection/i, 'EPA'],
    [/\bUSDA\b|Department of Agriculture/i, 'USDA'],
    [/\bDOL\b|Department of Labor/i, 'DOL'],
    [/\bED\b|Department of Education/i, 'DOEd'],
    [/\bACF\b|Administration for Children/i, 'ACF/HHS'],
    [/\bHRSA\b/i, 'HRSA/HHS'],
    [/\bCOPS\b/i, 'DOJ COPS'],
    [/Robert Wood Johnson/i, 'Robert Wood Johnson Foundation'],
    [/\bRWJF\b/i, 'Robert Wood Johnson Foundation'],
    [/Gates Foundation|Bill.{1,10}Melinda/i, 'Gates Foundation'],
    [/Kellogg Foundation/i, 'W.K. Kellogg Foundation'],
    [/MacArthur Foundation/i, 'MacArthur Foundation'],
    [/Ford Foundation/i, 'Ford Foundation'],
    [/Annie E\. Casey/i, 'Annie E. Casey Foundation'],
    [/Lumina Foundation/i, 'Lumina Foundation'],
    [/JPMorgan Chase/i, 'JPMorgan Chase'],
    [/Bank of America/i, 'Bank of America'],
    [/Wells Fargo/i, 'Wells Fargo'],
  ]
  for (const [re, name] of agencies) {
    if (re.test(text)) return name
  }
  // Look for "issued by", "administered by", "awarding agency"
  const m = text.match(/(?:awarding agency|issued by|administered by|funding agency)[:\s]+([^\n,\.]{5,60})/i)
  if (m) return m[1].trim()
  return null
}

function extractProgram(text: string, lines: string[], title: string | null): string | null {
  const m = text.match(/(?:program name|funding opportunity title|project title|program title)[:\s]+([^\n]{5,120})/i)
  if (m) return m[1].trim()
  return title
}

function extractCFDA(text: string): string | null {
  const m = text.match(/(?:CFDA|assistance listing)[:\s#]*([\d]{2}\.[\d]{3,4})/i)
  return m ? m[1] : null
}

function extractDeadline(text: string, lines: string[]): { deadline: string | null; deadline_time: string | null } {
  // Patterns: "due date: ", "deadline:", "applications due", "submit by", "closing date"
  const patterns = [
    /(?:deadline|due date|applications? (?:are )?due|submission deadline|close[sd]? (?:date|on)|submit (?:by|no later than))[:\s]+([^\n]{5,60})/i,
    /(?:applications? must be (?:submitted|received) (?:by|no later than))[:\s]+([^\n]{5,60})/i,
  ]
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) {
      const raw = m[1].trim()
      const parsed = parseDate(raw)
      if (parsed) {
        const timeMatch = raw.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|a\.m\.|p\.m\.)?(?:\s*[A-Z]{2,4}T?)?)/i)
        return { deadline: parsed, deadline_time: timeMatch ? timeMatch[1] : null }
      }
    }
  }
  // Fallback: scan all lines for date-like content near keywords
  for (const line of lines) {
    if (/deadline|due|submit/i.test(line)) {
      const d = parseDate(line)
      if (d) return { deadline: d, deadline_time: null }
    }
  }
  return { deadline: null, deadline_time: null }
}

function parseDate(raw: string): string | null {
  // Try various date patterns
  const months: Record<string, string> = {
    january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
    july:'07',august:'08',september:'09',october:'10',november:'11',december:'12',
    jan:'01',feb:'02',mar:'03',apr:'04',jun:'06',jul:'07',aug:'08',
    sep:'09',oct:'10',nov:'11',dec:'12'
  }
  // MM/DD/YYYY or M/D/YYYY
  let m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
  // Month DD, YYYY
  m = raw.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i)
  if (m) {
    const mo = months[m[1].toLowerCase()]
    if (mo) return `${m[3]}-${mo}-${m[2].padStart(2,'0')}`
  }
  // DD Month YYYY
  m = raw.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i)
  if (m) {
    const mo = months[m[2].toLowerCase()]
    if (mo) return `${m[3]}-${mo}-${m[1].padStart(2,'0')}`
  }
  // YYYY-MM-DD already
  m = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

function extractAwardAmounts(text: string): { max_award_usd: number | null; min_award_usd: number | null } {
  let max_award_usd: number | null = null
  let min_award_usd: number | null = null

  const parseMoney = (s: string): number | null => {
    const v = s.replace(/[$,\s]/g, '')
    const n = parseFloat(v)
    if (isNaN(n)) return null
    if (/million/i.test(s)) return n * 1_000_000
    if (/thousand/i.test(s)) return n * 1_000
    return n
  }

  // "up to $500,000"
  let m = text.match(/up to\s+\$?([\d,\.]+(?:\s*million|\s*thousand)?)/i)
  if (m) max_award_usd = parseMoney(m[1])

  // "maximum (?:award|grant)(?:\s+amount)?(?:\s+is|:)?\s+\$"
  m = text.match(/maximum (?:award|grant)(?: amount)?[:\s]+\$?([\d,\.]+(?:\s*million|\s*thousand)?)/i)
  if (m) max_award_usd = parseMoney(m[1])

  // "award range: $X to $Y"
  m = text.match(/award (?:range|amount)[:\s]+\$?([\d,\.]+)(?:\s*(?:to|-)\s*\$?([\d,\.]+))?/i)
  if (m) {
    min_award_usd = parseMoney(m[1])
    if (m[2]) max_award_usd = parseMoney(m[2])
  }

  // "grants of up to $500K"
  m = text.match(/grants? of(?:\s+up to)?\s+\$?([\d,\.]+(?:\s*[KkMm])?)/i)
  if (m) {
    let s = m[1]
    if (/[Kk]$/.test(s)) s = s.replace(/[Kk]$/, '000')
    if (/[Mm]$/.test(s)) s = s.replace(/[Mm]$/, '000000')
    max_award_usd = parseMoney(s)
  }

  return { max_award_usd, min_award_usd }
}

function extractPortal(text: string, lower: string): { submission_portal: string | null; portal_url: string | null } {
  if (/grants\.gov/i.test(text)) {
    return { submission_portal: 'grants.gov', portal_url: 'https://www.grants.gov' }
  }
  if (/egrants|egrantsplus|grantsolutions/i.test(text)) {
    return { submission_portal: 'online_portal', portal_url: null }
  }
  if (/email.{0,30}submit|submit.{0,30}email/i.test(text)) {
    const em = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    return { submission_portal: 'email', portal_url: em ? `mailto:${em[0]}` : null }
  }
  if (/mail.{0,20}submit|submit.{0,20}mail|hard copy/i.test(text)) {
    return { submission_portal: 'mail', portal_url: null }
  }
  if (/online portal|online application|web-based/i.test(text)) {
    const url = text.match(/https?:\/\/[^\s<>"]{10,100}/)
    return { submission_portal: 'online_portal', portal_url: url ? url[0] : null }
  }
  return { submission_portal: null, portal_url: null }
}

function extractEligibility(text: string, lines: string[]): { eligibility: string[]; ineligible: string[] } {
  const eligibility: string[] = []
  const ineligible: string[] = []

  const eligTypes = [
    'nonprofit', 'non-profit', '501(c)(3)', 'unit of local government', 'municipality',
    'tribal', 'tribal government', 'school district', 'institution of higher education',
    'community development corporation', 'housing authority', 'faith-based', 'neighborhood association',
    'state agency', 'county government', 'public health department',
  ]
  for (const t of eligTypes) {
    if (text.toLowerCase().includes(t)) eligibility.push(t)
  }

  const ineligTypes = [
    'for-profit', 'individuals', 'foreign entities', 'hospitals', 'government-owned',
    'federal agencies', 'foreign governments',
  ]
  // Check near "not eligible" or "ineligible"
  const ineligSection = extractSnippet(text, /not eligible|ineligible|excluded/i, 400)
  for (const t of ineligTypes) {
    if (ineligSection.toLowerCase().includes(t)) ineligible.push(t)
  }

  return { eligibility: [...new Set(eligibility)], ineligible: [...new Set(ineligible)] }
}

function extractSections(text: string, lines: string[]): RequiredSection[] {
  const sections: RequiredSection[] = []
  let order = 0

  // Common grant narrative sections
  const sectionPatterns: Array<[RegExp, string, RequiredSection['req_type']]> = [
    [/project (?:narrative|description|summary|overview)/i, 'Project Narrative', 'narrative'],
    [/executive summary/i, 'Executive Summary', 'narrative'],
    [/(?:statement of|problem statement)/i, 'Problem Statement', 'narrative'],
    [/(?:goals? and objectives?|program goals?)/i, 'Goals and Objectives', 'narrative'],
    [/(?:target population|population served|who we serve)/i, 'Target Population', 'narrative'],
    [/(?:program|project) (?:design|approach|methodology)/i, 'Program Design', 'narrative'],
    [/(?:implementation (?:plan|timeline)|work plan|timeline)/i, 'Implementation Plan', 'narrative'],
    [/evaluation (?:plan|design|methodology)/i, 'Evaluation Plan', 'narrative'],
    [/(?:organizational capacity|organizational qualifications|past performance)/i, 'Organizational Capacity', 'narrative'],
    [/(?:sustainability|continuation plan)/i, 'Sustainability Plan', 'narrative'],
    [/(?:budget narrative|budget justification)/i, 'Budget Narrative', 'budget'],
    [/(?:abstract|project abstract)/i, 'Project Abstract', 'narrative'],
    [/(?:logic model|theory of change)/i, 'Logic Model', 'narrative'],
    [/(?:letters? of support|letters? of commitment)/i, 'Letters of Support', 'attachment'],
    [/(?:memoranda? of understanding|MOU)/i, 'MOU/Partnership Agreement', 'attachment'],
    [/SF-?424\b/i, 'SF-424 Application Form', 'form'],
    [/SF-?424A\b/i, 'SF-424A Budget Form', 'form'],
    [/SF-?424B\b/i, 'SF-424B Assurances Form', 'form'],
    [/(?:certifications? and assurances?)/i, 'Certifications & Assurances', 'certification'],
    [/(?:indirect cost rate|negotiated indirect)/i, 'Indirect Cost Rate Agreement', 'attachment'],
    [/(?:résumés?|CVs?|key personnel)/i, 'Key Personnel Resumes/CVs', 'attachment'],
    [/(?:audit report|A-?133)/i, 'Audit Report', 'attachment'],
    [/(?:501.?c.?3 determination|tax exempt)/i, 'IRS Tax Exemption Letter', 'attachment'],
    [/(?:data management plan)/i, 'Data Management Plan', 'narrative'],
    [/(?:human subjects|IRB)/i, 'IRB/Human Subjects', 'certification'],
  ]

  for (const [re, name, type] of sectionPatterns) {
    if (re.test(text)) {
      // Find word limit near this section
      const snippet = extractSnippet(text, re, 300)
      const wordLimit = extractWordLimitFromSnippet(snippet)
      const pageLimit = extractPageLimitFromSnippet(snippet)
      const scoringPts = extractScoringPtsFromSnippet(snippet)
      const isRequired = !/optional/i.test(snippet)

      sections.push({
        title: name,
        req_type: type,
        description: null,
        word_limit: wordLimit,
        page_limit: pageLimit,
        scoring_points: scoringPts,
        is_required: isRequired,
        sort_order: order++,
      })
    }
  }

  // If nothing found, add generic sections
  if (sections.length === 0) {
    sections.push(
      { title: 'Project Narrative', req_type: 'narrative', description: null, word_limit: null, page_limit: null, scoring_points: null, is_required: true, sort_order: 0 },
      { title: 'Budget Narrative', req_type: 'budget', description: null, word_limit: null, page_limit: null, scoring_points: null, is_required: true, sort_order: 1 },
    )
  }

  return sections
}

function extractWordLimitFromSnippet(snippet: string): number | null {
  const m = snippet.match(/(\d{2,4})[- ]word(?:\s+limit)?|no (?:more|longer) than\s+(\d{2,4})\s+words?/i)
  if (m) return parseInt(m[1] || m[2])
  return null
}

function extractPageLimitFromSnippet(snippet: string): number | null {
  const m = snippet.match(/(\d{1,3})[- ]page(?:\s+limit)?|no (?:more|longer) than\s+(\d{1,3})\s+pages?/i)
  if (m) return parseInt(m[1] || m[2])
  return null
}

function extractScoringPtsFromSnippet(snippet: string): number | null {
  const m = snippet.match(/(\d{1,3})\s+(?:points?|pts?)/i)
  if (m) return parseInt(m[1])
  return null
}

function extractAttachments(text: string, lines: string[]): Attachment[] {
  const attachments: Attachment[] = []
  const seen = new Set<string>()

  const add = (name: string, required: boolean, format: string | null) => {
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      attachments.push({ name, is_required: required, format })
    }
  }

  if (/SF-?424\b/i.test(text)) add('SF-424', true, 'form')
  if (/SF-?424A\b/i.test(text)) add('SF-424A Budget Form', true, 'form')
  if (/SF-?424B\b/i.test(text)) add('SF-424B Assurances', true, 'form')
  if (/résumés?|CVs?\b/i.test(text)) add('Key Personnel Resumes/CVs', true, 'PDF')
  if (/letters? of (?:support|commitment)/i.test(text)) add('Letters of Support', false, 'PDF')
  if (/(?:MOU|memoranda? of understanding)/i.test(text)) add('MOU/Partnership Agreement', false, 'PDF')
  if (/501.?c.?3|tax.?exempt/i.test(text)) add('IRS Tax Exemption Letter (501c3)', true, 'PDF')
  if (/audit|A-?133/i.test(text)) add('Most Recent Audit Report', true, 'PDF')
  if (/indirect cost/i.test(text)) add('Negotiated Indirect Cost Rate Agreement', false, 'PDF')
  if (/logic model/i.test(text)) add('Logic Model', true, 'PDF')
  if (/data management/i.test(text)) add('Data Management Plan', true, 'PDF')

  return attachments
}

function extractScoring(text: string, lines: string[]): ScoringItem[] {
  const items: ScoringItem[] = []

  // Pattern: "Criterion Name ... XX points"
  const re = /([A-Z][^\n]{5,80}?)[:\s]+(\d{1,3})\s*(?:points?|pts?)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const pts = parseInt(m[2])
    if (pts >= 5 && pts <= 200) {
      items.push({ criterion: m[1].trim(), points: pts, pct: null })
    }
  }

  // Calculate percentages if we have total
  if (items.length > 0) {
    const total = items.reduce((s, i) => s + i.points, 0)
    if (total > 0) {
      for (const item of items) {
        item.pct = Math.round((item.points / total) * 100)
      }
    }
  }

  return items.slice(0, 20) // cap at 20
}

function extractPageLimit(text: string): number | null {
  const m = text.match(/(?:total|overall|application|narrative)[^\n]{0,40}?(\d{1,3})[- ]page(?:\s+limit)?/i)
    || text.match(/not (?:exceed|to exceed|longer than)\s+(\d{1,3})\s+pages?/i)
  if (m) return parseInt(m[1])
  return null
}

function extractPeriod(text: string): number | null {
  // "period of performance: 24 months" / "2-year project" / "36-month grant"
  let m = text.match(/period of performance[:\s]+(\d{1,3})\s*(?:month|year)/i)
  if (m) {
    const n = parseInt(m[1])
    return /year/i.test(m[0]) ? n * 12 : n
  }
  m = text.match(/(\d{1,2})[- ](?:year|yr)\s+(?:project|grant|award|initiative)/i)
  if (m) return parseInt(m[1]) * 12
  m = text.match(/(\d{2,3})[- ]month\s+(?:project|grant|award|period)/i)
  if (m) return parseInt(m[1])
  return null
}

function extractMatching(text: string): { matching_required: boolean; matching_pct: number | null } {
  if (!/match|cost.share|in.kind/i.test(text)) return { matching_required: false, matching_pct: null }
  const m = text.match(/(\d{1,3})\s*%\s*(?:match|cost.share)|match(?:ing)?\s+(?:of\s+)?(\d{1,3})\s*%/i)
  return {
    matching_required: true,
    matching_pct: m ? parseInt(m[1] || m[2]) : null
  }
}

function extractContact(text: string, lines: string[]): { contact_name: string | null; contact_email: string | null; contact_phone: string | null } {
  const emailM = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const phoneM = text.match(/\(?\d{3}\)?[.\s-]\d{3}[.\s-]\d{4}/)

  // Look for name near "contact", "program officer", "questions"
  const snippet = extractSnippet(text, /(?:contact|program officer|program manager|questions?)[:\s]/i, 200)
  const nameM = snippet.match(/(?:contact|program officer|program manager)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i)

  return {
    contact_name: nameM ? nameM[1] : null,
    contact_email: emailM ? emailM[0] : null,
    contact_phone: phoneM ? phoneM[0] : null,
  }
}

function extractGeography(text: string): string | null {
  const m = text.match(/(?:geographic(?:ally)?|service area|jurisdiction)[:\s]+([^\n.]{5,80})/i)
  if (m) return m[1].trim()
  // State names
  const states = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
    'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana',
    'Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana',
    'Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina',
    'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
    'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
    'Wisconsin','Wyoming']
  const found = states.filter(s => text.includes(s))
  if (found.length > 0 && found.length <= 5) return found.join(', ')
  if (/national|nationwide|all 50 states/i.test(text)) return 'Nationwide'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function extractSnippet(text: string, pattern: RegExp, chars: number): string {
  const idx = text.search(pattern)
  if (idx === -1) return ''
  return text.slice(Math.max(0, idx - 50), idx + chars)
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/(?:^|\s)\w/g, c => c.toUpperCase())
}

function scoreConfidence(d: {
  title: string | null
  funder_name: string | null
  deadline: string | null
  required_sections: RequiredSection[]
  scoring_rubric: ScoringItem[]
}): 'high' | 'medium' | 'low' {
  let pts = 0
  if (d.title) pts += 1
  if (d.funder_name) pts += 1
  if (d.deadline) pts += 2
  if (d.required_sections.length >= 3) pts += 2
  if (d.scoring_rubric.length >= 2) pts += 1
  if (pts >= 6) return 'high'
  if (pts >= 3) return 'medium'
  return 'low'
}
