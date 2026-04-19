import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
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

  return NextResponse.json(
    { message: 'Account created. Check your email to confirm your address.', userId: data.user?.id },
    { status: 201 },
  );
}
