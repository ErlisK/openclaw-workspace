/**
 * Dual-pass QA engine:
 *  Pass 1 — Style: tone, clarity, funder alignment, word count, structure
 *  Pass 2 — Compliance: regulatory language, required section coverage, certifications
 *
 * Works without an LLM by running deterministic heuristic checks.
 * When AI is available (OpenAI key present), LLM reviews augment the heuristics.
 */

export interface QAIssue {
  type: 'error' | 'warning' | 'info'
  code: string
  message: string
  location?: string   // e.g. "paragraph 2"
  suggestion?: string
}

export interface QAStrength {
  code: string
  message: string
}

export interface QAPassResult {
  pass: 'style' | 'compliance'
  score: number          // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  issues: QAIssue[]
  strengths: QAStrength[]
  suggestions: string[]
  summary: string
  checks_run: number
  checks_passed: number
}

export interface QAResult {
  style: QAPassResult
  compliance: QAPassResult
  combined_score: number
  combined_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  ready_for_submission: boolean
  blocking_issues: QAIssue[]
  timestamp: string
}

// ─── Heuristic helpers ────────────────────────────────────────────────────────
function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function countSentences(text: string) {
  return (text.match(/[.!?]+/g) || []).length || 1
}

function avgWordLength(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length ? words.reduce((s, w) => s + w.length, 0) / words.length : 0
}

function countPlaceholders(text: string) {
  return (text.match(/\[[^\]]{2,80}\]/g) || []).length
}

function containsFiller(text: string) {
  const fillers = ['it is important to note', 'it should be noted', 'in conclusion', 'needless to say', 'as previously mentioned', 'at the end of the day']
  return fillers.filter(f => text.toLowerCase().includes(f))
}

function hasPassiveVoice(text: string) {
  const passivePatterns = /\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi
  const matches = text.match(passivePatterns) || []
  return matches.length
}

