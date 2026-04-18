# @teachrepo/web

The TeachRepo web application — built with Next.js 14 (App Router, TypeScript).

## Pages / Routes

| Route | Description |
|-------|-------------|
| `/` | Marketing homepage |
| `/dashboard` | Creator dashboard — list of courses |
| `/dashboard/new` | Create a new course from a GitHub repo |
| `/courses/[slug]` | Public course landing page |
| `/courses/[slug]/learn/[lesson]` | Gated lesson viewer |
| `/courses/[slug]/checkout` | Stripe Checkout redirect |
| `/api/webhooks/stripe` | Stripe webhook handler |
| `/api/courses` | Course CRUD API |
| `/api/ai/generate-quiz` | AI quiz generation endpoint |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://teachrepo.com
```
