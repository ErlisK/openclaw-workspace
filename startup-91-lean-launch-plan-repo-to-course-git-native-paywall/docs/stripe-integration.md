# TeachRepo — Stripe Integration Design

**Version:** 1.0  
**Last updated:** 2025-04  
**Validates:** H4 (Stripe Checkout + immediate entitlement unlock)

---

## Overview

TeachRepo uses **Stripe Checkout** (hosted redirect) for all payments. No custom payment form. This minimizes PCI scope, reduces implementation complexity, and leverages Stripe's built-in fraud protection and payment method optimization.

---

## Tier Structure

| Tier | Model | Price | Stripe Object |
|------|-------|-------|---------------|
| **Self-Hosted Free** | Free forever | $0 | n/a — user brings own Stripe |
| **Creator SaaS** | Flat subscription | $29/mo | `price_monthly_creator` recurring |
| **Course One-Time** | One-time payment | Creator-set | `price_course_xxxx` one-time |
| **Marketplace Rev-Share** | Platform fee | 15% of sale | Stripe Connect + `application_fee_amount` |

---

## Payment Flow: Course Purchase (One-Time)

### Sequence Diagram

```
Student                TeachRepo Web           Stripe              DB (Supabase)
   |                        |                    |                      |
   |  Click "Enroll Now"    |                    |                      |
   |----------------------->|                    |                      |
   |                        | POST /api/checkout |                      |
   |                        | (create session)   |                      |
   |                        |------------------->|                      |
   |                        |  session.url       |                      |
   |                        |<-------------------|                      |
   |  Redirect to stripe.com|                    |                      |
   |<-----------------------|                    |                      |
   |                        |                    |                      |
   |  (Student pays on Stripe hosted page)       |                      |
   |                        |                    |                      |
   |  Redirect to /success  |                    |                      |
   |----------------------->|  webhook: checkout.|                      |
   |                        |  session.completed  |                      |
   |                        |<-------------------|                      |
   |                        |                    | INSERT enrollment    |
   |                        |                    |--------------------->|
   |                        |                    |  entitlement_granted |
   |                        |                    |<---------------------|
   |  Load /courses/.../learn                    |                      |
   |----------------------->| Check enrollment   |                      |
   |                        |------------------------------------------->|
   |                        |  enrolled = true   |                      |
   |                        |<-------------------------------------------|
   |  Show lesson content   |                    |                      |
   |<-----------------------|                    |                      |
```

---

## Stripe Checkout Session Creation

### API Route: `POST /api/checkout/create-session`

