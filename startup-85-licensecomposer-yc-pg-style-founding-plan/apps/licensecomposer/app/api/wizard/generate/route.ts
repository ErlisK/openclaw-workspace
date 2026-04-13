/**
 * app/api/wizard/generate/route.ts
 * POST – given completed wizard_answers + optional draft_id,
 *        calls generateContract(), persists to generated_contracts,
 *        backfills template_versions.clause_hashes.
 *
 * Returns { contractId, contractUUID, legalText, plainText,
 *           provenanceHash, templateHash, clauseCount, changelog }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateContract } from '@/lib/generator';
import { WizardAnswers } from '@/lib/wizard-types';
import crypto from 'crypto';
import { serverTrack } from '@/lib/analytics-server';
import { rateLimit } from '@/lib/rate-limit';
import { WizardGenerateSchema } from '@/lib/validation';

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  // Rate limit: 20 generations per minute per IP
  const limited = rateLimit(request, { limit: 20, window: 60, prefix: 'generate' });
  if (limited) return limited;

  try {
    const rawBody = await request.json();
    const parsed = WizardGenerateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { answers, draftId } = parsed.data as unknown as { answers: WizardAnswers; draftId?: string };

    const user = await getUser();
    const svc = createServiceClient();

    // ── 0. Enforce free-tier export cap ──────────────────────────────────────
    if (user?.id) {
      const { getUserEntitlements } = await import('@/lib/entitlements');
      const ents = await getUserEntitlements(svc, user.id);
      if (!ents.unlimitedExports && ents.freeExportsRemaining <= 0) {
        return NextResponse.json({
          error: 'export_cap_reached',
          message: 'You have used all 2 free exports this month. Upgrade to PactTailor Unlimited ($9/year) for unlimited exports.',
          upgradeUrl: '/pricing',
          plan: 'free',
        }, { status: 402 });
      }

      // ── 0b. Check premium template access ──────────────────────────────
      const selectedTemplate = answers.template_slug
        ?? (answers as unknown as Record<string, string>).templateSlug
        ?? null;

      if (selectedTemplate) {
        // Check if template is premium
        const { data: tpl } = await svc
          .from('templates')
          .select('tier, name')
          .eq('slug', selectedTemplate)
          .single();

        if (tpl?.tier === 'premium') {
          const hasPremiumAccess = ents.unlimitedExports
            || ents.premiumTemplates.includes(selectedTemplate);

          if (!hasPremiumAccess) {
            return NextResponse.json({
              error:        'premium_template_locked',
              message:      `"${tpl.name}" is a premium template. Purchase it ($5) or upgrade to Unlimited ($9/yr).`,
              templateSlug: selectedTemplate,
              templateName: tpl.name,
              purchaseUrl:  '/templates',
              upgradeUrl:   '/pricing',
            }, { status: 402 });
          }
        }
      }
    }

    // ── 0c. Ensure public.users row exists (backfill if trigger missed it) ────
    if (user?.id) {
      await svc.from('users').upsert(
        { id: user.id, email: user.email ?? '', full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '' },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }

    // ── 1. Generate contract using the new generator service ─────────────────
    const result = await generateContract(answers, svc);

    // ── 2. Persist the generated_contracts row ───────────────────────────────
    const docId = draftId ?? `contract_${crypto.randomBytes(8).toString('hex')}`;
    const now   = new Date().toISOString();

    const row = {
      document_id:        docId,
      user_id:            user?.id ?? null,
      template_id:        null,          // backfilled via templateSlug below
      template_version_id: result.templateVersionId,
      template_slug:      result.templateSlug,
      template_version:   result.templateVersion,
      document_type:      answers.license_type,
      wizard_answers:     answers,
      clause_ids_used:    [],  // clause keys are strings not UUIDs, stored in clause_hashes
      filled_legal_text:  result.legalText,
      filled_plain_text:  result.plainText,
      variables_resolved: result.variablesResolved,
      provenance_chain:   result.provenanceChain,
      clause_hashes:      result.clauseHashes,
      is_active:          true,
      version_number:     1,
      creator_name:       answers.creator_name   ?? null,
      product_name:       answers.product_name   ?? null,
      counterparty_name:  answers.client_name    ?? null,
      jurisdiction_code:  answers.jurisdiction   ?? 'US',
      platform_code:      answers.platform       ?? null,
      generator_version:  result.generatorVersion,
      generated_at:       result.generatedAt,
      updated_at:         now,
      provenance_verified: true,
      verification_hash:  result.provenanceHash,
      verification_url:   `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com'}/verify/${result.provenanceHash.slice(0, 16)}`,
      changelog:          result.changelog,
      template_hash:      result.templateHash,
    };

    // Resolve template_id
    const { data: tmpl } = await svc.from('templates').select('id').eq('slug', result.templateSlug).single();
    if (tmpl?.id) row.template_id = tmpl.id;

    let contractId: string;
    let contractUUID: string;

    if (draftId) {
      const { data, error } = await svc
        .from('generated_contracts')
        .update(row)
        .eq('document_id', draftId)
        .select('id, document_id')
        .single();
      if (error) throw error;
      contractId  = data.document_id;
      contractUUID = data.id;
    } else {
      const { data, error } = await svc
        .from('generated_contracts')
        .insert(row)
        .select('id, document_id')
        .single();
      if (error) throw error;
      contractId  = data.document_id;
      contractUUID = data.id;
    }

    // ── 3. Backfill template_versions.clause_hashes if still empty ───────────
    if (result.templateVersionId) {
      const { data: tvRow } = await svc
        .from('template_versions')
        .select('clause_hashes')
        .eq('id', result.templateVersionId)
        .single();

      const existingHashes = tvRow?.clause_hashes;
      const isEmpty = !existingHashes
        || (Array.isArray(existingHashes) && existingHashes.length === 0)
        || (typeof existingHashes === 'object' && Object.keys(existingHashes).length === 0);

      if (isEmpty) {
        await svc
          .from('template_versions')
          .update({
            clause_hashes: result.clauseHashes,
            template_hash: result.templateHash,
          })
          .eq('id', result.templateVersionId);
      }
    }

    // Fire analytics event (non-blocking)
    serverTrack('generate_success', user?.id ?? null, {
      contract_id:   contractId,
      template_slug: result.templateSlug,
      license_type:  answers.license_type,
      jurisdiction:  answers.jurisdiction,
      platform:      answers.platform,
    });

    return NextResponse.json({
      ok:             true,
      contractId,
      contractUUID,
      legalText:      result.legalText,
      plainText:      result.plainText,
      provenanceHash: result.provenanceHash,
      templateHash:   result.templateHash,
      clauseCount:    result.clauses.length,
      templateName:   result.templateName,
      templateVersion: result.templateVersion,
      changelog:      result.changelog,
    });

  } catch (err: unknown) {
    let msg: string;
    if (err instanceof Error) {
      msg = err.message;
    } else if (err && typeof err === 'object') {
      msg = JSON.stringify(err);
    } else {
      msg = String(err);
    }
    console.error('[generate] Error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
