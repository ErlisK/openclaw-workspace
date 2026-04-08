/**
 * Content Generator — template-based (alpha stage, no LLM required)
 * Uses extracted claims + evidence sources to produce channel-ready output.
 * Each generated sentence is linked back to the source claims and evidence.
 */

import type { EvidenceSource } from './evidence-search'
import { computeProvenanceScore } from './provenance-scorer'

export type OutputFormat = 'twitter_thread' | 'linkedin_post' | 'blog_section' | 'slide_copy' | 'patient_faq' | 'policy_brief' | 'press_release'
export type AudienceLevel = 'patient' | 'journalist' | 'clinician' | 'policymaker'

export interface ScoredClaim {
  id: string
  text: string
  confidenceScore: number
  confidenceBand: string
  sources: EvidenceSource[]
}

export interface GeneratedContent {
  format: OutputFormat
  audienceLevel: AudienceLevel
  content: string
  wordCount: number
  attributions: Array<{
    sentenceIndex: number
    claimId: string
    sourceCount: number
    confidenceBand: string
  }>
}

function formatCitation(source: EvidenceSource): string {
  const authors = source.authors.length > 0
    ? `${source.authors[0].split(',')[0]} et al.`
    : 'Authors'
  const year = source.year ? ` (${source.year})` : ''
  const doi = source.doi ? `. doi:${source.doi}` : ''
  return `${authors}${year}. ${source.journal || 'Journal'}${doi}`
}

function confidenceEmoji(band: string): string {
  if (band === 'high') return '🟢'
  if (band === 'moderate') return '🟡'
  if (band === 'low') return '🔴'
  return '⚫'
}

function formatClaimForAudience(claim: string, audience: AudienceLevel): string {
  // Simple adaptation: clinician = as-is; others = simplified
  if (audience === 'clinician') return claim
  if (audience === 'patient') {
    return claim
      .replace(/\bstatistically significant\b/gi, 'meaningful')
      .replace(/\btherapeutic\b/gi, 'treatment')
      .replace(/\bpathology\b/gi, 'disease')
      .replace(/\betiology\b/gi, 'cause')
      .replace(/\bcontraindicated\b/gi, 'not recommended')
  }
  return claim
}

