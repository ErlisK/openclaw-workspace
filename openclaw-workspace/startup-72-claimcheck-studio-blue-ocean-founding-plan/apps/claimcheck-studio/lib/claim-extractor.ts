/**
 * Claim Extractor v3 — improved recall with scientific claim patterns
 */

export interface ExtractedClaim {
  text: string
  normalizedText: string
  positionIndex: number
  claimType: 'quantitative' | 'causal' | 'comparative' | 'epidemiological' | 'treatment' | 'general'
  confidence: number
}

function tokenizeSentences(text: string): string[] {
  const cleaned = text
    .replace(/(\b(?:Dr|Mr|Mrs|Ms|Prof|St|vs|etc|al|Fig|Tab|Eq|Ref|cf|approx|No|Vol|pp)\.)(\s)/g, '$1__SPACE__')
    .replace(/(\d+\.)(\s+[a-z])/g, '$1__SPACE__$2')

  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z\d])/)
    .map(s => s.replace(/__SPACE__/g, ' ').trim())
    .filter(s => s.length > 15 && s.length < 1000)

  return sentences
}

// Tier 1: strong evidence of a factual/quantitative claim
const TIER1_PATTERNS = [
  /\b\d+(\.\d+)?\s*%/i,                                      // any percentage
  /\b\d+(\.\d+)?\s*-\s*\d+(\.\d+)?\s*%/i,                   // range percent
  /\b(odds ratio|hazard ratio|relative risk|risk ratio|effect size|NNT|ARR|RRR|SMD)\b/i,
  /\bp\s*[<>=≤≥]\s*0\.\d+/i,                                // p-value
  /\b\d[\d,]*\s*(million|billion)\s+(people|patients|deaths|cases)/i,
  /\b(per\s+\d+[\d,]*\s*(population|patients|person|100,000|million))/i,
  /\b\d+(\.\d+)?\s*-fold\b/i,
  /\breduced?\s+by\s+\d/i,
  /\bincreased?\s+by\s+\d/i,
  /\b(sensitivity|specificity|accuracy|AUC|precision|recall)\s+(of\s+|was\s+|is\s+)?\d/i,
]

// Tier 2: epidemiological / causal / treatment signals
const TIER2_PATTERNS = [
  /\b(prevalence|incidence|mortality|morbidity|survival|death\s+rate|case\s+fatality)\b/i,
  /\b(affects?\s+\d|associated\s+with\s+\d|linked\s+to\s+\d)/i,
  /\b(causes?|leads?\s+to|results?\s+in|risk\s+factor|risk\s+of)\b/i,
  /\b(effective|efficacious|efficacy|effectiveness)\s+(for|in|against|of|was|is)\b/i,
  /\b(FDA[\s-]?approved|approved\s+by|first[\s-]line|standard\s+of\s+care|guideline|recommended\s+for)\b/i,
  /\b(clinical\s+trial|randomized|placebo[\s-]controlled|meta[\s-]analysis|systematic\s+review|cohort\s+study)\b/i,
  /\b(reduces?\s+risk|increases?\s+risk|lowers?\s+risk|higher\s+risk|lower\s+risk)\b/i,
  /\b(worldwide|globally|annual(?:ly)?|per\s+year|each\s+year)\b.*\b(deaths?|cases?|people|patients)\b/i,
  /\b(deaths?|cases?|people|patients)\b.*\b(worldwide|globally|annual(?:ly)?|per\s+year)\b/i,
  /\b(more\s+effective|as\s+effective|equivalent\s+to|comparable\s+to|superior\s+to|inferior\s+to)\b/i,
  /\b(vaccine|vaccination|therapy|treatment|medication|drug|supplement|intervention)\s+(reduces?|prevents?|achieves?|demonstrates?|shows?|improves?|protects?|lowers?)\b/i,
  /\b(reduces?|prevents?|achieves?|protects?|improves?|lowers?)\s+.{1,50}\b(vaccine|vaccination|therapy|treatment|medication)\b/i,
  /\b(according\s+to|demonstrated|shows?\s+that|found\s+that|revealed\s+that)\b/i,
  /\b\d+(\.\d+)?\s*(years?|months?|weeks?)\s+(of\s+)?(follow[\s-]up|survival|duration|protection)/i,
  /\b(approximately|about|nearly|roughly|up\s+to|more\s+than|at\s+least)\s+\d[\d,.]+\s*(million|billion|thousand|\%)/i,
  /\b(doubles?|triples?|quadruples?|halves?|halved)\b/i,
  /\b\d+\s+(of\s+every|\s*in\s*)\s*\d+\s*(adults?|children|people|patients|women|men)\b/i,
  /\baffects?\s+(approximately|about|nearly|roughly|over|more\s+than)?\s*\d[\d,.]+\s*(million|billion|%|people|patients)\b/i,
  /\b(projected|expected|estimated)\s+to\s+(reach|grow|increase|decrease|affect|exceed)\b/i,
  /\b(APOE|BRCA|MRSA|mRNA|HPV|HIV|CRISPR|PD-1|PD-L1|ACE|BMI|HbA1c|LDL|HDL|PM2\.5)\b/i,
]

