/**
 * GET /api/debug-checkout?courseId=xxx
 * Temporary debug endpoint — diagnoses checkout errors.
 * Remove before production launch.
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe, APP_URL } from '@/lib/stripe/client';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const steps: Record<string, unknown> = {};
  try {
    const user = await resolveUser(req);
    steps['auth'] = user ? { id: user.id, email: user.email } : 'FAILED — no user';
    if (!user) return NextResponse.json({ steps }, { status: 401 });

    const courseId = req.nextUrl.searchParams.get('courseId') ?? '';
    const supa = createServiceClient();

    const { data: course, error } = await supa.from('courses')
      .select('id, slug, title, price_cents, currency, pricing_model, stripe_price_id, published')
      .eq('id', courseId).single();
    steps['course'] = course ? { price_cents: course.price_cents, stripe_price_id: course.stripe_price_id, pricing_model: course.pricing_model } : { error: error?.message };

    steps['stripe_key_prefix'] = process.env.STRIPE_SECRET_KEY?.slice(0, 10) + '...';
    steps['APP_URL'] = APP_URL;

    if (course?.stripe_price_id) {
      const price = await stripe.prices.retrieve(course.stripe_price_id);
      steps['stripe_price'] = { id: price.id, active: price.active, unit_amount: price.unit_amount };
    }

    // Try creating a minimal Checkout session
    if (course?.stripe_price_id) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: course.stripe_price_id, quantity: 1 }],
        success_url: `${APP_URL}/courses/${course.slug}?checkout=success`,
        cancel_url: `${APP_URL}/courses/${course.slug}?checkout=cancelled`,
        client_reference_id: user.id,
        customer_email: user.email,
        metadata: { course_id: courseId, user_id: user.id, affiliate_id: '', affiliate_code: '' },
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      });
      steps['checkout_session'] = { id: session.id, url: session.url?.slice(0, 60) };
    }

    return NextResponse.json({ ok: true, steps });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500), steps }, { status: 500 });
  }
}
