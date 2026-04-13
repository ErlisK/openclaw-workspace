import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/clips/[id]/titles
// Returns 3 title variants + hashtag suggestions for a clip
// Runs pure JS keyword extraction (no external deps needed at runtime)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clip, error } = await supabase
    .from('clip_outputs')
    .select('id, title, hashtags, hook_type, transcript_excerpt, platform, template_id, heuristic_signals')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !clip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const excerpt = clip.transcript_excerpt || ''
  const hookType = clip.hook_type || 'highlight'
  const platform = clip.platform || 'YouTube Shorts'
  const templateId = clip.template_id || 'podcast-pro-v02'

  // Extract keywords using lightweight JS engine
  const keywords = extractKeywords(excerpt, 15)

  // Generate 3 title variants
  const variants = generateTitleVariants(excerpt, hookType, keywords, 3)

  // Generate hashtags
  const hashtags = generateHashtags(platform, hookType, excerpt, keywords, 10)

  // Current title/hashtags
  const currentHashtags = parseHashtags(clip.hashtags)

  return NextResponse.json({
    clip_id: id,
    current_title: clip.title,
    current_hashtags: currentHashtags,
    variants,
    hashtags,
    keywords: keywords.slice(0, 8).map(k => k.term),
  })
}

// POST /api/clips/[id]/titles — save a chosen title variant
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, hashtags } = body

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const update: Record<string, unknown> = { title }
  if (hashtags) update.hashtags = Array.isArray(hashtags) ? JSON.stringify(hashtags) : hashtags

  const { data, error } = await supabase
    .from('clip_outputs')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, title, hashtags')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── Lightweight JS keyword/title/hashtag engine ───────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','i','you','we','they',
  'he','she','it','this','that','my','your','our','their','me','him','her',
  'so','then','just','very','really','also','even','still','like','as','if',
  'when','where','which','who','what','how','why','about','from','into',
  'not','no','can','more','some','such','too','s','t','ll','re','ve'
])

type KW = { term: string; score: number; isPhrase: boolean }

