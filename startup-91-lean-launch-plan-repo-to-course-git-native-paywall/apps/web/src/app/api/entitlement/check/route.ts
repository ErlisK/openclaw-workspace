/**
 * GET /api/entitlement/check?courseId=<uuid>
 *
 * Client-callable entitlement re-check after purchase.
 * Returns { enrolled: boolean } — used by the PaywallGate component to
 * auto-unlock content after Stripe Checkout returns without a full page reload.
 *
 * Auth: SSR cookie (no Bearer for this endpoint — it's called from the browser)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkEntitlement } from '@/lib/entitlement/check';

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('courseId');
  if (!courseId || !/^[0-9a-f-]{36}$/.test(courseId)) {
    return NextResponse.json({ error: 'Missing or invalid courseId' }, { status: 400 });
  }

  const result = await checkEntitlement({ courseId });
  return NextResponse.json({ enrolled: result.enrolled, userId: result.userId });
}
