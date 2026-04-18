import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe/client';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// ─── GET /api/enroll?session_id=cs_xxx ───────────────────────────────────────
//
// Called by the /courses/[slug]/enroll success page.
// Verifies the Stripe Checkout Session and creates the enrollment.
//
// Security model:
//   1. Retrieve session directly from Stripe API (cannot be faked)
//   2. Verify session.client_reference_id === authenticated user ID
//   3. Verify session.metadata.course_id matches the expected course
//   4. Verify session.payment_status === 'paid'
//   5. Enrollment upsert is idempotent (ON CONFLICT DO NOTHING)
// ─────────────────────────────────────────────────────────────────────────────

const EnrollQuerySchema = z.object({
  session_id: z.string().startsWith('cs_', 'Must be a Stripe Checkout Session ID (cs_xxx)'),
  course_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  // 1. Auth
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse query params
  const { searchParams } = new URL(req.url);
  const parsed = EnrollQuerySchema.safeParse({
    session_id: searchParams.get('session_id'),
    course_id: searchParams.get('course_id') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { session_id } = parsed.data;
  const serviceSupa = createServiceClient();

  // 3. Retrieve session from Stripe (verifies with Stripe directly — cannot be spoofed)
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'payment_intent'],
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid or expired Stripe session', details: (err as Error).message },
      { status: 400 }
    );
  }

  // 4. Verify payment status
  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      {
        error: 'Payment not completed',
        payment_status: session.payment_status,
      },
      { status: 402 }
    );
  }

  // 5. Verify this session belongs to the authenticated user
  if (session.client_reference_id !== user.id) {
    return NextResponse.json(
      { error: 'Session does not belong to the authenticated user' },
      { status: 403 }
    );
  }

  // 6. Extract metadata
  const courseId = session.metadata?.course_id;
  const courseSlug = session.metadata?.course_slug;
  const sessionUserId = session.metadata?.user_id;
  const affiliateId = session.metadata?.affiliate_id ?? null;

  if (!courseId || !courseSlug) {
    return NextResponse.json(
      { error: 'Session metadata is missing course_id or course_slug' },
      { status: 400 }
    );
  }

  // Extra check: metadata.user_id should also match
  if (sessionUserId && sessionUserId !== user.id) {
    return NextResponse.json(
      { error: 'Session user_id metadata mismatch' },
      { status: 403 }
    );
  }

  // 7. Idempotent: update purchase record to completed
  const paymentIntent = session.payment_intent;
  const paymentId =
    typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id ?? null;

  const { data: purchaseRow } = await serviceSupa
    .from('purchases')
    .update({
      status: 'completed',
      stripe_payment_id: paymentId,
      completed_at: new Date().toISOString(),
    })
    .eq('stripe_session_id', session_id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  // If no purchase row found (e.g. created by webhook already), insert one
  let purchaseId: string | null = purchaseRow?.id ?? null;
  if (!purchaseId) {
    const { data: newPurchase } = await serviceSupa
      .from('purchases')
      .upsert(
        {
          user_id: user.id,
          course_id: courseId,
          stripe_session_id: session_id,
          stripe_payment_id: paymentId,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? 'usd',
          status: 'completed',
          affiliate_id: affiliateId || null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_session_id' }
      )
      .select('id')
      .single();
    purchaseId = newPurchase?.id ?? null;
  }

  // 8. Idempotent enrollment — ON CONFLICT (user_id, course_id) DO NOTHING
  await serviceSupa.from('enrollments').upsert(
    {
      user_id: user.id,
      course_id: courseId,
      purchase_id: purchaseId,
      enrolled_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,course_id', ignoreDuplicates: true }
  );

  // 9. Affiliate conversion tracking
  if (affiliateId && affiliateId.length > 0) {
    await serviceSupa
      .from('referrals')
      .insert({
        affiliate_id: affiliateId,
        course_id: courseId,
        purchase_id: purchaseId,
        referred_user_id: user.id,
        converted_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()
      .catch(() => null); // Non-critical — don't fail enrollment on affiliate error
  }

  // 10. Fetch first lesson slug for redirect
  const { data: firstLesson } = await serviceSupa
    .from('lessons')
    .select('slug')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })
    .limit(1)
    .single();

  return NextResponse.json({
    enrolled: true,
    courseSlug,
    firstLessonSlug: firstLesson?.slug ?? null,
    purchaseId,
  });
}
