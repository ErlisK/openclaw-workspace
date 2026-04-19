/**
 * GET /api/entitlement/check?courseId=<uuid>
 *
 * Client-callable entitlement re-check after purchase.
 * Returns { enrolled: boolean } — used by the PaywallGate component to
 * auto-unlock content after Stripe Checkout returns without a full page reload.
 *
 * Auth: SSR cookie OR Bearer token (for API clients and tests)
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('courseId');
  if (!courseId || !/^[0-9a-f-]{36}$/.test(courseId)) {
    return NextResponse.json({ error: 'Missing or invalid courseId' }, { status: 400 });
  }

  const serviceSupa = createServiceClient();

  // Check if course is free — free courses are always enrolled
  const { data: course } = await serviceSupa
    .from('courses')
    .select('price_cents')
    .eq('id', courseId)
    .single();

  if (course?.price_cents === 0) {
    return NextResponse.json({ enrolled: true, userId: null });
  }

  // resolveUser handles both Bearer token (API clients/tests) and SSR cookies (browser)
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ enrolled: false, userId: null });
  }

  // Check enrollment row
  const { data } = await serviceSupa
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .is('entitlement_revoked_at', null)
    .maybeSingle();

  return NextResponse.json({ enrolled: !!data, userId: user.id });
}
