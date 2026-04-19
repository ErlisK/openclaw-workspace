/**
 * GET /api/creator/purchasers
 *
 * Returns purchase records (with buyer email) for courses owned by the
 * authenticated creator. Calls the `get_creator_purchasers` security-definer
 * function — only the course creator sees results; Stripe PII is excluded.
 *
 * Query params:
 *   courseId  — optional UUID; filters to a specific course
 *
 * Auth: Bearer token OR SSR session cookie (via resolveUser)
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse optional courseId filter ────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId') ?? null;

  if (courseId && !/^[0-9a-f-]{36}$/.test(courseId)) {
    return NextResponse.json({ error: 'Invalid courseId format' }, { status: 400 });
  }

  // ── 3. Call security-definer RPC with creator's JWT ───────────────────────
  // The function internally checks auth.uid() = creator_id — so we must call it
  // with the user's JWT (not service role) to enforce creator scope.
  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    jwt
      ? { global: { headers: { Authorization: `Bearer ${jwt}` } } }
      : {},
  );

  const { data, error } = await userSupabase.rpc('get_creator_purchasers', {
    p_course_id: courseId,
  });

  if (error) {
    console.error('[creator/purchasers] RPC error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch purchasers' }, { status: 500 });
  }

  return NextResponse.json({
    purchasers: data ?? [],
    total: (data ?? []).length,
  });
}
