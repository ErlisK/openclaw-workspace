/**
 * app/api/license-pages/[slug]/accept/route.ts
 * POST /api/license-pages/:slug/accept
 * Records a license acceptance (buyer name/email, checkbox, IP, timestamp).
 * Also supports GET to check acceptance status for an email.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { serverTrack } from '@/lib/analytics-server';
import { rateLimit } from '@/lib/rate-limit';
import { LicenseAcceptSchema } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 20 acceptances per minute per IP (anti-spam)
  const limited = rateLimit(request, { limit: 20, window: 60, prefix: 'accept' });
  if (limited) return limited;

  const { slug } = await params;

  const rawBody = await request.json();
  const parsed = LicenseAcceptSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { name, email, agreedToTerms } = parsed.data;

  const svc = createServiceClient();

  // Fetch the license page
  const { data: page, error: pageErr } = await svc
    .from('license_pages')
    .select('id, contract_id, contract_document_id, user_id, is_active, is_public, title')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (pageErr || !page) {
    return NextResponse.json({ ok: false, error: 'License page not found or inactive' }, { status: 404 });
  }

  // Get contract details for fingerprint
  let documentHash: string | null = null;
  let contractId: string | null = page.contract_id ?? null;

  if (page.contract_document_id) {
    const { data: contract } = await svc
      .from('generated_contracts')
      .select('id, verification_hash')
      .eq('document_id', page.contract_document_id)
      .single();
    if (contract) {
      documentHash = contract.verification_hash;
      contractId = contract.id;
    }
  }

  // Extract IP from request headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp       = request.headers.get('x-real-ip');
  const cfIp         = request.headers.get('cf-connecting-ip');
  const rawIp        = cfIp ?? (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ?? realIp ?? null;
  const userAgent    = request.headers.get('user-agent') ?? null;
  const ipCountry    = request.headers.get('cf-ipcountry') ?? null;

  // Check for existing acceptance
  const { data: existing } = await svc
    .from('license_acceptances')
    .select('id, accepted_at')
    .eq('license_page_id', page.id)
    .eq('accepter_email', email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyAccepted: true,
      acceptanceId: existing.id,
      acceptedAt:   existing.accepted_at,
      message:      'This email has already accepted this license.',
    });
  }

  // Record acceptance
  const { data: acceptance, error: insertErr } = await svc
    .from('license_acceptances')
    .insert({
      license_id:                    null,  // optional — can be set if license row exists
      user_id:                       page.user_id,
      contract_id:                   contractId,
      license_page_id:               page.id,
      accepter_name:                 name.trim(),
      accepter_email:                email.toLowerCase().trim(),
      acceptance_context:            `Accepted via hosted license page /l/${slug} — "${page.title}"`,
      document_hash_at_acceptance:   documentHash,
      acceptance_fingerprint:        `${email.toLowerCase()}|${slug}|${documentHash ?? 'nohash'}`,
      ip_address:                    rawIp,
      ip_country:                    ipCountry,
      user_agent:                    userAgent?.slice(0, 512) ?? null,
      accepted_at:                   new Date().toISOString(),
    })
    .select('id, accepted_at')
    .single();

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  // Increment view count
  await svc
    .from('license_pages')
    .update({ view_count: (page as unknown as Record<string, number>).view_count + 1 })
    .eq('id', page.id);

  serverTrack('accept_license', null, {
    slug,
    document_hash: documentHash,
  });

  return NextResponse.json({
    ok: true,
    alreadyAccepted: false,
    acceptanceId: acceptance?.id,
    acceptedAt:   acceptance?.accepted_at,
    slug,
    documentHash,
    message: 'License accepted. A copy has been recorded.',
  }, { status: 201 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  const svc = createServiceClient();

  const { data: page } = await svc
    .from('license_pages')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!page) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  if (email) {
    const { data: acceptance } = await svc
      .from('license_acceptances')
      .select('id, accepter_name, accepted_at')
      .eq('license_page_id', page.id)
      .eq('accepter_email', email.toLowerCase())
      .single();

    return NextResponse.json({
      ok: true,
      accepted: Boolean(acceptance),
      acceptance: acceptance ?? null,
    });
  }

  // Return acceptance count
  const { count } = await svc
    .from('license_acceptances')
    .select('id', { count: 'exact', head: true })
    .eq('license_page_id', page.id);

  return NextResponse.json({ ok: true, acceptanceCount: count ?? 0 });
}
