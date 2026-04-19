import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { rateLimitRequest, tooManyRequestsResponse } from '@/lib/rate-limit';

const ClickSchema = z.object({
  affiliateCode: z.string().min(1).max(128),
  courseId: z.string().uuid(),
  landingUrl: z.string().url().optional(),
  referrerUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  // Rate-limit by IP (unauthenticated route — must be protected)
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd ? fwd.split(',').at(-1)?.trim() ?? '' : req.headers.get('x-real-ip') ?? '';
  const rlResult = await rateLimitRequest(ip || 'anon', { limit: 30, windowMs: 60_000, bucket: 'affiliate-click' });
  if (!rlResult.success) return tooManyRequestsResponse(rlResult);

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

  const ua = req.headers.get('user-agent') ?? '';
  const uaType = ua.toLowerCase().includes('mobile') ? 'mobile'
    : ua.toLowerCase().includes('bot') ? 'bot'
    : 'desktop';

  // Hash IP for privacy; gracefully degrade if salt is missing
  let ipHash: string | null = null;
  try {
    ipHash = ip ? await hashIp(ip) : null;
  } catch {
    ipHash = null; // Non-fatal — record click without hash
  }

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

