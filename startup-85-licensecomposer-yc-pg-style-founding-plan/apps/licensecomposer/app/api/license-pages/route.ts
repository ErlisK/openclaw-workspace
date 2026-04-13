/**
 * app/api/license-pages/route.ts
 * GET  /api/license-pages              — list user's license pages
 * POST /api/license-pages              — create a new license page from a contract
 */
import { NextResponse } from 'next/server';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { nanoid } from 'nanoid';

export async function GET() {
  const auth = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await auth.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('license_pages')
    .select(`
      id, slug, title, description, product_url, platform_slug,
      is_public, is_active, badge_enabled, checkout_enabled,
      price_cents, currency, view_count, badge_embed_count,
      contract_document_id, created_at, updated_at
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pages: data });
}

export async function POST(request: Request) {
  const auth = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await auth.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    contractDocumentId,
    title,
    description,
    productUrl,
    platformSlug,
    badgeEnabled = true,
    priceCents = 0,
    currency = 'usd',
  } = body;

  if (!contractDocumentId) {
    return NextResponse.json({ error: 'contractDocumentId required' }, { status: 400 });
  }

  const svc = createServiceClient();

  // Fetch the contract to enrich the page
  const { data: contract, error: contractErr } = await svc
    .from('generated_contracts')
    .select('id, product_name, jurisdiction_code, platform_code, template_slug, verification_hash')
    .eq('document_id', contractDocumentId)
    .eq('user_id', user.id)
    .single();

  if (contractErr || !contract) {
    return NextResponse.json({ error: 'Contract not found or not owned by user' }, { status: 404 });
  }

  // Generate a short slug
  const slug = nanoid(10).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || nanoid(8);

  const { data: page, error: insertErr } = await svc
    .from('license_pages')
    .insert({
      slug,
      user_id:              user.id,
      contract_id:          contract.id,
      title:                title ?? contract.product_name ?? 'License Agreement',
      description:          description ?? null,
      product_url:          productUrl ?? null,
      platform_slug:        platformSlug ?? contract.platform_code ?? null,
      is_public:            true,
      is_active:            true,
      badge_enabled:        badgeEnabled,
      checkout_enabled:     priceCents > 0,
      price_cents:          priceCents,
      currency:             currency,
      view_count:           0,
      badge_embed_count:    0,
      contract_document_id: contractDocumentId,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';
  return NextResponse.json({
    ok: true,
    page,
    url:       `${appUrl}/l/${slug}`,
    badgeCode: `<a href="${appUrl}/l/${slug}" target="_blank" rel="noopener"><img src="${appUrl}/api/badge/${slug}" alt="Verified License · PactTailor"/></a>`,
  }, { status: 201 });
}
