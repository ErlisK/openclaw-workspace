# Payment Integration Setup

Pre-built Stripe payment templates for Next.js App Router.

## Quick Start

### 1. Install Stripe SDK

```bash
npm install stripe
```

### 2. Copy Templates Into Your Project

```bash
# Core library
cp lib/stripe.ts ./lib/stripe.ts

# API routes
cp -r app/api/checkout ./app/api/checkout/
cp -r app/api/webhooks ./app/api/webhooks/
cp -r app/api/customer-portal ./app/api/customer-portal/

# UI components
cp components/PricingTable.tsx ./components/PricingTable.tsx
cp components/CheckoutButton.tsx ./components/CheckoutButton.tsx
```

### 3. Set Environment Variables

Set these in your Vercel project:

```bash
vercel env add STRIPE_SECRET_KEY        # sk_test_... or sk_live_...
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # pk_test_... or pk_live_...
vercel env add STRIPE_WEBHOOK_SECRET    # whsec_... (from Stripe webhook config)
vercel env add NEXT_PUBLIC_APP_URL      # https://yourdomain.com
```

### 4. Create Stripe Products and Prices

```bash
# Create a product
curl https://api.stripe.com/v1/products \
  -u $STRIPE_SECRET_KEY: \
  -d name="Pro Plan" \
  -d description="Full access to all features"

# Create a monthly price (amount in cents)
curl https://api.stripe.com/v1/prices \
  -u $STRIPE_SECRET_KEY: \
  -d product=prod_XXXXX \
  -d unit_amount=2900 \
  -d currency=usd \
  -d "recurring[interval]"=month

# Create a one-time price
curl https://api.stripe.com/v1/prices \
  -u $STRIPE_SECRET_KEY: \
  -d product=prod_XXXXX \
  -d unit_amount=9900 \
  -d currency=usd
```

### 5. Use the PricingTable Component

```tsx
import { PricingTable } from "@/components/PricingTable";

const plans = [
  {
    name: "Starter",
    price: "$0",
    interval: "month",
    description: "For individuals getting started",
    features: ["Up to 100 items", "Basic analytics", "Email support"],
    priceId: "price_free",  // No checkout for free tier
    mode: "subscription" as const,
  },
  {
    name: "Pro",
    price: "$29",
    interval: "month",
    description: "For growing teams",
    features: ["Unlimited items", "Advanced analytics", "Priority support", "API access"],
    priceId: "price_XXXXX",  // Replace with actual Stripe price ID
    mode: "subscription" as const,
    popular: true,
  },
];

export default function PricingPage() {
  return <PricingTable plans={plans} title="Pricing" subtitle="Choose your plan" />;
}
```

### 6. Register Webhook Endpoint

In the Stripe Dashboard (or via CLI):

```bash
# Using Stripe CLI for local testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# For production: Add https://yourdomain.com/api/webhooks/stripe
# in Stripe Dashboard > Developers > Webhooks
```

Events to subscribe to:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## Common Patterns

### Subscription SaaS
Use `mode: "subscription"` with recurring prices. Handle subscription lifecycle in the webhook handler.

### One-Time Purchase
Use `mode: "payment"` with one-time prices. Handle `checkout.session.completed` to deliver the product.

### Freemium
Don't trigger checkout for the free tier. Only call `/api/checkout` for paid plans.

## Template Files

| File | Purpose |
|------|---------|
| `lib/stripe.ts` | Server-side Stripe client initialization |
| `app/api/checkout/route.ts` | Creates Stripe Checkout sessions |
| `app/api/webhooks/stripe/route.ts` | Handles Stripe webhook events |
| `app/api/customer-portal/route.ts` | Redirects to Stripe customer portal |
| `components/PricingTable.tsx` | Responsive pricing cards with checkout |
| `components/CheckoutButton.tsx` | Standalone checkout trigger button |
