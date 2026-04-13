/**
 * app/api/contracts/[contractId]/revise/route.ts
 * POST /api/contracts/:documentId/revise
 * Body: { note: string }
 *
 * Records a minor revision note on a contract, bumping its revision counter.
 * Does NOT re-run the generator — just records the editorial note and bumps version_number.
 * For major changes, user should run wizard again.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';
import { ReviseSchema } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const limited = rateLimit(request, { limit: 30, window: 60, prefix: 'revise' });
  if (limited) return limited;

  const { contractId } = await params;

  // Auth
  const auth = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await auth.auth.getUser();
  if (authErr || !user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const rawBody = await request.json();
  const parsed = ReviseSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'note is required' }, { status: 400 });
  }
  const { note } = parsed.data;

  const svc = createServiceClient();

  // Fetch the contract (must belong to user)
  const { data: contract, error: fetchErr } = await svc
    .from('generated_contracts')
    .select('id, document_id, version_number, user_id')
    .eq('document_id', contractId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !contract) {
    return NextResponse.json({ ok: false, error: 'Contract not found or not owned by you' }, { status: 404 });
  }

  const newVersion = (contract.version_number ?? 1) + 1;

  const { error: updateErr } = await svc
    .from('generated_contracts')
    .update({
      version_number:   newVersion,
      minor_edit_note:  note.trim(),
      edited_at:        new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    })
    .eq('id', contract.id);

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok:         true,
    documentId: contractId,
    revision:   newVersion,
    note:       note.trim(),
    editedAt:   new Date().toISOString(),
  });
}
