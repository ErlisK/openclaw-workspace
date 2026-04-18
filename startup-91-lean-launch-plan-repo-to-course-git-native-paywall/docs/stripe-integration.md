# Stripe Integration Design

**Version:** 1.0 — 2025-04  
**Approach:** Session-based entitlement — no webhook dependency for MVP

---

## 1. Design Goals

| Goal | Decision |
|------|----------|
| **Zero-webhook MVP** | Enrollment created on success_url return via server-side session verification |
| **Idempotent** | Enrollments upserted by `(user_id, course_id)` — returning to success page twice is safe |
| **One product per course** | Stripe product + price created at import time; IDs stored in `courses` table |
| **Affiliate attribution** | `?ref=` cookie captured before checkout; affiliate_id embedded in Checkout Session metadata |
| **Webhook as reliability layer** | Optional `checkout.session.completed` webhook handles edge cases (tab closed before return) — added after MVP ships |
| **Free courses** | Skip Stripe entirely — enrollment created directly on course page |

---

## 2. Data Model Changes

The `courses` table stores Stripe IDs from the products/prices step:

```sql
courses.stripe_product_id  text   -- Stripe product ID (prod_xxx)
courses.stripe_price_id    text   -- Stripe price ID (price_xxx), one per course
```

The `purchases` table records Stripe Checkout Session details:

```sql
purchases:
  id                uuid
  user_id           uuid  → auth.users
  course_id         uuid  → courses
  stripe_session_id text  unique  -- Checkout Session ID (cs_xxx)
  stripe_payment_id text          -- PaymentIntent / SetupIntent ID
  amount_cents      int
  currency          text
  status            text  -- pending | completed | refunded
  affiliate_id      uuid  → affiliates (nullable)
  created_at        timestamptz
  completed_at      timestamptz
```

Enrollment is created from the `purchases` row — either:
- **Synchronously** on success_url return (primary path)
- **Asynchronously** via `checkout.session.completed` webhook (fallback)

---

## 3. Stripe Product/Price Creation

Run once at **course import time** (or first publish):

```
POST /api/checkout/create-product
Body: { courseId }

1. Fetch course from Supabase (title, description, price_cents, currency)
2. stripe.products.create({ name, description, metadata: { course_id } })
3. stripe.prices.create({ product, unit_amount: price_cents, currency })
4. UPDATE courses SET stripe_product_id, stripe_price_id WHERE id = courseId
5. Return { stripe_product_id, stripe_price_id }
```

This is idempotent: if `stripe_price_id` already exists on the course, skip creation.

---

## 4. Checkout Session Flow

### 4.1 Session Creation — `POST /api/checkout`

```
Input: { courseId }
Auth: Supabase session required

1. Fetch course: { slug, title, price_cents, currency, stripe_price_id }
2. If price_cents === 0 → error "free course, use /api/enroll directly"
3. If no stripe_price_id → call create-product first (lazy init)
4. Check for existing completed enrollment → return 409 "already enrolled"
5. Read affiliate_id from cookie (set by middleware on ?ref= visits)
6. stripe.checkout.sessions.create({
     mode: 'payment',
     line_items: [{ price: stripe_price_id, quantity: 1 }],
     success_url: `${APP_URL}/courses/{slug}/enroll?session_id={CHECKOUT_SESSION_ID}`,
     cancel_url:  `${APP_URL}/courses/{slug}?checkout=cancelled`,
     client_reference_id: user.id,           ← ties session to Supabase user
     customer_email: user.email,             ← pre-fill Stripe checkout email
     metadata: {
       course_id:    courseId,
       user_id:      user.id,
       affiliate_id: affiliateId ?? '',
     },
     expires_at: Math.floor(Date.now() / 1000) + 1800,   ← 30 min expiry
   })
7. INSERT purchases { user_id, course_id, stripe_session_id, status: 'pending' }
8. Return { url: session.url }   ← redirect client to Stripe Hosted Checkout
```

### 4.2 Client-side Redirect

```tsx
// CheckoutButton component
const { url } = await fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify({ courseId }),
}).then(r => r.json());

window.location.href = url;   // → stripe.com checkout page
```

### 4.3 Session Verification on Return — `GET /api/enroll?session_id=cs_xxx`

The `success_url` is:
```
https://teachrepo.com/courses/{slug}/enroll?session_id={CHECKOUT_SESSION_ID}
```

When Stripe redirects back after payment:

