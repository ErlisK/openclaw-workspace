/**
 * app/api/contracts/[contractId]/history/route.ts
 * GET /api/contracts/:documentId/history
 * Returns version history for a contract (all contracts with same template_slug + user_id).
 */
import { NextResponse } from 'next/server';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params;

  const auth = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await auth.auth.getUser();
  if (authErr || !user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient();

  // Fetch the target contract first
  const { data: target, error: fetchErr } = await svc
    .from('generated_contracts')
    .select('id, template_slug, user_id')
    .eq('document_id', contractId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !target) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  // Fetch all contracts with same template_slug for this user (version history)
  const { data: history } = await svc
    .from('generated_contracts')
    .select(`
      document_id, product_name, version_number, template_version,
      minor_edit_note, edited_at, verification_hash, created_at, is_active,
      parent_document_id
    `)
    .eq('user_id', user.id)
    .eq('template_slug', target.template_slug)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    ok: true,
    templateSlug: target.template_slug,
    history: history ?? [],
  });
}
