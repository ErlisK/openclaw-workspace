/**
 * POST /api/affiliates/click
 *
 * Records a referral click when a user lands with an affiliate cookie set.
 * Called client-side from the course page on mount when tr_affiliate_ref cookie present.
 *
 * Body: { affiliateCode: string, courseId: string, landingUrl?: string, referrerUrl?: string }
 *
 * Idempotent by nature (click rows accumulate; no dedup needed).
 * Non-authenticated — anyone who lands via a ref link triggers this.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';

const ClickSchema = z.object({
  affiliateCode: z.string().min(1).max(128),
  courseId: z.string().uuid(),
  landingUrl: z.string().url().optional(),
  referrerUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ClickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { affiliateCode, courseId, landingUrl, referrerUrl } = parsed.data;
  const serviceSupa = createServiceClient();

  // Resolve affiliate record by code + course
  const { data: affiliate } = await serviceSupa
    .from('affiliates')
    .select('id')
    .eq('code', affiliateCode)
    .eq('course_id', courseId)
    .eq('is_active', true)
    .maybeSingle();

  if (!affiliate) {
    // Unknown code — silently succeed (don't leak info)
    return NextResponse.json({ recorded: false });
  }

  // Hash IP for privacy (not stored as-is)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '';
  const ua = req.headers.get('user-agent') ?? '';
  const uaType = ua.toLowerCase().includes('mobile') ? 'mobile'
    : ua.toLowerCase().includes('bot') ? 'bot'
    : 'desktop';

  const ipHash = ip ? await hashIp(ip) : null;

  // Record click
  await serviceSupa.from('referrals').insert({
    affiliate_id: affiliate.id,
    course_id: courseId,
    landing_url: landingUrl ?? null,
    referrer_url: referrerUrl ?? null,
    ip_hash: ipHash,
    user_agent_type: uaType,
    converted: false,
  });

  // Increment total_clicks on affiliate record
  await serviceSupa.rpc('increment_affiliate_clicks', { affiliate_id: affiliate.id }).then(
    () => null,
    () => null, // Non-fatal if RPC doesn't exist
  );

  return NextResponse.json({ recorded: true });
}

/** Simple IP hash using SHA-256 (Web Crypto — available in Edge runtime) */
async function hashIp(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    throw new Error('IP_HASH_SALT environment variable is required');
  }
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