```
1. Page Server Component calls GET /api/enroll?session_id=cs_xxx
   (or the page itself does the verification as a Server Action)

2. stripe.checkout.sessions.retrieve(session_id, {
     expand: ['line_items', 'payment_intent'],
   })

3. Validate:
   a. session.payment_status === 'paid'
   b. session.client_reference_id === user.id  ← prevents session_id spoofing
   c. session.metadata.course_id matches courseId in URL path
   d. session.metadata.user_id === user.id     ← double-check

4. If valid:
   a. UPDATE purchases SET status='completed', stripe_payment_id, completed_at=now()
      WHERE stripe_session_id = session_id AND user_id = user.id
      (idempotent — safe to call twice)

   b. INSERT enrollments { user_id, course_id, purchase_id }
      ON CONFLICT (user_id, course_id) DO NOTHING
      (idempotent — already enrolled stays enrolled)

   c. If metadata.affiliate_id != '':
      INSERT affiliate_conversions or UPDATE affiliates stats

   d. Track analytics event: checkout_completed

5. Return: enrolled=true, courseSlug, firstLessonSlug

6. Page renders: "You're enrolled! Start learning →"
```

### 4.4 Security Properties

| Threat | Mitigation |
|--------|-----------|
| User crafts a fake session_id | `stripe.checkout.sessions.retrieve()` verifies with Stripe directly |
| User replays another user's session_id | `client_reference_id === user.id` check; mismatches return 403 |
| User accesses before payment | `payment_status === 'paid'` check |
| Double-enrollment (user hits return page twice) | Enrollment upsert with `ON CONFLICT DO NOTHING` |
| Double-purchase charge | Stripe deduplication via `idempotency_key`; existing enrollment check before session creation |
| Session expiry (user abandons for 30+ min) | `expires_at` on session; Stripe rejects expired sessions automatically |

---

## 5. Free Course Enrollment

No Stripe involved:

```
POST /api/enroll/free
Body: { courseId }
Auth: required

1. Fetch course, verify pricing_model === 'free'
2. INSERT enrollments { user_id, course_id }
   ON CONFLICT DO NOTHING
3. Return { enrolled: true }
```

---

## 6. Webhook — Optional Reliability Layer

Add `POST /api/webhooks/stripe` after MVP ships to handle:

- User closes tab before `success_url` redirect completes
- Network error on return journey
- Subscription renewal (for future subscription-model courses)

```
checkout.session.completed:
  1. Verify stripe-signature header
  2. Re-run steps 4.3.4a–4.3.4c (same idempotent logic)

charge.refunded / payment_intent.canceled:
  1. UPDATE purchases SET status='refunded'
  2. DELETE enrollments WHERE purchase_id = ...
     (or soft-delete: SET revoked_at = now())
```

The webhook is optional because the success_url path already handles the happy path. The webhook only catches the edge cases.

---

## 7. Stripe Product Lifecycle

```
Course created/imported
    │
    ▼
stripe.products.create({ name: course.title })
stripe.prices.create({ unit_amount: price_cents })
    │
    ▼
courses.stripe_product_id = prod_xxx
courses.stripe_price_id   = price_xxx

Course price changes:
    ├── stripe.prices.create({ new amount })      ← new price ID
    ├── stripe.prices.update(old, { active: false }) ← archive old
    └── courses.stripe_price_id = new_price_xxx

Course archived:
    └── stripe.products.update(id, { active: false })
```

---

## 8. Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=sk_live_...       # Server-side only — NEVER exposed to browser
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Client-safe

# Required for success_url construction
NEXT_PUBLIC_APP_URL=https://teachrepo.com

# Required for webhook verification (add after webhook is enabled)
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 9. Implementation Checklist

- [x] `lib/stripe/client.ts` — Stripe SDK singleton
- [x] `lib/stripe/product.ts` — `createCourseProduct()`, `ensureCoursePrice()`
- [x] `app/api/checkout/route.ts` — `POST /api/checkout`
- [x] `app/api/enroll/route.ts` — `GET /api/enroll?session_id=`  
- [x] `app/api/enroll/free/route.ts` — `POST /api/enroll/free`
- [x] `app/courses/[slug]/enroll/page.tsx` — success return page
- [x] `components/checkout/CheckoutButton.tsx` — client component
- [x] `app/api/webhooks/stripe/route.ts` — webhook stub (ready for production)
- [ ] Stripe products created for test courses (run via CLI or dashboard)
- [ ] `STRIPE_SECRET_KEY` set as Vercel env var
- [ ] `STRIPE_WEBHOOK_SECRET` set after webhook endpoint registered in Stripe dashboard
