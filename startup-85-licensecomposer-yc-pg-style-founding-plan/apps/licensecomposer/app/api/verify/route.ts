/**
 * app/api/verify/route.ts
 * GET /api/verify?doc_id=contract_xxx
 * GET /api/verify?hash=abc123def456...
 *
 * Convenience endpoint — redirects to the canonical /api/verify/[hash] URL.
 * Allows consumers to use either doc_id or hash as query params.
 */
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Rate limit: 10 req/min per IP (M1 fix)
  const limited = rateLimit(request, { limit: 10, window: 60, prefix: 'verify' });
  if (limited) return limited;
  const { searchParams } = new URL(request.url);
  const docId  = searchParams.get('doc_id');
  const hash   = searchParams.get('hash');
  const format = searchParams.get('format');

  // Hash-based lookup — redirect to canonical URL
  if (hash) {
    const url = format ? `/api/verify/${hash}?format=${format}` : `/api/verify/${hash}`;
    redirect(url);
  }

  // doc_id lookup — fetch hash then redirect
  if (docId) {
    const svc = createServiceClient();
    const { data } = await svc
      .from('generated_contracts')
      .select('verification_hash, document_id')
      .eq('document_id', docId)
      .single();

    if (!data) {
      return NextResponse.json({ ok: false, error: 'Contract not found' }, { status: 404 });
    }

    const shortHash = (data.verification_hash ?? '').slice(0, 16);
    const url = format
      ? `/api/verify/${shortHash}?format=${format}`
      : `/api/verify/${shortHash}?doc_id=${docId}`;
    redirect(url);
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'Missing parameter',
      usage: [
        'GET /api/verify?doc_id=contract_xxx',
        'GET /api/verify?hash=<sha256-prefix>',
        'GET /api/verify/<hash>',
        'GET /api/verify/<hash>?format=jsonld',
      ],
    },
    { status: 400 }
  );
}