function extractKeywords(text: string, topN = 15): KW[] {
  if (!text) return []
  const words = text.toLowerCase().match(/[a-z']{3,}/g) || []
  const freq: Record<string, number> = {}
  for (const w of words) {
    if (!STOP_WORDS.has(w) && w.length >= 3) {
      freq[w] = (freq[w] || 0) + 1
    }
  }
  const total = Math.max(words.length, 1)
  // Bigrams
  const cleanWords = words.filter(w => !STOP_WORDS.has(w) && w.length >= 3)
  const bigrams: Record<string, number> = {}
  for (let i = 0; i < cleanWords.length - 1; i++) {
    const bg = `${cleanWords[i]} ${cleanWords[i+1]}`
    bigrams[bg] = (bigrams[bg] || 0) + 1
  }

  const result: KW[] = []

  for (const [term, count] of Object.entries(freq)) {
    const score = (count / total) * Math.log(count + 1)
    result.push({ term, score, isPhrase: false })
  }
  for (const [term, count] of Object.entries(bigrams)) {
    if (count >= 2) {
      result.push({ term, score: (count / total) * 2 * Math.log(count + 1), isPhrase: true })
    }
  }

  // High-value phrase boost
  const HV_PATTERNS = [
    /\b(the\s+)?(real\s+)?(truth|secret|reason|way|hack|trick|method|formula|system)\b/gi,
    /\b(biggest|most\s+important|key|critical|essential)\s+\w+\b/gi,
    /\b\d+\s+(tips|steps|ways|secrets|mistakes|lessons|things)\b/gi,
    /\b(nobody|everyone|most\s+people)\s+\w+\b/gi,
  ]
  for (const re of HV_PATTERNS) {
    for (const m of text.toLowerCase().matchAll(re)) {
      const phrase = m[0].trim()
      if (phrase.length >= 6 && phrase.length <= 40) {
        result.push({ term: phrase, score: 0.4, isPhrase: true })
      }
    }
  }

  return result
    .sort((a, b) => b.score - a.score)
    .filter((kw, i, arr) => arr.findIndex(k => k.term === kw.term) === i)
    .slice(0, topN)
}

const TITLE_TEMPLATES: Record<string, string[]> = {
  direct: [
    'Stop Making This {topic} Mistake',
    'The {topic} Secret Nobody Talks About',
    'Why Most People Get {topic} Wrong',
    '{number} {topic} Lessons That Took Me Years to Learn',
    'The Real Reason {topic} Actually Works',
    'This {topic} Advice Will Save You Years',
  ],
  question: [
    'Is Your {topic} Actually Working?',
    'What Nobody Tells You About {topic}',
    'Are You Making This {topic} Mistake?',
    'Should You Really {topic}?',
  ],
  story: [
    'How I Built {topic} From Nothing',
    'I Was Wrong About {topic} for {number} Years',
    'The {topic} Moment That Changed Everything',
  ],
  listicle: [
    '{number} Things About {topic} That Blew My Mind',
    '{number} {topic} Mistakes You\'re Probably Making',
    'Top {number} {topic} Tips Nobody Shares',
  ],
  contrast: [
    '{topic}: What Everyone Thinks vs. What Actually Works',
    'The Unpopular Truth About {topic}',
    'Everyone Is Wrong About {topic}',
  ],
}

const STYLE_PRIORITY: Record<string, string[]> = {
  value_bomb:      ['direct', 'contrast', 'listicle'],
  question_hook:   ['question', 'direct', 'contrast'],
  story_moment:    ['story', 'direct', 'question'],
  contrast_reveal: ['contrast', 'direct', 'question'],
  high_energy:     ['direct', 'listicle', 'contrast'],
  data_point:      ['listicle', 'direct', 'question'],
  dramatic_pause:  ['story', 'direct', 'question'],
  highlight:       ['direct', 'question', 'story'],
}

const GENERIC_WORDS = new Set(['biggest','mistake','everything','nothing','actually','percent','measure','focus','instead'])

function extractTopic(kws: KW[], excerpt: string): string {
  const skipStart = /^(biggest|most|real|why|how|what|the|this|that)\s/i
  for (const kw of kws.slice(0, 15)) {
    if (kw.isPhrase && kw.term.length > 8 && kw.term.length < 40 && !skipStart.test(kw.term)) {
      return kw.term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
  }
  for (const kw of kws.slice(0, 10)) {
    if (!kw.isPhrase && kw.term.length >= 4 && !GENERIC_WORDS.has(kw.term)) {
      return kw.term.charAt(0).toUpperCase() + kw.term.slice(1)
    }
  }
  const stopExt = new Set([...STOP_WORDS, ...GENERIC_WORDS])
  const words = excerpt.split(' ').map(w => w.replace(/[.,!?"]/g, '')).filter(w => w.length > 5 && !stopExt.has(w.toLowerCase()))
  return words[0] ? (words[0].charAt(0).toUpperCase() + words[0].slice(1)).slice(0, 30) : 'This Topic'
}

function extractNumber(excerpt: string): string {
  const m = excerpt.match(/\b([2-9]|[1-9]\d)\b/)
  return m ? m[0] : '5'
}

function generateTitleVariants(excerpt: string, hookType: string, kws: KW[], n = 3): Array<{style: string; title: string; score: number}> {
  const topic = extractTopic(kws, excerpt)
  const number = extractNumber(excerpt)
  const priority = STYLE_PRIORITY[hookType] || ['direct', 'question', 'listicle']
  const allStyles = [...priority, ...Object.keys(TITLE_TEMPLATES).filter(s => !priority.includes(s))]

  const results: Array<{style: string; title: string; score: number}> = []
  const usedStyles = new Set<string>()

  for (const style of allStyles) {
    if (results.length >= n) break
    if (usedStyles.has(style)) continue
    usedStyles.add(style)

    const templates = TITLE_TEMPLATES[style] || TITLE_TEMPLATES.direct
    const template = templates[Math.floor(Math.random() * templates.length)]
    const title = template
      .replace(/{topic}/g, topic)
      .replace(/{number}/g, number)
      .replace(/\s+/g, ' ').trim()

    if (title.length < 15 || title.length > 100) continue

    let score = 0.5
    if (/\d/.test(title)) score += 0.2
    if (/secret|mistake|truth|wrong|nobody/i.test(title)) score += 0.2
    if (title.endsWith('?')) score += 0.1

    results.push({ style, title, score: Math.round(score * 100) / 100 })
  }

  return results.slice(0, n)
}

const PLATFORM_TAGS: Record<string, string[]> = {
  'TikTok': ['#FYP', '#ForYou', '#TikTok', '#viral'],
  'Instagram Reels': ['#Reels', '#InstagramReels', '#Explore'],
  'YouTube Shorts': ['#Shorts', '#YouTubeShorts'],
  'LinkedIn': ['#LinkedIn', '#LinkedInCreator'],
  'Twitter/X': [],
}

const HOOK_TAGS: Record<string, string[]> = {
  value_bomb: ['#LifeHack', '#ProTips', '#Advice'],
  question_hook: ['#QandA', '#Truth'],
  story_moment: ['#MyStory', '#Lesson'],
  contrast_reveal: ['#Facts', '#Unpopular'],
  data_point: ['#DataDriven', '#Stats'],
  high_energy: ['#Motivation', '#Energy'],
  dramatic_pause: ['#Wisdom', '#DeepThought'],
  highlight: ['#Highlight', '#BestOf'],
}

function detectNiches(text: string): string[] {
  const t = text.toLowerCase()
  const map: Record<string, string[]> = {
    podcast: ['podcast','episode','listener'],
    business: ['business','startup','entrepreneur','revenue'],
    fitness: ['workout','fitness','gym','nutrition'],
    tech: ['software','code','ai','developer'],
    coaching: ['coach','mindset','habit','discipline'],
    education: ['learn','teach','skill','course'],
  }
  return Object.entries(map)
    .filter(([, kws]) => kws.some(k => t.includes(k)))
    .map(([n]) => n)
}

const NICHE_TAGS: Record<string, string[]> = {
  podcast: ['#Podcast', '#Podcasting'],
  business: ['#Business', '#Entrepreneur'],
  fitness: ['#Fitness', '#Health'],
  tech: ['#Tech', '#AI'],
  coaching: ['#Coaching', '#GrowthMindset'],
  education: ['#LearnOnTikTok', '#HowTo'],
}

function generateHashtags(platform: string, hookType: string, excerpt: string, kws: KW[], max = 10): string[] {
  const tags: string[] = []
  tags.push(...(PLATFORM_TAGS[platform] || []).slice(0, 2))
  tags.push(...(HOOK_TAGS[hookType] || []).slice(0, 2))
  for (const n of detectNiches(excerpt).slice(0, 2)) {
    tags.push(...(NICHE_TAGS[n] || []).slice(0, 2))
  }
  for (const kw of kws.slice(0, 5)) {
    if (!kw.isPhrase && kw.term.length >= 4) {
      const tag = `#${kw.term.charAt(0).toUpperCase()}${kw.term.slice(1)}`
      if (!tags.includes(tag)) tags.push(tag)
    }
  }
  tags.push('#ClipSpark')
  const seen = new Set<string>()
  return tags.filter(t => { if (seen.has(t)) return false; seen.add(t); return true }).slice(0, max)
}

function parseHashtags(h: unknown): string[] {
  if (!h) return []
  if (Array.isArray(h)) return h
  if (typeof h === 'string') { try { return JSON.parse(h) } catch { return [h] } }
  return []
}