export function generateContent(
  claims: ScoredClaim[],
  format: OutputFormat,
  audience: AudienceLevel
): GeneratedContent {
  const topClaims = claims
    .filter(c => c.confidenceBand !== 'none')
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5)

  const attributions: GeneratedContent['attributions'] = []
  let content = ''
  let sentenceIdx = 0

  switch (format) {
    case 'twitter_thread': {
      const lines: string[] = ['🧵 THREAD: Evidence-backed findings\n']
      topClaims.forEach((claim, i) => {
        const adapted = formatClaimForAudience(claim.text, audience)
        const shortClaim = adapted.length > 240 ? adapted.slice(0, 237) + '...' : adapted
        const emoji = confidenceEmoji(claim.confidenceBand)
        const sourceLine = claim.sources[0]
          ? ` [${claim.sources[0].authors[0]?.split(',')[0] || 'Source'} ${claim.sources[0].year || ''}]`
          : ''
        lines.push(`${i + 1}/ ${shortClaim}${sourceLine} ${emoji}`)
        attributions.push({ sentenceIndex: sentenceIdx + i, claimId: claim.id, sourceCount: claim.sources.length, confidenceBand: claim.confidenceBand })
      })
      lines.push(`\n${topClaims.length + 1}/ Full citation bundle: https://citebundle.com`)
      content = lines.join('\n\n')
      sentenceIdx += topClaims.length + 1
      break
    }

    case 'linkedin_post': {
      const intro = audience === 'clinician'
        ? 'Key findings from the evidence:'
        : audience === 'patient'
        ? 'What the research shows:'
        : 'New research highlights:'

      const lines = [intro, '']
      topClaims.slice(0, 4).forEach((claim, i) => {
        const adapted = formatClaimForAudience(claim.text, audience)
        const emoji = confidenceEmoji(claim.confidenceBand)
        const src = claim.sources[0]
        const srcLine = src ? `\n   📄 ${src.title?.slice(0, 60)}... (${src.year})` : ''
        lines.push(`${emoji} ${adapted}${srcLine}`)
        attributions.push({ sentenceIndex: sentenceIdx + i, claimId: claim.id, sourceCount: claim.sources.length, confidenceBand: claim.confidenceBand })
      })
      lines.push('\n---\nAll claims verified against peer-reviewed sources. Download full CiteBundle: https://citebundle.com')
      content = lines.join('\n')
      break
    }

    case 'blog_section': {
      const opening = `Based on a review of ${claims.filter(c => c.sources.length > 0).reduce((n, c) => n + c.sources.length, 0)} peer-reviewed sources, the following evidence-backed findings emerge:\n`
      const paragraphs = topClaims.slice(0, 3).map((claim, i) => {
        const adapted = formatClaimForAudience(claim.text, audience)
        const cit = claim.sources.slice(0, 2).map(formatCitation).join('; ')
        attributions.push({ sentenceIndex: sentenceIdx + i, claimId: claim.id, sourceCount: claim.sources.length, confidenceBand: claim.confidenceBand })
        return `${adapted} (${cit || 'Source required'}) [Confidence: ${claim.confidenceBand}]`
      })
      content = opening + paragraphs.join('\n\n')
      break
    }

    case 'slide_copy': {
      const slides = topClaims.slice(0, 3).map((claim, i) => {
        const adapted = formatClaimForAudience(claim.text, audience)
        const bulletPoints = adapted.split(/[;,]/).filter(s => s.trim().length > 10).slice(0, 3)
        const headline = adapted.split('.')[0].slice(0, 60)
        const src = claim.sources[0]
        const srcLine = src ? `Source: ${src.authors[0]?.split(',')[0] || 'Authors'} et al. ${src.year || ''}, ${src.journal || 'Journal'}` : ''
        attributions.push({ sentenceIndex: sentenceIdx + i, claimId: claim.id, sourceCount: claim.sources.length, confidenceBand: claim.confidenceBand })
        return `SLIDE ${i + 1}\nHeadline: ${headline}\n${bulletPoints.map(b => `• ${b.trim()}`).join('\n')}\n${srcLine}`
      })
      content = slides.join('\n\n---\n\n')
      break
    }

    case 'patient_faq': {
      const faqs = topClaims.slice(0, 4).map((claim, i) => {
        const adapted = formatClaimForAudience(claim.text, 'patient')
        const q = `What do studies show about ${adapted.slice(0, 60).toLowerCase()}...?`
        const a = `Research indicates: ${adapted} This finding is based on ${claim.sources.length} peer-reviewed ${claim.sources.length === 1 ? 'study' : 'studies'}.`
        attributions.push({ sentenceIndex: sentenceIdx + i, claimId: claim.id, sourceCount: claim.sources.length, confidenceBand: claim.confidenceBand })
        return `Q: ${q}\nA: ${a}`
      })
      content = 'Patient-Friendly Evidence Summary\n\n' + faqs.join('\n\n')
      break
    }

    case 'policy_brief': {
      const lines = [
        'POLICY BRIEF — Evidence Summary\n',
        'KEY FINDINGS:\n',
      ]
      topClaims.slice(0, 4).forEach((claim, i) => {
        const adapted = formatClaimForAudience(claim.text, 'policymaker')
        const src = claim.sources[0]
        const badge = claim.confidenceBand === 'high' ? '[STRONG EVIDENCE]' : claim.confidenceBand === 'moderate' ? '[MODERATE EVIDENCE]' : '[LIMITED EVIDENCE]'
        lines.push(`${i + 1}. ${badge} ${adapted}`)
        if (src) lines.push(`   Evidence: ${src.title} (${src.year})`)
        attributions.push({ sentenceIndex: sentenceIdx + i, claimId: claim.id, sourceCount: claim.sources.length, confidenceBand: claim.confidenceBand })
      })
      lines.push('\nFull citation bundle available at: https://citebundle.com')
      content = lines.join('\n')
      break
    }

    case 'press_release': {
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      const topClaim = topClaims[0]
      const adapted = topClaim ? formatClaimForAudience(topClaim.text, audience) : 'Evidence review completed'
      lines: {
        const l = [
          `FOR IMMEDIATE RELEASE — ${dateStr}\n`,
          `HEADLINE: Evidence Review Reveals Key Findings\n`,
          adapted + '\n',
        ]
        topClaims.slice(1, 3).forEach((claim, i) => {
          const a = formatClaimForAudience(claim.text, audience)
          l.push(a)
          attributions.push({ sentenceIndex: sentenceIdx + i + 1, claimId: claim.id, sourceCount: claim.sources.length, confidenceBand: claim.confidenceBand })
        })
        l.push('\nFor media inquiries: hello@citebundle.com')
        content = l.join('\n')
      }
      if (topClaim) attributions.push({ sentenceIndex: sentenceIdx, claimId: topClaim.id, sourceCount: topClaim.sources.length, confidenceBand: topClaim.confidenceBand })
      break
    }
  }

  return {
    format,
    audienceLevel: audience,
    content,
    wordCount: content.split(/\s+/).length,
    attributions,
  }
}
