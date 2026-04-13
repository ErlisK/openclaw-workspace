/**
 * app/api/ai/explain/route.ts
 * POST /api/ai/explain
 *
 * Streams a plain-English explanation of a legal clause.
 * Uses Claude Haiku (fast + cheap) — one-line explanations don't need Sonnet.
 *
 * Body: { clauseKey: string, clauseTitle: string, legalText: string, plainText?: string }
 * Response: text/event-stream (Vercel AI SDK stream)
 *
 * Note: VERCEL_OIDC_TOKEN is auto-injected at Vercel runtime. Works only in deployed env.
 */
import { streamText } from 'ai';
import { fastModel } from '@/lib/ai-gateway';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DISCLAIMER =
  '\n\n---\n⚠️ *AI explanation — for informational purposes only. Not legal advice. ' +
  'Consult a licensed attorney for authoritative interpretation.*';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clauseTitle, legalText, plainText, jurisdiction } = body as {
      clauseTitle: string;
      legalText: string;
      plainText?: string;
      jurisdiction?: string;
    };

    if (!legalText?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing legalText' }), { status: 400 });
    }

    const govLaw = jurisdiction === 'UK' ? 'England and Wales' : 'United States';

    const prompt = [
      `You are a legal plain-English explainer for PactTailor, a contract template service.`,
      `A user wants to understand this contract clause. Explain it in 2–4 friendly sentences`,
      `that a non-lawyer can understand. Focus on: what it means for the user, any important`,
      `restrictions, and why it matters.`,
      ``,
      `Governing law: ${govLaw}`,
      `Clause title: "${clauseTitle}"`,
      ``,
      `Legal text:`,
      `"""`,
      legalText.slice(0, 800),  // cap at 800 chars to stay in context
      `"""`,
      plainText ? `\nExisting plain-text summary: "${plainText}"` : '',
      ``,
      `Reply with ONLY the explanation — no headings, no bullet points. 2–4 sentences max.`,
      `Remind the user at the very end that this is not legal advice.`,
    ].join('\n');

    const result = streamText({
      model: fastModel,
      prompt,
      maxOutputTokens: 200,
    });

    return result.toTextStreamResponse();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    // Return a graceful fallback instead of hard erroring
    return new Response(
      `Could not generate AI explanation. ${DISCLAIMER}\n\n(Error: ${msg})`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }
    );
  }
}
