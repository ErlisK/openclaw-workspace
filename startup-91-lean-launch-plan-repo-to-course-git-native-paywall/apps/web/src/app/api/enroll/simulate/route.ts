import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * POST /api/enroll/simulate
 *
 * TEST-ONLY endpoint that simulates a completed Stripe purchase without
 * going through the checkout UI. Creates the purchase + enrollment rows
 * exactly as GET /api/enroll does after a real Stripe payment.
 *
 * This is gated to test/preview environments only.
 * The endpoint is disabled in production (NODE_ENV=production + no SIMULATE_ENABLED flag).
 *
 * Request body:
 *   { courseId: string (uuid), referralId?: string }
 *
 * Returns the same shape as GET /api/enroll:
 *   { enrolled, courseSlug, firstLessonSlug, purchaseId }
 */

const SimulateSchema = z.object({
  courseId: z.string().uuid(),
  referralId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Gate: ALWAYS disabled in production — no override flag respected
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Purchase simulation is disabled in production' },
      { status: 403 },
    );
  }

  // Validate before auth
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = SimulateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
  }

  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, referralId } = parsed.data;
  const serviceSupa = createServiceClient();

  // Fetch course
  const { data: course } = await serviceSupa
    .from('courses')
    .select('id, slug, price_cents, currency, published, creator_id')
    .eq('id', courseId)
    .single();

  if (!course || !course.published) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Idempotency: check for existing enrollment
  const { data: existingEnrollment } = await serviceSupa
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .is('entitlement_revoked_at', null)
    .maybeSingle();

  if (existingEnrollment) {
    return NextResponse.json({ error: 'Already enrolled', courseSlug: course.slug }, { status: 409 });
  }

  // Resolve affiliate record if referralId (user_id of affiliate) is provided
  // The purchases.affiliate_id is a FK to affiliates.id, not to auth.users.id
  let affiliateRecordId: string | null = null;
  if (referralId) {
    // Find or create an affiliate record for this user+course
    const { data: existingAffiliate } = await serviceSupa
      .from('affiliates')
      .select('id')
      .eq('affiliate_user_id', referralId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingAffiliate) {
      affiliateRecordId = existingAffiliate.id;
    } else {
      const { data: newAffiliate } = await serviceSupa
        .from('affiliates')
        .insert({
          affiliate_user_id: referralId,
          creator_id: course.creator_id as string,
          course_id: courseId,
          code: `sim-${referralId.slice(0, 8)}-${courseId.slice(0, 8)}`,
          commission_pct: 20,
          is_active: true,
        })
        .select('id')
        .single();
      affiliateRecordId = newAffiliate?.id ?? null;
    }
  }

  // Create a simulated purchase row (no real Stripe session)
  const simulatedSessionId = `cs_simulated_${Date.now()}_${user.id.slice(0, 8)}`;
  const now = new Date().toISOString();

  const { data: newPurchase, error: purchaseError } = await serviceSupa
    .from('purchases')
    .insert({
      user_id: user.id,
      course_id: courseId,
      stripe_session_id: simulatedSessionId,
      stripe_payment_intent_id: null,
      amount_cents: course.price_cents,
      currency: course.currency ?? 'usd',
      status: 'completed',
      affiliate_id: affiliateRecordId ?? null,
      purchased_at: now,
    })
    .select('id')
    .single();

  if (purchaseError) {
    console.error('[enroll/simulate] purchase insert error:', purchaseError.message);
  }
  const purchaseId = newPurchase?.id ?? null;

  // Create enrollment with entitlement granted
  await serviceSupa.from('enrollments').upsert(
    {
      user_id: user.id,
      course_id: courseId,
      purchase_id: purchaseId,
      entitlement_granted_at: now,
      enrolled_at: now,
    },
    { onConflict: 'user_id,course_id', ignoreDuplicates: true },
  );

  // Affiliate conversion tracking
  if (referralId && affiliateRecordId) {
    await serviceSupa.from('referrals').insert({
      affiliate_id: affiliateRecordId,
      course_id: courseId,
      purchase_id: purchaseId,
      converted: true,
      converted_at: now,
    }).then(() => null, () => null);
  }

  // Fetch first lesson
  const { data: firstLesson } = await serviceSupa
    .from('lessons')
    .select('slug')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })
    .limit(1)
    .single();

  return NextResponse.json({
    enrolled: true,
    courseSlug: course.slug,
    firstLessonSlug: firstLesson?.slug ?? null,
    purchaseId,
    simulated: true,
  });
}