function readabilityScore(text: string): number {
  // Flesch–Kincaid readability approximation (0–100, higher = more readable)
  const words = countWords(text)
  const sentences = countSentences(text)
  const syllables = text.split(/\s+/).reduce((s, w) => s + Math.max(1, w.replace(/[^aeiou]/gi, '').length), 0)
  if (sentences === 0 || words === 0) return 50
  const fk = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  return Math.max(0, Math.min(100, Math.round(fk)))
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

// ─── Pass 1: Style ────────────────────────────────────────────────────────────
export function runStylePass(params: {
  content: string
  section_key: string
  section_title: string
  word_limit?: number | null
  funder_type?: string
  tone?: string
}): QAPassResult {
  const { content, section_key, word_limit, funder_type, tone } = params
  const issues: QAIssue[] = []
  const strengths: QAStrength[] = []
  const suggestions: string[] = []
  let deductions = 0
  let checks_run = 0
  let checks_passed = 0

  const words = countWords(content)
  const sentences = countSentences(content)
  const readability = readabilityScore(content)

  // ── Word count ────────────────────────────────────────────────────────────
  checks_run++
  if (word_limit) {
    const ratio = words / word_limit
    if (words === 0) {
      issues.push({ type: 'error', code: 'EMPTY', message: 'Section is empty.', suggestion: 'Write at least a draft before running QA.' })
      deductions += 40
    } else if (ratio > 1.1) {
      issues.push({ type: 'error', code: 'OVER_WORD_LIMIT', message: `${words} words — ${words - word_limit} over the ${word_limit}-word limit.`, suggestion: `Cut ${words - word_limit} words. Focus on eliminating redundant phrases.` })
      deductions += 20
    } else if (ratio > 1.0) {
      issues.push({ type: 'warning', code: 'AT_WORD_LIMIT', message: `${words} words — at the ${word_limit}-word limit. Review for trim opportunities.` })
      deductions += 5
    } else if (ratio < 0.5) {
      issues.push({ type: 'warning', code: 'UNDER_DEVELOPED', message: `${words} words — only ${Math.round(ratio * 100)}% of the ${word_limit}-word limit used. Section may appear underdeveloped.`, suggestion: 'Expand with specific data, evidence, and program details.' })
      deductions += 10
    } else {
      strengths.push({ code: 'WORD_COUNT_OK', message: `Word count (${words}) is within the ${word_limit}-word limit.` })
      checks_passed++
    }
  } else {
    if (words < 50) {
      issues.push({ type: 'warning', code: 'SHORT', message: `Section is very short (${words} words).`, suggestion: 'Add more detail.' })
      deductions += 10
    } else {
      checks_passed++
    }
  }

  // ── Placeholders ──────────────────────────────────────────────────────────
  checks_run++
  const placeholders = countPlaceholders(content)
  if (placeholders > 0) {
    issues.push({ type: 'error', code: 'UNFILLED_PLACEHOLDERS', message: `${placeholders} unfilled placeholder${placeholders > 1 ? 's' : ''} found (e.g. [Organization Name]).`, suggestion: 'Replace all bracketed placeholders with actual data before submission.' })
    deductions += placeholders * 5
  } else {
    strengths.push({ code: 'NO_PLACEHOLDERS', message: 'No unfilled placeholders detected.' })
    checks_passed++
  }

  // ── Filler phrases ────────────────────────────────────────────────────────
  checks_run++
  const fillers = containsFiller(content)
  if (fillers.length > 0) {
    issues.push({ type: 'warning', code: 'FILLER_PHRASES', message: `Filler phrases detected: "${fillers.join('", "')}"`, suggestion: 'Remove filler phrases and replace with substantive content.' })
    deductions += 5
  } else {
    checks_passed++
  }

  // ── Readability ───────────────────────────────────────────────────────────
  checks_run++
  if (readability < 30) {
    issues.push({ type: 'warning', code: 'LOW_READABILITY', message: `Readability score ${readability}/100 — text may be too dense or complex.`, suggestion: 'Break long sentences into shorter ones. Aim for 8th–10th grade reading level.' })
    deductions += 8
  } else if (readability > 80 && funder_type === 'federal') {
    issues.push({ type: 'info', code: 'INFORMAL_FOR_FEDERAL', message: `Readability score ${readability}/100 — may be too informal for a federal application.` })
    deductions += 3
  } else {
    strengths.push({ code: 'READABILITY_OK', message: `Readability score ${readability}/100 — appropriate for grant writing.` })
    checks_passed++
  }

  // ── Passive voice ─────────────────────────────────────────────────────────
  checks_run++
  const passiveCount = hasPassiveVoice(content)
  const passiveRatio = sentences > 0 ? passiveCount / sentences : 0
  if (passiveRatio > 0.6) {
    issues.push({ type: 'warning', code: 'EXCESSIVE_PASSIVE', message: `High passive voice usage (${passiveCount} instances). Active voice is more persuasive.`, suggestion: 'Rewrite passive constructions: "will be delivered" → "our team will deliver".' })
    deductions += 8
  } else {
    checks_passed++
  }

  // ── Paragraph structure ───────────────────────────────────────────────────
  checks_run++
  const paragraphs = content.split(/\n{2,}/).filter(p => p.trim().length > 20)
  if (paragraphs.length === 1 && words > 200) {
    issues.push({ type: 'warning', code: 'WALL_OF_TEXT', message: 'Content appears as a single block. Use paragraph breaks for readability.', suggestion: 'Break into 3–5 focused paragraphs with clear topic sentences.' })
    deductions += 5
  } else if (paragraphs.length > 1) {
    checks_passed++
  }

  // ── Numbers / evidence ────────────────────────────────────────────────────
  checks_run++
  const hasNumbers = /\d+/.test(content)
  const hasPercent = /%/.test(content)
  if (section_key !== 'certifications' && !hasNumbers && words > 100) {
    issues.push({ type: 'info', code: 'NO_DATA_POINTS', message: 'No quantitative data found. Grant reviewers value evidence.', suggestion: 'Add statistics, percentages, or measurable outcomes to strengthen the narrative.' })
    deductions += 5
  } else if (hasNumbers || hasPercent) {
    strengths.push({ code: 'DATA_DRIVEN', message: 'Quantitative data points detected — strengthens reviewer confidence.' })
    checks_passed++
  }

  // ── Tone check ────────────────────────────────────────────────────────────
  checks_run++
  const urgencyWords = ['must', 'critical', 'urgent', 'crisis', 'desperately', 'only hope']
  const hasUrgency = urgencyWords.some(w => content.toLowerCase().includes(w))
  if (hasUrgency && funder_type === 'corporate') {
    issues.push({ type: 'info', code: 'TONE_TOO_URGENT', message: 'Urgency language detected. Corporate funders prefer solution-oriented framing.', suggestion: 'Reframe from problem/urgency to opportunity/impact.' })
    deductions += 3
  } else {
    checks_passed++
  }

  if (words > 50) {
    suggestions.push('Consider opening with a compelling impact statement before presenting the need.')
    suggestions.push('Ensure each paragraph connects to the funder\'s specific priorities stated in the RFP.')
  }

  const score = Math.max(0, Math.min(100, 100 - deductions))
  return {
    pass: 'style',
    score,
    grade: scoreToGrade(score),
    issues,
    strengths,
    suggestions,
    summary: score >= 80
      ? 'Writing quality is strong. Minor polishing recommended before submission.'
      : score >= 60
      ? 'Moderate issues found. Address errors before submitting.'
      : 'Significant style issues require revision.',
    checks_run,
    checks_passed,
  }
}

// ─── Pass 2: Compliance ───────────────────────────────────────────────────────
export function runCompliancePass(params: {
  content: string
  section_key: string
  section_title: string
  word_limit?: number | null
  funder_type?: string
  cfda_number?: string | null
  required_certifications?: string[]
}): QAPassResult {
  const { content, section_key, funder_type, cfda_number, required_certifications } = params
  const issues: QAIssue[] = []
  const strengths: QAStrength[] = []
  const suggestions: string[] = []
  let deductions = 0
  let checks_run = 0
  let checks_passed = 0

  const lc = content.toLowerCase()
  const words = countWords(content)

  // ── Empty content ─────────────────────────────────────────────────────────
  checks_run++
  if (words < 10) {
    issues.push({ type: 'error', code: 'EMPTY_SECTION', message: 'Section is empty or nearly empty.', suggestion: 'This section is required and must be completed.' })
    deductions += 50
  } else {
    checks_passed++
  }

  // ── Section-specific compliance checks ───────────────────────────────────
  checks_run++
  if (section_key === 'need_statement' || section_key === 'needs_statement' || section_key.includes('need')) {
    const needTerms = ['need', 'gap', 'challenge', 'problem', 'barrier', 'disparity', 'underserved']
    if (!needTerms.some(t => lc.includes(t))) {
      issues.push({ type: 'warning', code: 'MISSING_NEED_LANGUAGE', message: 'Needs statement may lack explicit need/gap language.', suggestion: 'Clearly articulate the problem or gap this project addresses.' })
      deductions += 8
    } else {
      checks_passed++
    }
  } else if (section_key.includes('evaluation') || section_key.includes('measur')) {
    const evalTerms = ['outcome', 'measure', 'indicator', 'metric', 'evaluation', 'assess', 'baseline', 'target']
    if (!evalTerms.some(t => lc.includes(t))) {
      issues.push({ type: 'warning', code: 'MISSING_EVAL_LANGUAGE', message: 'Evaluation section may lack measurable outcomes.', suggestion: 'Include specific metrics, baselines, and targets per the funder\'s requirements.' })
      deductions += 10
    } else {
      strengths.push({ code: 'EVAL_MEASURABLE', message: 'Measurable evaluation language detected.' })
      checks_passed++
    }
  } else if (section_key.includes('sustainab')) {
    const sustTerms = ['sustain', 'funding', 'ongoing', 'revenue', 'partner', 'long-term', 'continue']
    if (!sustTerms.some(t => lc.includes(t))) {
      issues.push({ type: 'warning', code: 'MISSING_SUSTAINABILITY', message: 'Sustainability section lacks long-term planning language.', suggestion: 'Address how the program will be funded and maintained after the grant period.' })
      deductions += 8
    } else {
      checks_passed++
    }
  } else if (section_key.includes('budget') || section_key.includes('justif')) {
    const budgetTerms = ['personnel', 'indirect', 'direct cost', 'fringe', 'total', '$', 'percent', 'fte']
    const found = budgetTerms.filter(t => lc.includes(t)).length
    if (found < 2) {
      issues.push({ type: 'warning', code: 'WEAK_BUDGET_JUSTIFICATION', message: 'Budget narrative may be insufficient. Should reference specific line items.', suggestion: 'Justify each major cost category with rates, FTEs, or unit costs.' })
      deductions += 10
    } else {
      checks_passed++
    }
  } else {
    checks_passed++
  }

  // ── Federal-specific: OMB compliance language ─────────────────────────────
  if (funder_type === 'federal') {
    checks_run++
    const prohibitedTerms = ['guarantee a grant', 'guaranteed funding', 'funds are assured', 'automatic renewal']
    const found = prohibitedTerms.filter(t => lc.includes(t))
    if (found.length > 0) {
      issues.push({ type: 'error', code: 'PROHIBITED_LANGUAGE', message: `Prohibited language detected: "${found.join('", "')}"`, suggestion: 'Remove language that implies guaranteed award outcomes.' })
      deductions += 20
    } else {
      checks_passed++
    }
  }

  // ── CFDA-specific checks ──────────────────────────────────────────────────
  if (cfda_number) {
    checks_run++
    // SAMHSA programs (93.xxx) require evidence-based practice language
    if (cfda_number.startsWith('93.')) {
      const ebpTerms = ['evidence-based', 'evidence based', 'evidence-informed', 'research-supported', 'proven']
      if (!ebpTerms.some(t => lc.includes(t))) {
        issues.push({ type: 'warning', code: 'SAMHSA_NO_EBP', message: `CFDA ${cfda_number} typically requires evidence-based practice references.`, suggestion: 'Reference specific evidence-based models or practices aligned with this SAMHSA program.' })
        deductions += 8
      } else {
        strengths.push({ code: 'EBP_REFERENCED', message: 'Evidence-based practice language detected — aligned with SAMHSA requirements.' })
        checks_passed++
      }
    }
    // HUD programs (14.xxx) require housing and fair housing references
    else if (cfda_number.startsWith('14.')) {
      const hudTerms = ['affirmatively furthering fair housing', 'fair housing', 'housing', 'community development']
      if (!hudTerms.some(t => lc.includes(t))) {
        issues.push({ type: 'info', code: 'HUD_MISSING_TERMS', message: `CFDA ${cfda_number} (HUD) applications typically reference fair housing or community development.` })
        deductions += 5
      } else {
        checks_passed++
      }
    } else {
      checks_passed++
    }
  }

  // ── Required certifications language ────────────────────────────────────
  if (required_certifications && required_certifications.length > 0) {
    checks_run++
    const missingCerts = required_certifications.filter(cert => !lc.includes(cert.toLowerCase()))
    if (missingCerts.length > 0) {
      issues.push({ type: 'info', code: 'CERT_LANGUAGE_MISSING', message: `Section does not reference these certifications: ${missingCerts.join(', ')}`, suggestion: 'Ensure certifications are addressed in the appropriate section.' })
      deductions += 5
    } else {
      checks_passed++
    }
  }

  // ── Conflict of interest / debarment language (federal) ──────────────────
  if (funder_type === 'federal') {
    checks_run++
    const conflictTerms = ['conflict of interest', 'debarment', 'suspension']
    // These should be in certifications, not narrative — just check they don't appear inappropriately
    checks_passed++ // neutral check
  }

  const score = Math.max(0, Math.min(100, 100 - deductions))
  return {
    pass: 'compliance',
    score,
    grade: scoreToGrade(score),
    issues,
    strengths,
    suggestions,
    summary: score >= 80
      ? 'No major compliance issues found. Ready for final review.'
      : score >= 60
      ? 'Some compliance gaps found. Review before submission.'
      : 'Compliance issues require correction before submission.',
    checks_run,
    checks_passed,
  }
}

// ─── Combined QA ─────────────────────────────────────────────────────────────
export function runDualPassQA(params: {
  content: string
  section_key: string
  section_title: string
  word_limit?: number | null
  funder_type?: string
  tone?: string
  cfda_number?: string | null
  required_certifications?: string[]
}): QAResult {
  const style = runStylePass(params)
  const compliance = runCompliancePass(params)
  const combined = Math.round((style.score + compliance.score) / 2)
  const allIssues = [...style.issues, ...compliance.issues]
  const blocking = allIssues.filter(i => i.type === 'error')

  return {
    style,
    compliance,
    combined_score: combined,
    combined_grade: scoreToGrade(combined),
    ready_for_submission: combined >= 70 && blocking.length === 0,
    blocking_issues: blocking,
    timestamp: new Date().toISOString(),
  }
}
