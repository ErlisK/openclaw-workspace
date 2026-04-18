import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe, APP_URL } from '@/lib/stripe/client';
import { ensureCourseStripeProduct } from '@/lib/stripe/product';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const CheckoutRequestSchema = z.object({
  courseId: z.string().uuid(),
});

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for a course purchase.
 * Returns { url } — the client redirects to stripe.com.
 *
 * Idempotency:
 *   - Returns 409 if the user already has an active enrollment.
 *   - Reuses a pending Checkout Session if one exists and hasn't expired.
 *
 * Security:
 *   - Requires Supabase auth session.
 *   - Embeds user_id + course_id in session metadata.
 *   - Embeds client_reference_id = user_id (verified on return).
 */
export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { courseId } = parsed.data;
  const serviceSupa = createServiceClient();

  // 3. Fetch course
  const { data: course, error: courseError } = await serviceSupa
    .from('courses')
    .select('id, slug, title, price_cents, currency, pricing_model, stripe_price_id, published')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  if (!course.published) {
    return NextResponse.json({ error: 'Course is not published' }, { status: 404 });
  }

  // 4. Free courses bypass Stripe
  if (course.pricing_model === 'free' || course.price_cents === 0) {
    return NextResponse.json(
      { error: 'This course is free — use POST /api/enroll/free instead' },
      { status: 400 }
    );
  }

  // 5. Check for existing enrollment
  const { data: existingEnrollment } = await serviceSupa
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .is('revoked_at', null)
    .maybeSingle();

  if (existingEnrollment) {
    return NextResponse.json(
      {
        error: 'Already enrolled',
        courseSlug: course.slug,
        redirectUrl: `/courses/${course.slug}`,
      },
      { status: 409 }
    );
  }

  // 6. Check for a pending (unexpired) session we can reuse
  const { data: pendingPurchase } = await serviceSupa
    .from('purchases')
    .select('stripe_session_id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingPurchase?.stripe_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        pendingPurchase.stripe_session_id
      );
      if (existing.status === 'open' && existing.url) {
        return NextResponse.json({ url: existing.url });
      }
    } catch {
      // Session not found or expired — fall through to create new one
    }
  }

  // 7. Lazy-init Stripe product/price if not yet created
  let stripePriceId = course.stripe_price_id;
  if (!stripePriceId) {
    const { stripePriceId: newPriceId } = await ensureCourseStripeProduct(courseId);
    stripePriceId = newPriceId;
  }

  // 8. Read affiliate ID from cookie (set by middleware on ?ref= visits)
  const affiliateCookie = req.cookies.get('tr_affiliate_ref')?.value ?? '';

  // 9. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    // success_url uses {CHECKOUT_SESSION_ID} — Stripe replaces at redirect time
    success_url: `${APP_URL}/courses/${course.slug}/enroll?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/courses/${course.slug}?checkout=cancelled`,

    // Binds the Stripe session to this Supabase user — verified on return
    client_reference_id: user.id,
    customer_email: user.email,

    // Metadata for webhook + return verification
    metadata: {
      course_id: courseId,
      course_slug: course.slug,
      user_id: user.id,
      affiliate_id: affiliateCookie,
    },

    // 30-minute expiry
    expires_at: Math.floor(Date.now() / 1000) + 1800,
  });

  // 10. Record pending purchase
  await serviceSupa.from('purchases').insert({
    user_id: user.id,
    course_id: courseId,
    stripe_session_id: session.id,
    amount_cents: course.price_cents,
    currency: course.currency,
    status: 'pending',
    affiliate_id: affiliateCookie || null,
  });

  return NextResponse.json({ url: session.url });
}
