/**
 * app/api/ai/simplify/route.ts
 * POST /api/ai/simplify
 *
 * Generates an AI-enhanced plain-English summary of an entire contract,
 * then stores it back in generated_contracts.ai_plain_text.
 *
 * We use a Supabase ALTER TABLE to add the column if it doesn't exist yet.
 * Body: { contractId: string }
 * Response: { ok, aiPlainText }
 *
 * Note: VERCEL_OIDC_TOKEN auto-injected at Vercel runtime.
 */
import { generateText } from 'ai';
import { defaultModel } from '@/lib/ai-gateway';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const AI_DISCLAIMER = `
---
⚠️ **AI-generated summary — for informational purposes only.**
This plain-English summary was produced by an AI model and may not fully capture every nuance of the legal text. 
It is NOT legal advice. Always review the full legal text and consult a licensed attorney for jurisdiction-specific guidance.
PactTailor · pacttailor.com · hello@pacttailor.com
`;

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const limited = rateLimit(request, { limit: 10, window: 60, prefix: 'ai-simplify' });
  if (limited) return limited;

  try {
    const { contractId } = await request.json();
    if (!contractId) {
      return NextResponse.json({ ok: false, error: 'Missing contractId' }, { status: 400 });
    }

    // Require authentication
    let userId: string | null = null;
    try {
      const auth = await createServerSupabaseClient();
      const { data: { user } } = await auth.auth.getUser();
      userId = user?.id ?? null;
    } catch { /* ignore */ }

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const svc = createServiceClient();

    // Fetch the contract — enforce ownership
    const { data: contract, error: fetchErr } = await svc
      .from('generated_contracts')
      .select('filled_legal_text, filled_plain_text, document_type, jurisdiction_code, template_slug, user_id')
      .eq('document_id', contractId)
      .single();

    if (fetchErr || !contract) {
      return NextResponse.json({ ok: false, error: 'Contract not found' }, { status: 404 });
    }

    if (contract.user_id && contract.user_id !== userId) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // Check if AI version already cached
    const { data: existing } = await svc
      .from('generated_contracts')
      .select('ai_plain_text')
      .eq('document_id', contractId)
      .single();

    if (existing?.ai_plain_text) {
      return NextResponse.json({ ok: true, aiPlainText: existing.ai_plain_text, cached: true });
    }

    const govLaw = contract.jurisdiction_code === 'UK' ? 'England and Wales' : 'United States';
    const docType = (contract.document_type ?? 'contract').replace(/_/g, ' ');

    // Build a condensed version for the prompt (avoid huge token counts)
    const legalSnippet = (contract.filled_legal_text ?? '').slice(0, 4000);

    const prompt = [
      `You are a legal plain-English writer for PactTailor, a contract template service for indie creators.`,
      ``,
      `Rewrite the following ${docType} contract in plain, friendly English that a non-lawyer creator can understand.`,
      `Governing law: ${govLaw}.`,
      ``,
      `Format your response as a structured summary:`,
      `1. Start with a 1-sentence "TL;DR" in bold.`,
      `2. Then list each major section as "### Section Name" followed by 1–2 sentences explaining what it means.`,
      `3. End with a "### Key Points to Know" section with 3–5 bullet points of the most important things.`,
      `4. Keep the tone friendly and direct — like explaining to a friend, not lecturing.`,
      `5. Do NOT use legal jargon. If you must use a legal term, explain it in parentheses.`,
      ``,
      `Contract text:`,
      `"""`,
      legalSnippet,
      `"""`,
      ``,
      `Start directly with the TL;DR. Do not add a title or preamble.`,
    ].join('\n');

    const { text } = await generateText({
      model: defaultModel,
      prompt,
      maxOutputTokens: 1200,
    });

    const aiPlainText = text + AI_DISCLAIMER;

    // Try to store back — if column doesn't exist yet, update will silently fail
    // (migration adds the column separately)
    await svc
      .from('generated_contracts')
      .update({ ai_plain_text: aiPlainText, ai_simplified_at: new Date().toISOString() } as never)
      .eq('document_id', contractId);

    return NextResponse.json({ ok: true, aiPlainText });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    // Return graceful degradation
    return NextResponse.json({
      ok: false,
      error: msg,
      aiPlainText: null,
    }, { status: 500 });
  }
}
