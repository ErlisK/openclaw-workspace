/**
 * LLM-based Claim Extractor v4
 * Uses AWS Bedrock (Claude Haiku) for structured JSON extraction with span offsets.
 * Falls back to rule-based v3 if LLM is unavailable or quota exceeded.
 */

import { extractClaims as extractClaimsRuleBased } from './claim-extractor'

export interface ClaimSpan {
  /** Zero-indexed character offset in original document text */
  start: number
  end: number
  /** Extracted text (should match document[start:end]) */
  text: string
}

export interface LLMExtractedClaim {
  text: string
  normalizedText: string
  positionIndex: number
  claimType: 'quantitative' | 'causal' | 'comparative' | 'epidemiological' | 'treatment' | 'safety' | 'mechanistic' | 'general'
  confidence: number
  span: ClaimSpan
  /** True if the LLM was used; false = rule-based fallback */
  extractedByLLM: boolean
  /** Brief rationale from LLM (debug only) */
  rationale?: string
  /** Risk pre-signals detected at extraction time */
  earlyRiskFlags?: string[]
}

const EXTRACTION_PROMPT = `You are a scientific fact-checker. Extract all factual, verifiable claims from the following biomedical/scientific text.

For EACH claim output a JSON object with these fields:
- "text": the exact claim sentence (copy verbatim from the text)
- "start": character offset where the claim starts in the original text (0-indexed)
- "end": character offset where it ends
- "type": one of: quantitative | causal | comparative | epidemiological | treatment | safety | mechanistic | general
- "confidence": your confidence this is a checkable factual claim (0.0–1.0)
- "rationale": one sentence explaining why this is a checkable claim
- "risk_signals": array of early risk signals if any, from: ["animal_only","preprint","expert_opinion","case_report","outdated","retraction_risk","absolute_claim"]

Rules:
- Include ONLY statements that make verifiable factual claims (statistics, treatment effects, prevalence, mechanism statements)
- EXCLUDE: author opinions, study goals, method descriptions, definitions without claims, hedged statements about future research
- INCLUDE: any sentence with a percentage, absolute number, odds ratio, comparative claim, causal claim, or treatment effect
- Keep the exact verbatim text from the input
- Output ONLY a valid JSON array, no other text

Text to analyze:
`

// Bedrock client (lazy-loaded to avoid build-time instantiation)
let bedrockClient: import('@aws-sdk/client-bedrock-runtime').BedrockRuntimeClient | null = null

function getBedrockClient() {
  if (!bedrockClient) {
    // Dynamic require to avoid bundling issues
    const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime')
    bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
  }
  return bedrockClient
}

async function callClaudeHaiku(prompt: string, text: string): Promise<LLMExtractedClaim[] | null> {
  const client = getBedrockClient()!
  const { InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime')
  try {
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      temperature: 0.1,  // low temperature for structured extraction
      messages: [{
        role: 'user',
        content: prompt + text
      }]
    })

    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-sonnet-4-6',
      body,
      contentType: 'application/json',
      accept: 'application/json',
    })

    const response = await client.send(command) as { body: Uint8Array }
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    const rawText = responseBody.content?.[0]?.text || ''

    // Parse the JSON array from the response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/m)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return null

    return parsed.map((item: {
      text: string;
      start?: number;
      end?: number;
      type?: string;
      confidence?: number;
      rationale?: string;
      risk_signals?: string[];
    }, idx: number) => {
      // Validate span — find actual position in text if LLM got it wrong
      const rawText2 = item.text || ''
      let start = typeof item.start === 'number' ? item.start : -1
      let end = typeof item.end === 'number' ? item.end : -1

      // Verify and correct span
      if (start >= 0 && text.slice(start, end) !== rawText2) {
        const found = text.indexOf(rawText2)
        if (found >= 0) { start = found; end = found + rawText2.length }
      } else if (start < 0) {
        const found = text.indexOf(rawText2)
        if (found >= 0) { start = found; end = found + rawText2.length }
      }

      const validTypes = ['quantitative','causal','comparative','epidemiological','treatment','safety','mechanistic','general']
      const claimType = validTypes.includes(item.type || '') ? item.type as LLMExtractedClaim['claimType'] : 'general'

      return {
        text: rawText2,
        normalizedText: rawText2.toLowerCase().replace(/\s+/g, ' ').trim(),
        positionIndex: idx,
        claimType,
        confidence: Math.min(Math.max(item.confidence || 0.7, 0), 1),
        span: { start, end, text: rawText2 },
        extractedByLLM: true,
        rationale: item.rationale,
        earlyRiskFlags: item.risk_signals || [],
      } as LLMExtractedClaim
    }).filter((c: LLMExtractedClaim) => c.text && c.text.length > 10)

  } catch (err) {
    console.error('[LLM extractor] Bedrock error:', err)
    return null
  }
}

/**
 * Primary entry point.
 * Tries LLM extraction first; falls back to rule-based on failure.
 */
export async function extractClaimsLLM(text: string): Promise<LLMExtractedClaim[]> {
  // Try LLM extraction (only if text isn't too long for context)
  if (text.length <= 12000) {
    const llmClaims = await callClaudeHaiku(EXTRACTION_PROMPT, text)
    if (llmClaims && llmClaims.length > 0) {
      return llmClaims
    }
  }

  // Fallback: rule-based v3, adapted to LLMExtractedClaim shape
  const ruleClaims = extractClaimsRuleBased(text)
  return ruleClaims.map(c => {
    const found = text.indexOf(c.text)
    return {
      ...c,
      claimType: c.claimType as LLMExtractedClaim['claimType'],
      span: { start: found, end: found >= 0 ? found + c.text.length : -1, text: c.text },
      extractedByLLM: false,
      earlyRiskFlags: [],
    }
  })
}
