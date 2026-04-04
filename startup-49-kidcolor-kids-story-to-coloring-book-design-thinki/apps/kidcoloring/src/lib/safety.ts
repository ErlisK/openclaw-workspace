/**
 * src/lib/safety.ts — Content safety filter for KidColoring
 * FILTER VERSION: v1.3
 *
 * PIPELINE (6 stages):
 *   1. Hard block      — instant reject on known harmful terms (50+)
 *   2. PII detection   — block personal info patterns (phone, email, address)
 *   3. Semantic scan   — catch harmful *combinations* and coded language
 *   4. Age-adaptive    — stricter rules for younger age profiles (2-4, 5-7)
 *   5. Substitutions   — replace soft-flag terms with safe equivalents
 *   6. Style lock      — enforce COPPA-safe coloring-book suffix
 *
 * NSFW HEURISTICS (post-generation, see image-moderator.ts):
 *   - Skin-tone pixel ratio threshold (>35% warm pixels = flag)
 *   - Aspect ratio deviation for portrait-style images
 *   - Pollinations safety header inspection
 *
 * COPPA compliance:
 *   - No child PII accepted
 *   - No realistic human generation
 *   - Age as integer range string only
 *   - Parent consent required for child profiles
 *
 * CHANGES from v1.2:
 *   - Semantic combination scanner (new Stage 3)
 *   - Age-adaptive filter profiles: toddler / elementary / tween
 *   - Expanded hard block list (30 new terms)
 *   - Coded language detection (l33tspeak, symbol substitution)
 *   - Risk score now 0-100 with calibrated weights
 *   - `nsfw_score` added to SafetyResult (prompt-level heuristic)
 *   - `semanticScore` added to SafetyResult
 */

// ── Filter version ────────────────────────────────────────────────────────────
export const FILTER_VERSION = 'v1.3'

// ── Age profiles ─────────────────────────────────────────────────────────────
export type AgeProfile = 'toddler' | 'elementary' | 'tween' | 'all'

export function ageToProfile(ageYears: number): AgeProfile {
  if (ageYears <= 4) return 'toddler'
  if (ageYears <= 7) return 'elementary'
  if (ageYears <= 11) return 'tween'
  return 'all'
}

export function ageRangeToProfile(range: string): AgeProfile {
  const match = range.match(/\d+/)
  const low   = match ? parseInt(match[0]) : 6
  return ageToProfile(low)
}

// ── Hard block list ───────────────────────────────────────────────────────────
const HARD_BLOCK: string[] = [
  // Violence / gore
  'blood', 'gore', 'kill', 'murder', 'dead body', 'corpse', 'weapon',
  'gun', 'knife', 'sword fight', 'stab', 'shoot', 'explosion', 'bomb',
  'war scene', 'battlefield', 'torture', 'assault', 'attack scene',
  'punching', 'strangling', 'abuse', 'beating', 'execute', 'execution',
  // Adult / sexual content
  'naked', 'nude', 'sexy', 'bikini', 'lingerie', 'adult', 'xxx',
  'pornography', 'erotic', 'sexual', 'undressed', 'topless', 'intimate',
  'explicit', 'nsfw', 'hentai', 'ecchi', 'lewd', 'fetish',
  // Horror / disturbing
  'horror', 'scary monster', 'demon', 'devil', 'satanic', 'hell scene',
  'nightmare', 'creepy clown', 'jumpscare', 'possessed', 'hellfire',
  'cursed', 'ritual', 'occult', 'conjure',
  // Hate / discrimination
  'racist', 'slur', 'hate speech', 'nazi', 'swastika', 'kkk',
  'genocide', 'ethnic cleansing', 'white power', 'white supremacy',
  // Substance abuse
  'drug', 'cocaine', 'heroin', 'marijuana', 'cannabis', 'meth',
  'alcohol', 'drunk', 'smoking', 'vaping', 'cigarette', 'weed', 'pipe',
  // Self-harm
  'suicide', 'self harm', 'cutting', 'overdose', 'hanging', 'noose',
  // Real-person misinformation risk
  'real photo of', 'realistic person', 'celebrity', 'president',
  'politician', 'real child', 'photorealistic kid',
  // Grooming risk
  'alone with adult', 'secret meeting', 'dont tell parents',
]

// ── Coded language decoder ────────────────────────────────────────────────────
// L33tspeak and symbol substitutions used to bypass filters
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '7': 't', '@': 'a', '$': 's', '!': 'i', '+': 't',
}

function decodeLeet(input: string): string {
  return input.split('').map(c => LEET_MAP[c] ?? c).join('')
}