const NOISE_PATTERNS = [
  /^(this|these|our|we\s+conducted|we\s+found|we\s+report|we\s+investigated|the\s+purpose|the\s+aim|in\s+this\s+study|the\s+following|figure|table|see\s+also|as\s+shown|note\s+that)/i,
  /^(references?|bibliography|acknowledgements?)\b/i,
  /\b(we\s+conducted|we\s+aimed|we\s+sought|this\s+study\s+aims?|the\s+objective\s+of|the\s+goal\s+of)\b/i,
]

function matchCount(sentence: string, patterns: RegExp[]): number {
  return patterns.filter(p => p.test(sentence)).length
}

export function extractClaims(text: string): ExtractedClaim[] {
  const sentences = tokenizeSentences(text)
  const claims: ExtractedClaim[] = []

  sentences.forEach((sentence, idx) => {
    if (NOISE_PATTERNS.some(p => p.test(sentence))) return

    const t1 = matchCount(sentence, TIER1_PATTERNS)
    const t2 = matchCount(sentence, TIER2_PATTERNS)

    // Accept if: any tier-1 hit, or ≥2 tier-2 hits, or 1 tier-2 + sentence has medical noun
    const hasMedicalNoun = /\b(patient|trial|study|cohort|participants?|population|disease|condition|cancer|diabetes|infection|mortality|risk|outcome|effect)\b/i.test(sentence)
    const qualifies = t1 > 0 || t2 >= 2 || (t2 >= 1 && hasMedicalNoun)

    if (!qualifies) return

    // Classify type
    let claimType: ExtractedClaim['claimType'] = 'general'
    if (t1 > 0) claimType = 'quantitative'
    else if (/\b(prevalence|incidence|mortality|death|survival|worldwide|globally|annually)\b/i.test(sentence)) claimType = 'epidemiological'
    else if (/\b(effective|efficacy|trial|treatment|vaccine|therapy|medication|approved|guideline)\b/i.test(sentence)) claimType = 'treatment'
    else if (/\b(causes?|leads?\s+to|associated\s+with|risk\s+factor)\b/i.test(sentence)) claimType = 'causal'
    else if (/\b(more\s+effective|superior|equivalent|comparable)\b/i.test(sentence)) claimType = 'comparative'

    const confidence = Math.min(0.65 + t1 * 0.08 + t2 * 0.04, 0.95)

    claims.push({
      text: sentence,
      normalizedText: sentence.toLowerCase().replace(/\s+/g, ' ').trim(),
      positionIndex: idx,
      claimType,
      confidence,
    })
  })

  // Deduplicate by Jaccard similarity
  const deduped = claims.filter((claim, i) =>
    !claims.slice(0, i).some(earlier =>
      jaccardSim(claim.normalizedText, earlier.normalizedText) > 0.82
    )
  )

  return deduped
}

function jaccardSim(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/))
  const setB = new Set(b.split(/\s+/))
  const intersection = [...setA].filter(x => setB.has(x)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}
