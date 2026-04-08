/**
 * lib/channel-generator.ts
 *
 * LLM-powered channel output generation with:
 *  - Grade-level reading controls (Flesch-Kincaid targeting)
 *  - Format-specific prompts (Twitter/X, LinkedIn, blog, slide copy)
 *  - Auto-disclaimer insertion by territory & audience
 *  - Citation bundle embedding
 *  - CMS-export-ready structured output
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { getSupabaseAdmin } from './supabase'

// Use Bedrock with explicit credentials from env
let _bedrock: BedrockRuntimeClient | null = null
function getBedrock(): BedrockRuntimeClient {
  if (!_bedrock) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const sessionToken = process.env.AWS_SESSION_TOKEN
    const region = process.env.AWS_REGION || 'us-east-1'

    if (accessKeyId && secretAccessKey) {
      _bedrock = new BedrockRuntimeClient({
        region,
        credentials: { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) },
      })
    } else {
      // Fallback: default credential chain
      _bedrock = new BedrockRuntimeClient({ region })
    }
  }
  return _bedrock
}

async function callClaude(prompt: string, maxTokens = 4096): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  const cmd = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body,
  })
  const resp = await getBedrock().send(cmd)
  const decoded = JSON.parse(new TextDecoder().decode(resp.body))
  return {
    text: decoded.content?.[0]?.text || '',
    inputTokens: decoded.usage?.input_tokens || 0,
    outputTokens: decoded.usage?.output_tokens || 0,
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type ChannelFormat =
  | 'twitter_thread'    // ≤280 chars per tweet, numbered thread
  | 'linkedin_post'     // ~600-1200 word thought-leadership post
  | 'explainer_blog'    // 500-900 word blog post with H2 structure
  | 'slide_copy'        // Slide title + bullets (presentation deck)
  | 'email_newsletter'  // Plain-text newsletter digest

export type ReadingLevel =
  | 'grade_6'    // Patient/general public — Flesch ~70+
  | 'grade_10'   // Journalist/educated layperson — Flesch ~50-70
  | 'grade_14'   // Clinician/specialist — Flesch ~30-50, technical OK
  | 'grade_16'   // Policymaker/researcher — dense, citation-heavy

export type Territory = 'general' | 'fda_us' | 'ema_eu'

export interface ChannelClaim {
  id: string
  text: string
  confidenceBand: 'high' | 'moderate' | 'low' | 'none'
  confidenceScore: number
  sources: Array<{
    title: string
    authors?: string[]
    year?: number
    doi?: string
    journal?: string
    abstractSnippet?: string
    studyType?: string
  }>
}

export interface ChannelOutputRequest {
  sessionId: string
  claims: ChannelClaim[]
  format: ChannelFormat
  readingLevel: ReadingLevel
  territory: Territory
  topicContext: string           // e.g. "pembrolizumab in lung cancer"
  wordCountTarget?: number       // override default
  includeCitationBundle?: boolean
  includeDisclaimers?: boolean
}

export interface ChannelOutputResult {
  outputId: string
  sessionId: string
  format: ChannelFormat
  readingLevel: ReadingLevel
  territory: Territory
  content: string                // Main generated content
  disclaimer: string             // Trailing disclaimer (format-specific)
  fullOutput: string             // content + disclaimer assembled
  wordCount: number
  tweetCount?: number            // for twitter_thread
  citationBundle: CitationBundleItem[]
  claimsUsed: string[]           // claim IDs
  generatedAt: string
  model: string
  tokensUsed: number
  // CMS export fields
  cmsMetadata: CMSMetadata
}

export interface CitationBundleItem {
  claimId: string
  claimText: string
  confidenceBand: string
  confidenceScore: number
  sources: Array<{
    title: string
    authors: string[]
    year?: number
    doi?: string
    doiUrl?: string
    journal?: string
    studyType?: string
    abstractSnippet?: string
    plainLanguageSummary?: string
  }>
}

export interface CMSMetadata {
  title: string
  slug: string
  excerpt: string
  tags: string[]
  wordpressBody?: string         // HTML for WordPress REST API
  webflowFields?: Record<string, unknown>   // Webflow CMS fields
  contentfulFields?: Record<string, unknown> // Contentful fields
}

// ─── Disclaimer library ────────────────────────────────────────────────────

function buildDisclaimer(
  format: ChannelFormat,
  territory: Territory,
  readingLevel: ReadingLevel
): string {
  const isGeneral = readingLevel === 'grade_6' || readingLevel === 'grade_10'

  const core = isGeneral
    ? 'This content is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional before making health decisions.'
    : 'This content summarizes published peer-reviewed research. It is intended for educational purposes only and does not constitute clinical guidance, prescribing information, or regulatory advice.'

  const territory_addendum: Record<Territory, string> = {
    general: '',
    fda_us: ' Claims have not been evaluated by the Food and Drug Administration (FDA). This content is not intended to diagnose, treat, cure, or prevent any disease.',
    ema_eu: ' This content has not been reviewed by the European Medicines Agency (EMA). It does not represent promotional material for any medicinal product under Directive 2001/83/EC.',
  }

  const bundle = ' | Full citation bundle with peer-reviewed sources: citebundle.com'
  const email = ' | Unsubscribe: citebundle.com/unsubscribe'

  let full = core + (territory_addendum[territory] || '')
  if (format === 'twitter_thread') full += ' | Sources: citebundle.com'
  else if (format === 'email_newsletter') full += bundle + email
  else full += bundle

  return full
}

// ─── Grade-level system prompt builder ────────────────────────────────────

function gradePromptInstruction(level: ReadingLevel): string {
  switch (level) {
    case 'grade_6':
      return `Write at a Grade 6 reading level (Flesch-Kincaid Grade Level ≤6).
Use short sentences (max 15 words average). Avoid jargon entirely — explain any technical term in plain English.
Use everyday words. No Latin or Greek medical terms without immediate explanation.
Target: patients, general public, social media audiences.`
    case 'grade_10':
      return `Write at a Grade 10 reading level (Flesch-Kincaid Grade Level ≈10).
Moderate sentence length. May use light medical terminology with brief parenthetical explanations.
Suitable for journalists, educated general audiences, health bloggers.`
    case 'grade_14':
      return `Write at a Grade 14 reading level (post-graduate / clinical professional).
Technical terminology is acceptable and expected. Include precise statistical language (95% CI, NNT, hazard ratios).
Audience: clinicians, pharmacists, researchers, medical writers.`
    case 'grade_16':
      return `Write at a Grade 16+ reading level (research / policy professional).
Dense, citation-heavy. Use standard medical/scientific writing conventions.
Include study design context, confidence intervals, p-values where relevant.
Audience: policymakers, health economists, systematic review authors.`
  }
}

// ─── Format-specific prompt builder ───────────────────────────────────────

function buildPrompt(req: ChannelOutputRequest): string {
  const { claims, format, readingLevel, topicContext, wordCountTarget } = req

  const gradeInstr = gradePromptInstruction(readingLevel)
  const topClaims = claims
    .filter(c => c.confidenceBand !== 'none')
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 6)

  const claimsList = topClaims.map((c, i) => {
    const src = c.sources[0]
    const citation = src
      ? `${src.authors?.[0]?.split(',')[0] || 'Source'} et al. (${src.year || 'n.d.'}). ${src.journal || ''}${src.doi ? `. doi:${src.doi}` : ''}`
      : 'Citation required'
    return `${i + 1}. [${c.confidenceBand.toUpperCase()} confidence] ${c.text}\n   Source: ${citation}`
  }).join('\n\n')

  const defaultWordCount: Record<ChannelFormat, number> = {
    twitter_thread: 0,   // tweet count-based
    linkedin_post: 800,
    explainer_blog: 700,
    slide_copy: 300,
    email_newsletter: 600,
  }
  const wc = wordCountTarget || defaultWordCount[format]

  const formatInstructions: Record<ChannelFormat, string> = {
    twitter_thread: `Create a numbered Twitter/X thread (10-14 tweets maximum).
Rules:
- Tweet 1: Hook — compelling opening stat or question (≤280 chars)
- Tweets 2-N: One claim per tweet. Include confidence emoji: 🟢 high, 🟡 moderate, 🔴 low
- Include abbreviated citation in each tweet (Author Year) 
- Final tweet: "Full CiteBundle with all sources → citebundle.com"
- Format each tweet as: [N/TOTAL] text (≤270 chars to leave room for thread marker)
- Separate tweets with a blank line`,

    linkedin_post: `Write a LinkedIn thought-leadership post (~${wc} words).
Structure:
- Opening hook (1-2 sentences, bold key stat)
- 3-4 evidence-backed paragraphs, each with ≥1 inline citation
- Key takeaways section (bullet list, 3-5 bullets)
- Closing call-to-action mentioning citebundle.com
- Relevant hashtags (5-8) at the end
- Use line breaks liberally for readability on mobile`,

    explainer_blog: `Write an explainer blog post (~${wc} words) with proper HTML structure.
Use these heading tags: <h1>, <h2>, <h3>
Structure:
- H1: compelling title
- Introduction paragraph (2-3 sentences, state the main finding)
- 3-4 H2 sections, each with 2-3 paragraphs and inline citations in [Author Year] format
- "What this means for [audience]" section
- Key sources table (markdown or HTML)
- Conclusion
Output as clean HTML suitable for CMS import`,

    slide_copy: `Generate slide deck copy for a presentation.
Format each slide as:
## Slide [N]: [Title]
**Key message:** One sentence takeaway
• Bullet 1 (max 10 words)
• Bullet 2 (max 10 words)  
• Bullet 3 (max 10 words)
*Speaker note:* [1-2 sentences with evidence context]

Create 8-10 slides covering: Title, Evidence Overview, 4-5 Key Findings, Methodology Confidence, Citations & Sources, Conclusions`,

    email_newsletter: `Write an email newsletter digest (~${wc} words).
Format:
Subject line: [compelling subject on first line]

Body:
- Opening (2-3 sentences: why this matters today)
- 3-4 key findings as short sections with bold headers
- Each finding includes one inline citation
- "Learn more" CTA linking to citebundle.com
- Plain text only (no markdown bold/italic in final output — use natural language)`,
  }

  return `You are an expert medical/science communicator producing channel-ready content.

${gradeInstr}

## Topic
${topicContext}

## Evidence-Backed Claims (use these — do not fabricate sources)
${claimsList}

## Format Requirements
${formatInstructions[format]}

## Content Rules
- ONLY use claims and sources provided above — never fabricate statistics or citations
- Every factual claim must trace back to a provided source
- Low-confidence claims (🔴) must include explicit uncertainty language ("suggests", "preliminary evidence indicates")
- High-confidence claims (🟢) may state findings more directly
- Do not include disclaimer text — that will be appended separately
- Output ONLY the content, no meta-commentary or explanation

Generate the ${format.replace('_', ' ')} now:`
}

// ─── CMS metadata generator ────────────────────────────────────────────────

function buildCMSMetadata(
  content: string,
  topicContext: string,
  format: ChannelFormat,
  claims: ChannelClaim[]
): CMSMetadata {
  // Extract title from content
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i)
  const hashMatch = content.match(/^#\s+(.+)$/m)
  const firstLine = content.split('\n').find(l => l.trim().length > 10)?.trim() || ''

  const title = h1Match?.[1]?.replace(/<[^>]*>/g, '') ||
    hashMatch?.[1] ||
    (format === 'twitter_thread' ? `Thread: ${topicContext}` : firstLine.slice(0, 80))

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)

  // Extract excerpt
  const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')
  const excerpt = textContent.slice(0, 200).trim() + '...'

  // Build tags from topic
  const topicWords = topicContext.split(/\s+/).filter(w => w.length > 4)
  const tags = ['evidence-based', 'peer-reviewed', 'citebundle', ...topicWords.slice(0, 5)]

  // WordPress-ready HTML
  const wordpressBody = format === 'explainer_blog'
    ? content  // already HTML
    : `<div class="citebundle-content">${content.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')}</div>`

  // Webflow CMS fields
  const webflowFields: Record<string, unknown> = {
    name: title,
    slug,
    'post-body': wordpressBody,
    'post-summary': excerpt,
    tags: tags.slice(0, 6),
    'reading-level': format,
    'citebundle-url': `https://citebundle.com`,
    'evidence-count': claims.reduce((n, c) => n + c.sources.length, 0),
    'published-at': new Date().toISOString(),
  }

  // Contentful fields
  const contentfulFields: Record<string, unknown> = {
    title: { 'en-US': title },
    slug: { 'en-US': slug },
    body: { 'en-US': content },
    excerpt: { 'en-US': excerpt },
    tags: { 'en-US': tags },
    format: { 'en-US': format },
    evidenceCount: { 'en-US': claims.reduce((n, c) => n + c.sources.length, 0) },
    citebundleUrl: { 'en-US': 'https://citebundle.com' },
  }

  return { title, slug, excerpt, tags, wordpressBody, webflowFields, contentfulFields }
}

// ─── Citation bundle builder ───────────────────────────────────────────────

function buildCitationBundle(claims: ChannelClaim[]): CitationBundleItem[] {
  return claims
    .filter(c => c.confidenceBand !== 'none')
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .map(c => ({
      claimId: c.id,
      claimText: c.text,
      confidenceBand: c.confidenceBand,
      confidenceScore: c.confidenceScore,
      sources: c.sources.map(s => ({
        title: s.title,
        authors: s.authors || [],
        year: s.year,
        doi: s.doi,
        doiUrl: s.doi ? `https://doi.org/${s.doi}` : undefined,
        journal: s.journal,
        studyType: s.studyType,
        abstractSnippet: s.abstractSnippet,
        // Plain language summary (auto-generated for grade_6 audience)
        plainLanguageSummary: s.abstractSnippet
          ? s.abstractSnippet.slice(0, 200) + '...'
          : undefined,
      })),
    }))
}

// ─── Main generator ────────────────────────────────────────────────────────

export async function generateChannelOutput(
  req: ChannelOutputRequest
): Promise<ChannelOutputResult> {
  const outputId = crypto.randomUUID()
  const prompt = buildPrompt(req)

  const { text: contentRaw, inputTokens, outputTokens } = await callClaude(prompt)
  const content = contentRaw.trim()
  const tokensUsed = inputTokens + outputTokens

  // Build disclaimer
  const disclaimer = (req.includeDisclaimers !== false)
    ? buildDisclaimer(req.format, req.territory, req.readingLevel)
    : ''

  // Assemble full output
  const sep = req.format === 'twitter_thread' ? '\n\n---\n' : '\n\n---\n'
  const fullOutput = disclaimer
    ? `${content}${sep}*${disclaimer}*`
    : content

  // Word count
  const wordCount = content.split(/\s+/).filter(Boolean).length
  const tweetCount = req.format === 'twitter_thread'
    ? (content.match(/\n\n/g)?.length || 0) + 1
    : undefined

  // Citation bundle
  const citationBundle = buildCitationBundle(req.claims)

  // CMS metadata
  const cmsMetadata = buildCMSMetadata(content, req.topicContext, req.format, req.claims)

  const result: ChannelOutputResult = {
    outputId,
    sessionId: req.sessionId,
    format: req.format,
    readingLevel: req.readingLevel,
    territory: req.territory,
    content,
    disclaimer,
    fullOutput,
    wordCount,
    tweetCount,
    citationBundle,
    claimsUsed: req.claims.map(c => c.id),
    generatedAt: new Date().toISOString(),
    model: 'anthropic.claude-3-haiku-20240307-v1:0',
    tokensUsed,
    cmsMetadata,
  }

  // Persist to DB
  await persistChannelOutput(result)

  return result
}

// ─── Persistence ──────────────────────────────────────────────────────────

async function persistChannelOutput(result: ChannelOutputResult): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('generated_outputs').upsert({
      id: result.outputId,
      session_id: result.sessionId,
      format: result.format,
      reading_level: result.readingLevel,
      territory: result.territory,
      content: result.fullOutput,
      word_count: result.wordCount,
      tweet_count: result.tweetCount,
      disclaimer: result.disclaimer,
      citation_bundle: result.citationBundle,
      claim_ids: result.claimsUsed,
      cms_metadata: result.cmsMetadata,
      model: result.model,
      tokens_used: result.tokensUsed,
      generated_at: result.generatedAt,
    })
  } catch (err) {
    console.error('Failed to persist channel output:', err)
  }
}

// ─── CMS export helpers ────────────────────────────────────────────────────

export interface WordPressExportConfig {
  siteUrl: string      // e.g. https://example.com
  username: string
  password: string     // Application password
  status?: 'draft' | 'publish'
  categoryIds?: number[]
}

export interface WebflowExportConfig {
  apiToken: string
  collectionId: string
  siteId: string
}

export interface ContentfulExportConfig {
  spaceId: string
  accessToken: string
  contentTypeId: string
  environment?: string
}

export async function exportToWordPress(
  output: ChannelOutputResult,
  config: WordPressExportConfig
): Promise<{ postId: number; postUrl: string; status: string }> {
  const { title, wordpressBody, tags, excerpt } = output.cmsMetadata
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64')

  const res = await fetch(`${config.siteUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      title,
      content: wordpressBody + `\n\n<!-- CiteBundle: ${output.outputId} -->`,
      excerpt,
      status: config.status || 'draft',
      tags: tags.map(t => t.toLowerCase()),
      meta: {
        citebundle_output_id: output.outputId,
        citebundle_session_id: output.sessionId,
        citebundle_url: 'https://citebundle.com',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WordPress export failed: ${res.status} ${err}`)
  }

  const post = await res.json() as { id: number; link: string; status: string }
  return { postId: post.id, postUrl: post.link, status: post.status }
}

export async function exportToWebflow(
  output: ChannelOutputResult,
  config: WebflowExportConfig
): Promise<{ itemId: string; slug: string }> {
  const fields = {
    ...output.cmsMetadata.webflowFields,
    _draft: true,
    _archived: false,
  }

  const res = await fetch(
    `https://api.webflow.com/collections/${config.collectionId}/items`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
        'accept-version': '1.0.0',
      },
      body: JSON.stringify({ fields }),
    }
  )

  if (!res.ok) throw new Error(`Webflow export failed: ${res.status}`)
  const data = await res.json() as { _id: string; slug: string }
  return { itemId: data._id, slug: data.slug }
}

export async function exportToContentful(
  output: ChannelOutputResult,
  config: ContentfulExportConfig
): Promise<{ entryId: string; published: boolean }> {
  const env = config.environment || 'master'

  const res = await fetch(
    `https://api.contentful.com/spaces/${config.spaceId}/environments/${env}/entries`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.contentful.management.v1+json',
        Authorization: `Bearer ${config.accessToken}`,
        'X-Contentful-Content-Type': config.contentTypeId,
      },
      body: JSON.stringify({ fields: output.cmsMetadata.contentfulFields }),
    }
  )

  if (!res.ok) throw new Error(`Contentful export failed: ${res.status}`)
  const entry = await res.json() as { sys: { id: string } }
  return { entryId: entry.sys.id, published: false }
}
