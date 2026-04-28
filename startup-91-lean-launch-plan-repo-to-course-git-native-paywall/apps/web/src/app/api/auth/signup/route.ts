import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { trackSignupCompleted } from '@/lib/analytics/server';
import { rateLimitRequest, getClientIp, tooManyRequestsResponse } from '@/lib/rate-limit';

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per IP per 15 minutes to prevent bot/spam registrations
  const ip = getClientIp(req);
  const rl = await rateLimitRequest(ip, { limit: 5, windowMs: 15 * 60_000, bucket: 'signup' });
  if (!rl.success) return tooManyRequestsResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const supabase = createServerClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Differentiate duplicate from other errors without leaking details
    if (error.message?.toLowerCase().includes('already registered') || error.status === 422) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
    }
    console.error('[auth/signup] Supabase error:', error.message);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }

  // Track signup event (fire-and-forget — don't block response)
  if (data.user?.id) {
    void trackSignupCompleted({ userId: data.user.id, properties: { email } });
  }

  return NextResponse.json(
    { message: 'Account created. You can now sign in.', userId: data.user?.id },
    { status: 201 },
  );
}