```typescript
// apps/web/app/api/checkout/route.ts

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { courseId, affiliateRef } = await req.json();
  const supabase = createClient();
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Get course details
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, price_cents, currency, stripe_price_id')
    .eq('id', courseId)
    .single();

  if (!course) return new Response('Course not found', { status: 404 });

  // Check not already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();

  if (existing) return new Response('Already enrolled', { status: 409 });

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price: course.stripe_price_id,
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}/learn?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}?checkout=cancelled`,
    customer_email: user.email,
    client_reference_id: user.id,  // Used in webhook to link to user
    metadata: {
      course_id: courseId,
      user_id: user.id,
      affiliate_ref: affiliateRef || '',
    },
  });

  // Log checkout_initiated analytics event
  await supabase.from('analytics_events').insert({
    user_id: user.id,
    course_id: courseId,
    event_name: 'checkout_initiated',
    properties: {
      price_cents: course.price_cents,
      currency: course.currency,
      stripe_session_id: session.id,
      affiliate_ref: affiliateRef || null,
    },
  });

  return Response.json({ url: session.url });
}
```

---

## Webhook Handler

### API Route: `POST /api/webhooks/stripe`

This is the **critical path** for entitlement. The webhook must be reliable and idempotent.

```typescript
// apps/web/app/api/webhooks/stripe/route.ts

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// Use SERVICE ROLE key — bypasses RLS for entitlement write
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  const receivedAt = Date.now();

  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session, receivedAt);
      break;
    }
    case 'customer.subscription.deleted': {
      // SaaS tier: handle subscription cancellation
      await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
      break;
    }
    case 'invoice.payment_failed': {
      // SaaS tier: handle failed renewal
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    }
  }

  return new Response('ok', { status: 200 });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  receivedAt: number
) {
  const { course_id, user_id, affiliate_ref } = session.metadata!;
  const now = new Date().toISOString();

  // Idempotent: check if enrollment already exists for this session
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('stripe_session_id', session.id)
    .single();

  if (existing) return; // Already processed — idempotency

  // Grant entitlement
  await supabase.from('enrollments').insert({
    user_id,
    course_id,
    stripe_session_id: session.id,
    enrolled_at: now,
    entitlement_granted_at: now,
  });

  // Handle affiliate attribution
  if (affiliate_ref) {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, commission_pct')
      .eq('code', affiliate_ref)
      .eq('course_id', course_id)
      .single();

    if (affiliate) {
      const commissionCents = Math.floor(
        (session.amount_total! * affiliate.commission_pct) / 100
      );
      await supabase.from('affiliate_conversions').insert({
        affiliate_id: affiliate.id,
        enrollment_id: null, // Set via join after insert
        commission_cents: commissionCents,
      });
    }
  }

  // Log analytics events
  const latencyMs = Date.now() - receivedAt;
  await supabase.from('analytics_events').insert([
    {
      user_id,
      course_id,
      event_name: 'checkout_completed',
      properties: {
        price_cents: session.amount_total,
        stripe_session_id: session.id,
        affiliate_ref: affiliate_ref || null,
      },
    },
    {
      user_id,
      course_id,
      event_name: 'entitlement_granted',
      properties: {
        stripe_session_id: session.id,
        latency_ms: latencyMs,
        method: 'webhook',
      },
    },
  ]);
}
```

---

## Webhook Events Handled

| Event | Action | Priority |
|-------|--------|----------|
| `checkout.session.completed` | Grant course entitlement | 🔴 Critical |
| `customer.subscription.created` | Activate SaaS tier | 🟠 High |
| `customer.subscription.updated` | Update tier (upgrade/downgrade) | 🟠 High |
| `customer.subscription.deleted` | Revoke SaaS tier access | 🟠 High |
| `invoice.payment_succeeded` | Log renewal | 🟡 Medium |
| `invoice.payment_failed` | Email creator, grace period | 🟡 Medium |
| `charge.dispute.created` | Flag enrollment for review | 🟡 Medium |
| `payment_intent.payment_failed` | Log failed checkout attempt | 🟢 Low |

---

## Entitlement Table Design

```sql
-- From supabase/schema.sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  stripe_session_id TEXT UNIQUE,         -- For idempotency
  stripe_subscription_id TEXT,           -- For SaaS subscriptions
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entitlement_granted_at TIMESTAMPTZ,    -- When access was unlocked
  entitlement_revoked_at TIMESTAMPTZ,    -- When access was revoked (null = active)
  UNIQUE(user_id, course_id)
);
```

### Entitlement Check (Middleware)

```typescript
// Check if user has access to a lesson
async function hasEntitlement(userId: string, courseId: string): Promise<boolean> {
  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .not('entitlement_granted_at', 'is', null)
    .is('entitlement_revoked_at', null)
    .single();

  return !!data;
}
```

---

## Affiliate / Referral Tracking

### Flow

1. Affiliate shares: `https://teachrepo.com/courses/my-course?ref=alice`
2. On page load, middleware captures `?ref=` and stores in:
   - Cookie: `teachrepo_ref=alice; Max-Age=2592000` (30 days)
   - DB: `affiliate_clicks` row (with hashed IP, referrer)
3. On checkout: `affiliate_ref` is included in Stripe session metadata
4. On webhook: if `affiliate_ref` present, look up affiliate and create `affiliate_conversions` record

### Cookie Middleware

```typescript
// apps/web/middleware.ts

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const ref = request.nextUrl.searchParams.get('ref');
  
  if (ref && /^[a-z0-9_-]{3,32}$/i.test(ref)) {
    // Set affiliate cookie (30 days)
    response.cookies.set('teachrepo_ref', ref, {
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  
  return response;
}
```

---

## SaaS Tier Subscription Flow

For the Creator SaaS plan ($29/mo):

1. Creator signs up → Stripe Checkout in `subscription` mode
2. `checkout.session.completed` → set `users.saas_tier = 'creator'`
3. `customer.subscription.deleted` → revert to free/self-hosted tier
4. Grace period: 7 days after `invoice.payment_failed` before revoking access

---

## Stripe Products to Create

```bash
# Creator SaaS subscription
curl https://api.stripe.com/v1/products \
  -u $STRIPE_SECRET_KEY: \
  -d name="TeachRepo Creator" \
  -d description="Hosted course platform with unlimited courses"

curl https://api.stripe.com/v1/prices \
  -u $STRIPE_SECRET_KEY: \
  -d product=prod_CREATOR \
  -d unit_amount=2900 \
  -d currency=usd \
  -d "recurring[interval]=month"
```

Course prices are created per-course (either by creator via dashboard or via API when creator connects Stripe).

---

## Security Notes

1. **Webhook signature verification** — always verify `stripe-signature` header with `stripe.webhooks.constructEvent`
2. **Service role for entitlement writes** — webhook handler uses `SUPABASE_SERVICE_ROLE_KEY`, never the anon key
3. **Idempotency** — check `stripe_session_id` uniqueness before inserting enrollment
4. **No PCI scope** — no card data ever touches TeachRepo servers (Stripe Checkout handles everything)
5. **Metadata limits** — Stripe metadata values max 500 chars; keep `affiliate_ref` codes short

---

## Environment Variables Required

```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://teachrepo.com
```
