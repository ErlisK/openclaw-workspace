/**
 * app/api/contracts/[contractId]/accept-disclaimer/route.ts
 * POST – log disclaimer acceptance for a contract.
 * Requires auth. Stores audit_logs row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;

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

    const { data: contract } = await svc
      .from('generated_contracts')
      .select('id, user_id')
      .eq('document_id', contractId)
      .single();

    if (!contract) {
      return NextResponse.json({ ok: false, error: 'Contract not found' }, { status: 404 });
    }

    if (contract.user_id && contract.user_id !== userId) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? null;

    const now = new Date().toISOString();

    // Idempotent — only log if not already accepted
    const { data: existing } = await svc
      .from('audit_logs')
      .select('id')
      .eq('event', 'disclaimer_accepted')
      .eq('resource_id', contract.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await svc.from('audit_logs').insert({
        user_id: userId,
        event: 'disclaimer_accepted',
        resource_id: contract.id,
        resource_type: 'generated_contract',
        ip: ip,
        created_at: now,
        extra: { contract_document_id: contractId, accepted_at: now },
      });
    }

    // Best-effort update accepted_at on contract
    try {
      await svc
        .from('generated_contracts')
        .update({ accepted_at: now } as Record<string, unknown>)
        .eq('id', contract.id);
    } catch { /* column may not exist yet */ }

    return NextResponse.json({ ok: true, acceptedAt: now });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[accept-disclaimer]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
