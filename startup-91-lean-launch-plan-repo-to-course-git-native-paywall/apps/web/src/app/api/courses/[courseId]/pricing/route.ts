/**
 * PATCH /api/courses/[courseId]/pricing
 *
 * Updates course price_cents + currency in DB.
 * Creates a new Stripe Price when price changes; deactivates the old one.
 * If price_cents === 0, clears stripe_price_id (free course needs no Stripe Price).
 *
 * Auth: Bearer token or SSR cookie — creator must own the course.
 *
 * Body: { price_cents: number (0–99999 * 100), currency: string }
 * Returns: { price_cents, currency, stripe_product_id, stripe_price_id, updated_at }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe/client';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

const PricingSchema = z.object({
  price_cents: z.number().int().min(0).max(9999900,
    'Price cannot exceed $99,999'),
  currency: z.string().length(3).toLowerCase().default('usd'),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } },
) {
  const { courseId } = params;
  if (!courseId) {
    return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
  }

  // 1. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PricingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { price_cents, currency } = parsed.data;

  // 2. Auth
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Fetch course (must be owned by this creator)
  const serviceSupa = createServiceClient();
  const { data: course } = await serviceSupa
    .from('courses')
    .select('id, title, description, slug, price_cents, currency, stripe_product_id, stripe_price_id')
    .eq('id', courseId)
    .eq('creator_id', user.id)
    .single();

  if (!course) {
    return NextResponse.json({ error: 'Course not found or not owned by you' }, { status: 404 });
  }

  const priceChanged =
    course.price_cents !== price_cents ||
    (course.currency ?? 'usd').toLowerCase() !== currency.toLowerCase();

  let newProductId: string | null = course.stripe_product_id ?? null;
  let newPriceId: string | null = course.stripe_price_id ?? null;

  // 4. Sync with Stripe if price changed
  if (priceChanged) {
    if (price_cents === 0) {
      // Free course — no Stripe Price needed; deactivate existing if any
      if (course.stripe_price_id) {
        try {
          await stripe.prices.update(course.stripe_price_id, { active: false });
        } catch {
          // Non-fatal — Stripe may already have deactivated it
        }
      }
      newPriceId = null;
    } else {
      // Paid course — ensure Stripe Product exists, then create a new Price
      if (!newProductId) {
        const product = await stripe.products.create({
          name: course.title,
          description: course.description ?? undefined,
          metadata: { course_id: courseId, course_slug: course.slug },
        });
        newProductId = product.id;
      }

      // Deactivate old price if it exists
      if (course.stripe_price_id) {
        try {
          await stripe.prices.update(course.stripe_price_id, { active: false });
        } catch {
          // Non-fatal
        }
      }

      // Create new price
      const newPrice = await stripe.prices.create({
        product: newProductId,
        unit_amount: price_cents,
        currency: currency.toLowerCase(),
        metadata: { course_id: courseId },
      });
      newPriceId = newPrice.id;
    }
  }

  // 5. Persist to DB
  const { data: updated, error: updateError } = await serviceSupa
    .from('courses')
    .update({
      price_cents,
      currency: currency.toLowerCase(),
      pricing_model: price_cents === 0 ? 'free' : 'one_time',
      stripe_product_id: newProductId,
      stripe_price_id: newPriceId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .select('price_cents, currency, stripe_product_id, stripe_price_id, updated_at')
    .single();

  if (updateError) {
    console.error('[pricing] DB update error:', updateError.message);
    return NextResponse.json({ error: 'Failed to save pricing' }, { status: 500 });
  }

  return NextResponse.json(updated);
}