// ── Semantic combinations ─────────────────────────────────────────────────────
// Harmful *combinations* of otherwise-benign words
interface SemanticRule {
  terms:    string[]     // ALL must be present
  category: string
  score:    number
  block?:   boolean      // upgrade to hard block if true
}

const SEMANTIC_RULES: SemanticRule[] = [
  { terms: ['child', 'undress'],       category: 'grooming',  score: 100, block: true  },
  { terms: ['little', 'naked'],        category: 'grooming',  score: 100, block: true  },
  { terms: ['kid', 'bedroom', 'alone'],category: 'grooming',  score: 80,  block: true  },
  { terms: ['fight', 'blood'],         category: 'violence',  score: 90,  block: true  },
  { terms: ['knife', 'person'],        category: 'violence',  score: 85,  block: true  },
  { terms: ['gun', 'school'],          category: 'violence',  score: 100, block: true  },
  { terms: ['explosion', 'building'],  category: 'violence',  score: 80,  block: true  },
  { terms: ['drink', 'drive'],         category: 'dui',       score: 40              },
  { terms: ['smoke', 'cool', 'kid'],   category: 'substance', score: 50              },
  { terms: ['older', 'younger', 'kiss'],category: 'age_risk', score: 60, block: true  },
  { terms: ['real', 'person', 'coloring'], category: 'real_person', score: 30       },
]

// ── Soft flag list ────────────────────────────────────────────────────────────
const SOFT_FLAGS: Record<string, { category: string; score: number }> = {
  // Mildly scary — OK for elementary+ but flag for review
  'skeleton':       { category: 'mild_scary',     score: 10 },
  'ghost':          { category: 'mild_scary',     score: 5  },
  'witch':          { category: 'mild_scary',     score: 5  },
  'vampire':        { category: 'mild_scary',     score: 15 },
  'zombie':         { category: 'mild_scary',     score: 20 },
  'monster':        { category: 'mild_scary',     score: 10 },
  'werewolf':       { category: 'mild_scary',     score: 15 },
  'dragon':         { category: 'mild_fantasy',   score: 2  },
  'wolf':           { category: 'mild_fantasy',   score: 2  },
  // Fantasy weapons
  'sword':          { category: 'fantasy_weapon', score: 5  },
  'bow and arrow':  { category: 'fantasy_weapon', score: 5  },
  'magic wand':     { category: 'fantasy_weapon', score: 0  },
  'shield':         { category: 'fantasy_weapon', score: 0  },
  // PII risk
  'phone number':   { category: 'pii',            score: 30 },
  'address':        { category: 'pii',            score: 20 },
  'school name':    { category: 'pii',            score: 20 },
  'home':           { category: 'pii',            score: 5  },
  // Trademark (legal risk)
  'mickey mouse':   { category: 'trademark',      score: 15 },
  'peppa pig':      { category: 'trademark',      score: 15 },
  'pokemon':        { category: 'trademark',      score: 10 },
  'minecraft':      { category: 'trademark',      score: 10 },
  'fortnite':       { category: 'trademark',      score: 25 },
  'roblox':         { category: 'trademark',      score: 15 },
  'among us':       { category: 'trademark',      score: 10 },
  // Age-ambiguous
  'teenager':       { category: 'age_ambiguous',  score: 10 },
  'teen':           { category: 'age_ambiguous',  score: 10 },
  'sexy':           { category: 'nsfw',           score: 50 },
  'hot':            { category: 'nsfw',           score: 5  },
  // Disturbing but not blockable
  'graveyard':      { category: 'mild_scary',     score: 8  },
  'cemetery':       { category: 'mild_scary',     score: 8  },
  'skull':          { category: 'mild_scary',     score: 12 },
  'dark':           { category: 'mild_scary',     score: 2  },
  'evil':           { category: 'mild_scary',     score: 15 },
}

// ── Age-adaptive extra blocks ─────────────────────────────────────────────────
// Additional terms blocked for younger age profiles
const TODDLER_EXTRA_BLOCK: string[] = [
  'skeleton', 'graveyard', 'cemetery', 'skull', 'ghost', 'spider',
  'bat', 'thunder', 'lightning', 'fire', 'fight', 'scary', 'dark',
  'wolf', 'snake', 'witch', 'evil',
]

const ELEMENTARY_EXTRA_BLOCK: string[] = [
  'zombie', 'vampire', 'werewolf', 'monster', 'skull',
  'graveyard', 'cemetery', 'evil', 'gun', 'knife', 'sword',
]

