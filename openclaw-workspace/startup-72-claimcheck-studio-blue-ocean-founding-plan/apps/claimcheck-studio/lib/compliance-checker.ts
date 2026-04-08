/**
 * Compliance Checker — rule-based (pattern phase)
 * Scans generated content for FDA/EMA/General compliance flags.
 * LLM-based rules (Phase 3+) are placeholders here.
 */

export type ComplianceSeverity = 'error' | 'warning' | 'info'
export type ComplianceCategory = 'absolute_claim' | 'fair_balance' | 'off_label' | 'superlative' | 'unsubstantiated'

export interface ComplianceFlag {
  ruleCode: string
  category: ComplianceCategory
  severity: ComplianceSeverity
  matchedText: string
  suggestion: string
  regulatoryRef: string
  sentenceIndex: number
}

interface ComplianceRule {
  code: string
  category: ComplianceCategory
  severity: ComplianceSeverity
  pattern: RegExp
  suggestion: string
  regulatoryRef: string
}

const GENERAL_RULES: ComplianceRule[] = [
  {
    code: 'GEN_001a',
    category: 'absolute_claim',
    severity: 'error',
    pattern: /\b(cures?|cure all|eliminates?\s+(?:cancer|disease|pain)|prevents?\s+all|guarantees?|100%\s+(?:effective|safe|cure))\b/i,
    suggestion: "Replace with qualified language: 'may help reduce', 'has been shown to', 'can reduce the risk of'",
    regulatoryRef: 'FTC Health Claims Guidelines',
  },
  {
    code: 'GEN_001b',
    category: 'absolute_claim',
    severity: 'error',
    pattern: /\bproven to\s+(?:cure|prevent|eliminate|reverse|stop)\b/i,
    suggestion: "Replace 'proven to' with 'shown in clinical trials to' or 'associated with'",
    regulatoryRef: 'FTC 15 USC 45',
  },
  {
    code: 'GEN_002a',
    category: 'superlative',
    severity: 'warning',
    pattern: /\b(the\s+(?:most|best|safest|only|first)\s+(?:effective|proven|approved|available))\b/i,
    suggestion: 'Superlative claims require comparative evidence. Add specific comparison or remove superlative.',
    regulatoryRef: 'FTC 15 USC 45',
  },
  {
    code: 'GEN_002b',
    category: 'superlative',
    severity: 'warning',
    pattern: /\b(no\s+side\s+effects?|completely\s+safe|perfectly\s+safe|zero\s+risk)\b/i,
    suggestion: "Remove or qualify: 'well-tolerated in studies', 'adverse events were uncommon'",
    regulatoryRef: 'FTC Health Claims Guidelines',
  },
]

const FDA_RULES: ComplianceRule[] = [
  {
    code: 'FDA_003a',
    category: 'absolute_claim',
    severity: 'error',
    pattern: /\b(eliminates\s+cancer|reverses\s+(?:diabetes|alzheimer|disease)|permanently\s+cures?|no\s+side\s+effects?)\b/i,
    suggestion: 'Absolute efficacy claims are prohibited for drugs and devices. Use statistical language.',
    regulatoryRef: '21 CFR 202.1(e)(6)',
  },
  {
    code: 'FDA_004a',
    category: 'superlative',
    severity: 'warning',
    pattern: /\b(first-in-class|breakthrough|revolutionary|miracle|wonder\s+drug)\b/i,
    suggestion: "Only use 'breakthrough' if the drug holds FDA Breakthrough Therapy Designation.",
    regulatoryRef: 'FDA Draft Guidance: Principles of Promotional Materials',
  },
]

const EMA_RULES: ComplianceRule[] = [
  {
    code: 'EMA_003a',
    category: 'superlative',
    severity: 'warning',
    pattern: /\b(revolutionary|breakthrough\s+treatment|miracle\s+cure|wonder)\b/i,
    suggestion: 'Avoid superlative and sensational language in medicinal product promotion.',
    regulatoryRef: 'Directive 2001/83/EC Article 87',
  },
]

// Tokenize content into sentences for per-sentence scanning
function tokenizeSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map(s => s.trim())
    .filter(s => s.length > 10)
}

export function checkCompliance(
  content: string,
  territory: 'general' | 'fda_us' | 'ema_eu' | 'fda_ema' = 'general'
): ComplianceFlag[] {
  const rules: ComplianceRule[] = [...GENERAL_RULES]
  if (territory === 'fda_us' || territory === 'fda_ema') rules.push(...FDA_RULES)
  if (territory === 'ema_eu' || territory === 'fda_ema') rules.push(...EMA_RULES)

  const sentences = tokenizeSentences(content)
  const flags: ComplianceFlag[] = []

  sentences.forEach((sentence, sentenceIndex) => {
    for (const rule of rules) {
      const match = rule.pattern.exec(sentence)
      if (match) {
        flags.push({
          ruleCode: rule.code,
          category: rule.category,
          severity: rule.severity,
          matchedText: match[0],
          suggestion: rule.suggestion,
          regulatoryRef: rule.regulatoryRef,
          sentenceIndex,
        })
      }
    }
  })

  return flags
}

export function hasComplianceErrors(flags: ComplianceFlag[]): boolean {
  return flags.some(f => f.severity === 'error')
}
