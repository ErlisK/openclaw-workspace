/**
 * src/lib/safety.ts — Content safety filter for KidColoring
 *
 * ARCHITECTURE
 *   All prompts pass through this filter before:
 *     1. Being stored as trial_pages.prompt
 *     2. Being sent to Pollinations.ai
 *
 *   The filter runs in three stages:
 *     Stage 1 — Hard block: immediately reject known harmful terms
 *     Stage 2 — Sanitize: replace risky terms with safe alternatives
 *     Stage 3 — Enforce style: append COPPA-safe coloring-book suffix
 *
 * DESIGN PRINCIPLES (COPPA / CIPA)
 *   - No adult content
 *   - No graphic violence
 *   - No PII collection from children
 *   - No real names of real people that could mislead
 *   - All generated images are line art / coloring pages (style-locked)
 *
 * FILTER VERSION: v1.2
 *   v1.0 — initial blocklist (50 terms)
 *   v1.1 — added PII patterns, real-person detection
 *   v1.2 — hero name sanitization, enhanced substitution map, risk scoring
 */

// ── Filter version (bump when blocklist changes) ────────────────────────────
export const FILTER_VERSION = 'v1.2'

// ── Hard block list ──────────────────────────────────────────────────────────
// Any prompt containing these terms is BLOCKED entirely (no image generated).
// Kept as lowercase normalized strings.
const HARD_BLOCK: string[] = [
  // Violence / gore
  'blood', 'gore', 'kill', 'murder', 'dead body', 'corpse', 'weapon',
  'gun', 'knife', 'sword fight', 'stab', 'shoot', 'explosion', 'bomb',
  'war scene', 'battlefield',
  // Adult / sexual content
  'naked', 'nude', 'sexy', 'bikini', 'lingerie', 'adult', 'xxx',
  'pornography', 'erotic', 'sexual', 'undressed', 'topless',
  // Horror / disturbing
  'horror', 'scary monster', 'demon', 'devil', 'satanic', 'hell scene',
  'nightmare', 'creepy clown', 'jumpscare',
  // Hate / discrimination
  'racist', 'slur', 'hate speech', 'nazi', 'swastika', 'kkk',
  // Substance abuse
  'drug', 'cocaine', 'heroin', 'marijuana', 'alcohol', 'drunk', 'smoking',
  // Self-harm
  'suicide', 'self harm', 'cutting', 'overdose',
  // Real-person misinformation risk
  'real photo of', 'realistic person', 'celebrity', 'president',
]

// ── Soft flag list ───────────────────────────────────────────────────────────
// Terms that raise risk score and trigger review but don't block outright.
const SOFT_FLAGS: Record<string, { category: string; score: number }> = {
  // Mildly scary OK for older kids but flag for review
  'skeleton':       { category: 'mild_scary',  score: 10 },
  'ghost':          { category: 'mild_scary',  score: 5  },
  'witch':          { category: 'mild_scary',  score: 5  },
  'vampire':        { category: 'mild_scary',  score: 15 },
  'zombie':         { category: 'mild_scary',  score: 20 },
  'monster':        { category: 'mild_scary',  score: 10 },
  'werewolf':       { category: 'mild_scary',  score: 15 },
  // Weapons that are fantasy-OK but flag
  'sword':          { category: 'fantasy_weapon', score: 5  },
  'bow and arrow':  { category: 'fantasy_weapon', score: 5  },
  'magic wand':     { category: 'fantasy_weapon', score: 0  },
  // PII risk
  'phone number':   { category: 'pii',         score: 30 },
  'address':        { category: 'pii',         score: 20 },
  'school name':    { category: 'pii',         score: 20 },
  // Competitive brand mention (legal risk)
  'mickey mouse':   { category: 'trademark',   score: 15 },
  'peppa pig':      { category: 'trademark',   score: 15 },
  'pokemon':        { category: 'trademark',   score: 10 },
  'minecraft':      { category: 'trademark',   score: 10 },
  'fortnite':       { category: 'trademark',   score: 25 },
  // Ambiguous age
  'teenager':       { category: 'age_ambiguous', score: 10 },
  'teen':           { category: 'age_ambiguous', score: 10 },
}

// ── Safe substitutions ───────────────────────────────────────────────────────
// Replace risky terms with child-safe equivalents before building the prompt.
const SUBSTITUTIONS: Record<string, string> = {
  'zombie':       'friendly ghost',
  'vampire':      'magical bat',
  'werewolf':     'friendly wolf',
  'monster':      'friendly creature',
  'skeleton':     'happy dinosaur skeleton',
  'sword':        'magic wand',
  'gun':          'magic wand',
  'bomb':         'bubble',
  'ghost':        'friendly ghost',
  'witch':        'friendly wizard',
  'demon':        'mischievous imp',
  'devil':        'silly red creature',
  'mickey mouse': 'cartoon mouse',
  'peppa pig':    'cartoon pig',
  'pokemon':      'pocket monster',
  'minecraft':    'pixel character',
  'fortnite':     'cartoon game character',
}

// ── Required safety suffix (appended to ALL prompts) ────────────────────────
const SAFETY_SUFFIX =
  ", children's coloring book style, safe for kids age 3-12, G-rated, " +
  "friendly and cheerful, no scary elements, no adult themes"

