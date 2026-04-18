import { stripe } from './client';
import { createServiceClient } from '@/lib/supabase/service';

export async function ensureCourseStripeProduct(courseId: string): Promise<{
  stripeProductId: string;
  stripePriceId: string;
}> {
  const supabase = createServiceClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title, description, price_cents, currency, stripe_product_id, stripe_price_id')
    .eq('id', courseId)
    .single();

  if (!course) throw new Error(`Course not found: ${courseId}`);
  if (course.stripe_product_id && course.stripe_price_id) {
    return { stripeProductId: course.stripe_product_id, stripePriceId: course.stripe_price_id };
  }

  let productId = course.stripe_product_id;
  if (!productId) {
    const product = await stripe.products.create({
      name: course.title,
      description: course.description ?? undefined,
      metadata: { course_id: courseId, course_slug: course.slug },
    });
    productId = product.id;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: course.price_cents,
    currency: course.currency.toLowerCase(),
    metadata: { course_id: courseId },
  });

  await supabase.from('courses').update({ stripe_product_id: productId, stripe_price_id: price.id }).eq('id', courseId);
  return { stripeProductId: productId, stripePriceId: price.id };
}
