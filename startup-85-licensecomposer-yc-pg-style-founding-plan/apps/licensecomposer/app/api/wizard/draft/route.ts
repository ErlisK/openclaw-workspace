/**
 * app/api/wizard/draft/route.ts
 * POST  – upsert a wizard draft (creates or updates generated_contracts row)
 * GET   – load an existing draft by id
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { WizardAnswers, DEFAULT_TEMPLATE } from '@/lib/wizard-types';
import crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';
import { WizardDraftSchema } from '@/lib/validation';

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 60, window: 60, prefix: 'draft' });
  if (limited) return limited;

  try {
    const rawBody = await request.json();
    const parsed = WizardDraftSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { answers, draftId } = parsed.data as unknown as { answers: Partial<WizardAnswers>; draftId?: string };

    const user = await getUser();
    const svc = createServiceClient();

    const licenseType = answers.license_type ?? 'digital_asset_license';
    const templateSlug = answers.template_slug ?? DEFAULT_TEMPLATE[licenseType as keyof typeof DEFAULT_TEMPLATE];

    // Look up template_id
    const { data: template } = await svc
      .from('templates')
      .select('id, document_type')
      .eq('slug', templateSlug)
      .single();

    const now = new Date().toISOString();
    const docId = draftId ?? `draft_${crypto.randomBytes(8).toString('hex')}`;

    const row = {
      document_id: docId,
      user_id: user?.id ?? null,
      template_id: template?.id ?? null,
      template_slug: templateSlug,
      document_type: template?.document_type ?? licenseType,
      wizard_answers: answers,
      clause_ids_used: [],
      filled_legal_text: '',
      filled_plain_text: '',
      variables_resolved: {},
      provenance_chain: {},
      clause_hashes: {},
      is_active: false,
      version_number: 1,
      creator_name: (answers as WizardAnswers).creator_name ?? null,
      product_name: (answers as WizardAnswers).product_name ?? null,
      counterparty_name: (answers as WizardAnswers).client_name ?? null,
      jurisdiction_code: (answers as WizardAnswers).jurisdiction ?? 'US',
      platform_code: (answers as WizardAnswers).platform ?? null,
      template_version: '1.0.0',
      generator_version: '1.0.0',
      generated_at: now,
      provenance_verified: false,
      changelog: [],
    };

    if (draftId) {
      // Update existing draft
      const { data, error } = await svc
        .from('generated_contracts')
        .update({ ...row, updated_at: now })
        .eq('document_id', draftId)
        .select('id, document_id')
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, draftId: data.document_id, id: data.id });
    } else {
      // Insert new draft
      const { data, error } = await svc
        .from('generated_contracts')
        .insert(row)
        .select('id, document_id')
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, draftId: data.document_id, id: data.id });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const draftId = searchParams.get('id');
  if (!draftId) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('generated_contracts')
    .select('id, document_id, wizard_answers, document_type, template_slug, is_active')
    .eq('document_id', draftId)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
  return NextResponse.json({ ok: true, draft: data });
}