// ── Safe substitutions ────────────────────────────────────────────────────────
const SUBSTITUTIONS: Record<string, string> = {
  'zombie':         'friendly ghost',
  'vampire':        'magical bat',
  'werewolf':       'friendly wolf',
  'monster':        'friendly creature',
  'skeleton':       'happy dinosaur fossil',
  'sword':          'magic wand',
  'gun':            'magic wand',
  'bomb':           'bubble',
  'ghost':          'friendly ghost',
  'witch':          'friendly wizard',
  'demon':          'mischievous imp',
  'devil':          'silly red creature',
  'mickey mouse':   'cartoon mouse',
  'peppa pig':      'cartoon pig',
  'pokemon':        'pocket monster',
  'minecraft':      'pixel character',
  'fortnite':       'cartoon game character',
  'roblox':         'block game character',
  'skull':          'funny bone',
  'graveyard':      'magical garden',
  'cemetery':       'peaceful garden',
  'evil':           'mischievous',
  'bat':            'friendly bat',
  'spider':         'friendly spider',
  'snake':          'friendly snake',
  'dark':           'nighttime',
  'wolf':           'friendly wolf',
}

// ── Required safety suffix ────────────────────────────────────────────────────
export const SAFETY_SUFFIX =
  ", children's coloring book style, safe for kids age 3-12, G-rated, " +
  "friendly and cheerful, no scary elements, no adult themes"

// ── PII patterns ──────────────────────────────────────────────────────────────
const PII_PATTERNS: RegExp[] = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,               // phone
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // email
  /\b\d{1,5}\s+\w+\s+(st|ave|blvd|road|lane|dr|way)\b/i, // street address
  /\bsocial security\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,                            // SSN
]

// ── Types ─────────────────────────────────────────────────────────────────────
export type ModerationAction = 'allow' | 'sanitize' | 'block'

export interface SafetyResult {
  action:          ModerationAction
  promptRaw:       string
  promptSafe:      string
  flags:           string[]
  flagCategories:  Record<string, number>
  riskScore:       number       // 0–100
  nsfw_score:      number       // 0–100, prompt-level NSFW heuristic
  semanticScore:   number       // 0–100, semantic combination risk
  filterVersion:   string
  blocked:         boolean
  sanitized:       boolean
  ageProfile:      AgeProfile
  requiresReview:  boolean      // risk ≥ 30 but not blocked
}