// ── PII pattern detector ─────────────────────────────────────────────────────
const PII_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,           // phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,  // email
  /\b\d{1,5}\s\w+\s(st|ave|blvd|road|lane|dr|way)\b/i,    // street address
]

// ── Types ─────────────────────────────────────────────────────────────────────
export type ModerationAction = 'allow' | 'sanitize' | 'block'

export interface SafetyResult {
  action: ModerationAction
  promptRaw: string
  promptSafe: string
  flags: string[]
  flagCategories: Record<string, number>  // category → count
  riskScore: number                       // 0–100
  filterVersion: string
  blocked: boolean
  sanitized: boolean
}

// ── Main filter function ──────────────────────────────────────────────────────
/**
 * runSafetyFilter(prompt) — run all three stages.
 *
 * Returns a SafetyResult. If blocked=true, do NOT generate an image.
 * If sanitized=true, use promptSafe instead of promptRaw.
 */
export function runSafetyFilter(promptRaw: string): SafetyResult {
  const lower = promptRaw.toLowerCase()
  const flags: string[] = []
  const flagCategories: Record<string, number> = {}
  let riskScore = 0

  // ── Stage 1: Hard block ─────────────────────────────────────────────────
  for (const term of HARD_BLOCK) {
    if (lower.includes(term)) {
      flags.push(`BLOCK:${term}`)
      flagCategories['hard_block'] = (flagCategories['hard_block'] ?? 0) + 1
      riskScore = 100
    }
  }
  if (riskScore >= 100) {
    return {
      action: 'block', promptRaw, promptSafe: '', flags,
      flagCategories, riskScore: 100, filterVersion: FILTER_VERSION,
      blocked: true, sanitized: false,
    }
  }

  // ── Stage 2: PII check ──────────────────────────────────────────────────
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(promptRaw)) {
      flags.push('BLOCK:pii_detected')
      flagCategories['pii'] = (flagCategories['pii'] ?? 0) + 1
      riskScore = 100
    }
  }
  if (riskScore >= 100) {
    return {
      action: 'block', promptRaw, promptSafe: '', flags,
      flagCategories, riskScore: 100, filterVersion: FILTER_VERSION,
      blocked: true, sanitized: false,
    }
  }

  // ── Stage 3: Soft flags + substitutions ─────────────────────────────────
  let promptSafe = promptRaw
  let sanitized = false

  for (const [term, meta] of Object.entries(SOFT_FLAGS)) {
    if (lower.includes(term)) {
      flags.push(`FLAG:${term}`)
      flagCategories[meta.category] = (flagCategories[meta.category] ?? 0) + 1
      riskScore += meta.score
    }
  }

  for (const [term, replacement] of Object.entries(SUBSTITUTIONS)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi')
    if (regex.test(promptSafe)) {
      promptSafe = promptSafe.replace(regex, replacement)
      flags.push(`SUB:${term}->${replacement}`)
      sanitized = true
    }
  }

  // ── Stage 4: Enforce safety suffix ──────────────────────────────────────
  // Remove any existing style suffix to avoid duplication, then re-add
  const cleanPrompt = promptSafe.replace(/,\s*children's coloring book.*$/i, '').trim()
  promptSafe = cleanPrompt + SAFETY_SUFFIX

  // Clamp risk score
  riskScore = Math.min(Math.round(riskScore), 99)

  const action: ModerationAction = sanitized ? 'sanitize' : riskScore > 20 ? 'sanitize' : 'allow'

  return {
    action, promptRaw, promptSafe, flags,
    flagCategories, riskScore, filterVersion: FILTER_VERSION,
    blocked: false, sanitized: sanitized || riskScore > 20,
  }
}

/**
 * sanitizeHeroName(name) — used on free-form user input for the hero's name.
 * Strips non-alphanumeric chars, limits length, blocks known slurs.
 */
export function sanitizeHeroName(name: string): { safe: string; flagged: boolean } {
  // Strip all non-word chars except spaces
  let safe = name.replace(/[^\w\s]/g, '').trim().slice(0, 24)
  // Normalize whitespace
  safe = safe.replace(/\s+/g, ' ')
  // Check against hard block
  const lower = safe.toLowerCase()
  const flagged = HARD_BLOCK.some(t => lower.includes(t))
  if (flagged || !safe) {
    return { safe: 'the hero', flagged: true }
  }
  return { safe, flagged: false }
}

/**
 * sanitizeInterest(term) — used on free-text interest input from variant B.
 * Returns a safe, normalized interest string.
 */
export function sanitizeInterest(term: string): { safe: string; flagged: boolean } {
  let safe = term.replace(/[^\w\s-]/g, '').trim().slice(0, 32).toLowerCase()
  const result = runSafetyFilter(safe)
  if (result.blocked) {
    return { safe: 'animals', flagged: true }
  }
  // Return the cleaned text from the safe prompt (without suffix)
  safe = result.sanitized
    ? safe.replace(new RegExp(Object.keys(SUBSTITUTIONS).join('|'), 'gi'),
        m => SUBSTITUTIONS[m.toLowerCase()] ?? m)
    : safe
  return { safe, flagged: result.flags.length > 0 }
}
