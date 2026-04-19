import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { rateLimitRequest, tooManyRequestsResponse } from '@/lib/rate-limit';

const BodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  // Rate limit: 5 requests per IP per 15 minutes to prevent abuse
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd ? fwd.split(',').at(-1)?.trim() ?? 'anon' : req.headers.get('x-real-ip') ?? 'anon';
  const rl = await rateLimitRequest(ip, { limit: 5, windowMs: 15 * 60_000, bucket: 'forgot-password' });
  if (!rl.success) return tooManyRequestsResponse(rl);

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://teachrepo.com';
  const supabase = createServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    // Log server-side but do not leak to client (prevent email enumeration)
    console.error('[forgot-password] Supabase error:', error.message);
  }

  // Always return 200 — prevents email enumeration
  return NextResponse.json(
    { message: 'If that email exists, a reset link has been sent.' },
    { status: 200 }
  );
}
