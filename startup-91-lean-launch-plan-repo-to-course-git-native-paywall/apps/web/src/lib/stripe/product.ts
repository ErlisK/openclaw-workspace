import { stripe } from './client';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Create a Stripe product + price for a course.
 * Idempotent: if stripe_price_id already exists on the course, returns it immediately.
 *
 * Called at:
 *   - Course import time (POST /api/import)
 *   - Checkout time as lazy init (POST /api/checkout)
 *   - Manually via admin/CLI
 */
export async function ensureCourseStripeProduct(courseId: string): Promise<{
  stripeProductId: string;
  stripePriceId: string;
}> {
  const supabase = createServiceClient();

  // Fetch course
  const { data: course, error } = await supabase
    .from('courses')
    .select('id, slug, title, description, price_cents, currency, stripe_product_id, stripe_price_id')
    .eq('id', courseId)
    .single();

  if (error || !course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  // Already set up — return existing IDs
  if (course.stripe_product_id && course.stripe_price_id) {
    return {
      stripeProductId: course.stripe_product_id,
      stripePriceId: course.stripe_price_id,
    };
  }

  // Create Stripe product
  let productId = course.stripe_product_id;
  if (!productId) {
    const product = await stripe.products.create({
      name: course.title,
      description: course.description ?? undefined,
      metadata: {
        course_id: courseId,
        course_slug: course.slug,
        source: 'teachrepo',
      },
    });
    productId = product.id;
  }

  // Create Stripe price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: course.price_cents,
    currency: course.currency.toLowerCase(),
    metadata: {
      course_id: courseId,
    },
  });

  // Persist IDs back to Supabase
  await supabase
    .from('courses')
    .update({
      stripe_product_id: productId,
      stripe_price_id: price.id,
    })
    .eq('id', courseId);

  return { stripeProductId: productId, stripePriceId: price.id };
}

/**
 * Update the Stripe price for a course (when price_cents changes).
 * Archives the old price and creates a new one.
 */
export async function updateCourseStripePrice(
  courseId: string,
  newPriceCents: number,
  currency: string
): Promise<{ stripePriceId: string }> {
  const supabase = createServiceClient();

  const { data: course } = await supabase
    .from('courses')
    .select('stripe_product_id, stripe_price_id')
    .eq('id', courseId)
    .single();

  if (!course?.stripe_product_id) {
    throw new Error('Course has no Stripe product — call ensureCourseStripeProduct first');
  }

  // Archive old price
  if (course.stripe_price_id) {
    await stripe.prices.update(course.stripe_price_id, { active: false });
  }

  // Create new price
  const price = await stripe.prices.create({
    product: course.stripe_product_id,
    unit_amount: newPriceCents,
    currency: currency.toLowerCase(),
    metadata: { course_id: courseId },
  });

  await supabase
    .from('courses')
    .update({ stripe_price_id: price.id, price_cents: newPriceCents })
    .eq('id', courseId);

  return { stripePriceId: price.id };
}