// ── Main filter ───────────────────────────────────────────────────────────────
export function runSafetyFilter(
  promptRaw:   string,
  ageProfile?: AgeProfile,
): SafetyResult {
  const profile    = ageProfile ?? 'all'
  const lower      = promptRaw.toLowerCase()
  const decoded    = decodeLeet(lower)
  const flags:     string[] = []
  const flagCategories: Record<string, number> = {}
  let riskScore    = 0
  let semanticScore = 0
  let nsfw_score   = 0

  // ── Stage 1: Hard block ──────────────────────────────────────────────────
  for (const term of HARD_BLOCK) {
    if (decoded.includes(term) || lower.includes(term)) {
      flags.push(`BLOCK:${term}`)
      flagCategories['hard_block'] = (flagCategories['hard_block'] ?? 0) + 1
      riskScore = 100
    }
  }

  // ── Stage 1b: Age-adaptive extra blocks ─────────────────────────────────
  if (profile === 'toddler') {
    for (const term of TODDLER_EXTRA_BLOCK) {
      if (lower.includes(term)) {
        flags.push(`BLOCK:${term}[toddler]`)
        flagCategories['age_block'] = (flagCategories['age_block'] ?? 0) + 1
        riskScore = 100
      }
    }
  } else if (profile === 'elementary') {
    for (const term of ELEMENTARY_EXTRA_BLOCK) {
      if (lower.includes(term)) {
        flags.push(`BLOCK:${term}[elementary]`)
        flagCategories['age_block'] = (flagCategories['age_block'] ?? 0) + 1
        riskScore = 100
      }
    }
  }

  if (riskScore >= 100) {
    return {
      action: 'block', promptRaw, promptSafe: '', flags,
      flagCategories, riskScore: 100, nsfw_score: 100, semanticScore: 0,
      filterVersion: FILTER_VERSION, blocked: true, sanitized: false,
      ageProfile: profile, requiresReview: false,
    }
  }

  // ── Stage 2: PII detection ───────────────────────────────────────────────
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
      flagCategories, riskScore: 100, nsfw_score: 0, semanticScore: 0,
      filterVersion: FILTER_VERSION, blocked: true, sanitized: false,
      ageProfile: profile, requiresReview: false,
    }
  }

  // ── Stage 3: Semantic combination scan ──────────────────────────────────
  for (const rule of SEMANTIC_RULES) {
    const allPresent = rule.terms.every(t => lower.includes(t))
    if (allPresent) {
      flags.push(`SEMANTIC:${rule.category}`)
      flagCategories[rule.category] = (flagCategories[rule.category] ?? 0) + 1
      semanticScore = Math.max(semanticScore, rule.score)
      if (rule.block) riskScore = 100
    }
  }

  if (riskScore >= 100) {
    return {
      action: 'block', promptRaw, promptSafe: '', flags,
      flagCategories, riskScore: 100, nsfw_score: 0, semanticScore,
      filterVersion: FILTER_VERSION, blocked: true, sanitized: false,
      ageProfile: profile, requiresReview: false,
    }
  }

  // ── Stage 4: Soft flags ──────────────────────────────────────────────────
  let promptSafe = promptRaw
  let sanitized  = false

  for (const [term, meta] of Object.entries(SOFT_FLAGS)) {
    if (lower.includes(term)) {
      flags.push(`FLAG:${term}`)
      flagCategories[meta.category] = (flagCategories[meta.category] ?? 0) + 1
      riskScore   += meta.score
      if (meta.category === 'nsfw') nsfw_score += meta.score
    }
  }

  // ── Stage 5: Substitutions ───────────────────────────────────────────────
  for (const [term, replacement] of Object.entries(SUBSTITUTIONS)) {
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    if (regex.test(promptSafe)) {
      promptSafe = promptSafe.replace(regex, replacement)
      flags.push(`SUB:${term}->${replacement}`)
      sanitized  = true
    }
  }

  // ── Stage 6: Style lock ──────────────────────────────────────────────────
  const cleanPrompt = promptSafe
    .replace(/,\s*children['']s coloring book.*$/i, '')
    .replace(/,\s*safe for kids.*$/i, '')
    .trim()
  promptSafe = cleanPrompt + SAFETY_SUFFIX

  // Incorporate semantic score into risk
  riskScore = Math.min(Math.round(Math.max(riskScore, semanticScore * 0.5)), 99)
  nsfw_score = Math.min(nsfw_score, 99)

  const requiresReview = riskScore >= 30 && riskScore < 100
  const action: ModerationAction =
    sanitized || riskScore > 20 ? 'sanitize' : 'allow'

  return {
    action, promptRaw, promptSafe, flags,
    flagCategories, riskScore, nsfw_score, semanticScore,
    filterVersion: FILTER_VERSION, blocked: false,
    sanitized: sanitized || riskScore > 20,
    ageProfile: profile, requiresReview,
  }
}

// ── sanitizeHeroName ──────────────────────────────────────────────────────────
export function sanitizeHeroName(
  name:       string,
  ageProfile?: AgeProfile,
): { safe: string; flagged: boolean } {
  let safe = name.replace(/[^\w\s]/g, '').trim().slice(0, 24)
  safe     = safe.replace(/\s+/g, ' ')
  const lower = safe.toLowerCase()
  const blocked = HARD_BLOCK.some(t => lower.includes(t))
    || (ageProfile === 'toddler' && TODDLER_EXTRA_BLOCK.some(t => lower.includes(t)))
  if (blocked || !safe) return { safe: 'the hero', flagged: true }
  return { safe, flagged: false }
}

// ── sanitizeInterest ──────────────────────────────────────────────────────────
export function sanitizeInterest(
  term:       string,
  ageProfile?: AgeProfile,
): { safe: string; flagged: boolean } {
  let safe = term.replace(/[^\w\s-]/g, '').trim().slice(0, 32).toLowerCase()
  const result = runSafetyFilter(safe, ageProfile)
  if (result.blocked) return { safe: 'animals', flagged: true }
  const subMap = SUBSTITUTIONS
  if (result.sanitized) {
    for (const [term, rep] of Object.entries(subMap)) {
      safe = safe.replace(
        new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
        rep
      )
    }
  }
  return { safe, flagged: result.flags.length > 0 }
}

// ── buildSafePrompt ───────────────────────────────────────────────────────────
// Convenience: run filter and return the safe prompt (or throw if blocked)
export function buildSafePrompt(
  raw:        string,
  ageProfile?: AgeProfile,
): string {
  const result = runSafetyFilter(raw, ageProfile)
  if (result.blocked) throw new Error(`content_blocked: ${result.flags.join(', ')}`)
  return result.promptSafe
}
