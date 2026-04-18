# GigAnalytics — Technical Constraints & Architecture Decisions
## Stack: Next.js · Vercel · Supabase · PostHog · Stripe

**Document type:** Architecture Decision Record (ADR) + Constraint Log  
**Date:** April 2026  
**Status:** Decided — governs all Ideate and Prototype phases  

---

## Decision Summary

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 14+ (App Router, TypeScript) | SSR for fast first paint; API Routes for server-side secrets; RSC for analytics rendering without client bundle bloat |
| **Deployment** | Vercel | Pre-linked project; zero-config deploys; Edge Functions for sub-50ms CSV parsing; free Vercel AI Gateway for LLM recommendations |
| **Database** | Supabase (Postgres + Auth + RLS) | Row-Level Security enforces per-user data isolation at DB layer; real-time subscriptions for live timer sync; pgcrypto for benchmark anonymization |
| **Product Analytics** | PostHog (primary) | Self-hostable if privacy requirements tighten; event-level funnels needed for activation measurement |
| **Page Analytics** | Plausible (secondary) | Cookie-free; GDPR-compliant by default; shows acquisition channels without cookie consent banner |
| **Payments** | Stripe Checkout (Pro tier) | Pre-built checkout; webhook handling already templated; no PCI scope for GigAnalytics |
| **AI Recommendations** | Vercel AI Gateway → Claude Haiku | Zero-config at Vercel runtime; used for recommendation text generation only; no data leaves Vercel trust boundary |

---

## ADR-001: Next.js App Router over Pages Router

### Context
GigAnalytics needs: (1) fast initial load for dashboard, (2) server-side CSV parsing without exposing API keys, (3) streaming UI for large imports, (4) SSE/WebSocket for live timer sync.

### Decision
Use **Next.js 14+ App Router** with TypeScript throughout.

### Rationale
- **React Server Components** render the dashboard analytics server-side → no client bundle bloat for chart/calculation code
- **Route Handlers** (`app/api/`) handle CSV upload, Supabase writes, and Stripe webhooks server-side → secrets never reach the browser
- **Streaming** (`loading.tsx`, Suspense boundaries) → skeleton UI while heavy CSV is parsed; perceived performance matches fast products
- **Server Actions** for form submissions (time entry, ad spend input) → no API endpoint required for simple mutations
- **Middleware** for auth redirect → unauthenticated users redirected before page renders (no flash of protected content)

### Constraints Imposed
- All LLM calls must be in Route Handlers or Server Actions (never `use client` components)
- Supabase `createServerClient` used in Server Components; `createBrowserClient` in Client Components only
- `use server` directive required on all Server Actions that write to DB

### Rejected Alternatives
- **Pages Router**: lacks RSC; API Routes have less flexibility; `getServerSideProps` is more verbose than the equivalent RSC pattern
- **Remix**: smaller ecosystem; less Vercel-native; fewer community examples for Supabase + Stripe
- **SvelteKit**: excellent DX but smaller contractor pool if team grows; fewer LLM AI SDK integrations

---

## ADR-002: Vercel Deployment

### Context
Project is pre-configured with Vercel project `prj_UidGMPYTb7bu04gAhBaShyuGLSz1` on team `limalabs`. Deploy command: `vercel --prod --token $VERCEL_TOKEN --scope limalabs --yes`.

### Decision
**Vercel** is the sole deployment target. No Docker, no Railway, no self-hosted infra.

### Rationale
- **Pre-linked**: `.vercel/project.json` already written; zero re-configuration cost
- **Vercel AI Gateway**: free LLM access via `VERCEL_OIDC_TOKEN` auto-injected at runtime — the recommendation engine is zero-cost
- **Edge Functions**: CSV column detection can run at the edge with sub-50ms latency before heavy parsing begins
- **Preview deployments**: every PR gets a preview URL; useful for testing CSV parser edge cases against real Stripe/PayPal CSVs without touching production data
- **Environment variables**: managed in Vercel dashboard; no `.env` committed to repo

### Constraints Imposed
```
✅ Always deploy with: vercel --prod --token $VERCEL_TOKEN --scope limalabs --yes
❌ Never run: vercel login / vercel logout / vercel link
❌ Never modify: .vercel/project.json
✅ Environment variables set via: vercel env add <KEY>
✅ Preview URL format: https://openclaw-workspace-git-<branch>.vercel.app
```

### Environment Variables Required (pre-deploy checklist)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # Server-side only, never NEXT_PUBLIC_

# Stripe
STRIPE_SECRET_KEY                  # Server-side only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY # Safe to expose
STRIPE_WEBHOOK_SECRET              # For webhook signature verification

# App
NEXT_PUBLIC_APP_URL                # https://giganalytics.app (or preview URL)

# Analytics
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST           # https://app.posthog.com or self-hosted
NEXT_PUBLIC_PLAUSIBLE_DOMAIN       # giganalytics.app

# AI Gateway: no env var needed — VERCEL_OIDC_TOKEN is auto-injected
```

---

## ADR-003: Supabase — Postgres + Auth + RLS

### Context
GigAnalytics stores sensitive financial data (income transactions) and personal time tracking data. Multi-tenancy (one DB, many users) requires hard data isolation guarantees. Traditional auth (JWTs in middleware) can have implementation bugs; we need the DB itself to enforce isolation.

### Decision
**Supabase** with **Row-Level Security (RLS)** enabled on all tables containing user data.

### Rationale
- **RLS at Postgres layer**: data isolation is enforced even if application code has bugs. A bug in a Route Handler cannot leak User A's transactions to User B because the DB itself rejects the query.
- **Supabase Auth**: handles email/password + Google OAuth out of the box; JWT issued by Supabase; `auth.uid()` available in RLS policies
- **Real-time subscriptions**: timer state sync across devices (user starts timer on desktop, sees it on mobile) via `supabase.channel().on('postgres_changes')`
- **pgcrypto**: anonymized benchmark data can be hashed at DB level before storage; no application-layer anonymization needed
- **Built-in storage**: CSV files uploaded for import can be stored in Supabase Storage (S3-compatible) with per-user access control before being processed

### Database Schema

```sql
-- Users (managed by Supabase Auth — auth.users)
-- No additional users table needed for MVP; profile stored in user_metadata

-- Income Streams
CREATE TABLE streams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  platform    TEXT NOT NULL, -- 'stripe' | 'paypal' | 'upwork' | 'manual' | ...
  color       TEXT,          -- hex color for UI
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id             UUID REFERENCES streams(id) ON DELETE SET NULL,
  platform              TEXT NOT NULL,
  platform_tx_id        TEXT,          -- for deduplication
  transaction_date      TIMESTAMPTZ NOT NULL,
  available_date        TIMESTAMPTZ,
  gross_amount          NUMERIC(12,2) NOT NULL,
  platform_fee          NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount            NUMERIC(12,2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  description           TEXT,
  client_identifier     TEXT,          -- email or name from source CSV
  status                TEXT NOT NULL DEFAULT 'cleared', -- cleared | pending
  category              TEXT NOT NULL DEFAULT 'income',  -- income | refund | payout | fee
  raw_data              JSONB,         -- original CSV row preserved
  import_batch_id       UUID,          -- groups transactions from same CSV upload
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform, platform_tx_id) -- dedup constraint
);

-- Time Entries
CREATE TABLE time_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id         UUID REFERENCES streams(id) ON DELETE SET NULL,
  source            TEXT NOT NULL DEFAULT 'timer', -- timer | manual | calendar | toggl_import
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ,       -- NULL if timer is currently running
  duration_minutes  INTEGER,           -- computed on stop; NULL if running
  entry_type        TEXT NOT NULL DEFAULT 'billable', -- billable | proposal | revision | admin | learning | other
  is_billable       BOOLEAN NOT NULL DEFAULT true,
  description       TEXT,
  calendar_event_id TEXT,              -- Google Calendar event ID if source=calendar
  toggl_entry_id    TEXT,              -- Toggl entry ID if source=toggl_import
  confirmed         BOOLEAN DEFAULT true, -- false = proposed, awaiting user confirmation
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Ad Spend Entries
CREATE TABLE ad_spend (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id   UUID REFERENCES streams(id) ON DELETE SET NULL,
  channel     TEXT NOT NULL,       -- 'linkedin' | 'google' | 'facebook' | 'upwork_connects' | 'other'
  amount      NUMERIC(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Import Batches (for tracking upload history)
CREATE TABLE import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  filename        TEXT,
  row_count       INTEGER,
  duplicate_count INTEGER,
  date_range_start DATE,
  date_range_end   DATE,
  status          TEXT DEFAULT 'complete', -- processing | complete | failed
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Benchmark Opt-In (anonymized data for benchmarking)
CREATE TABLE benchmark_contributions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NOTE: no user_id stored — this is intentionally unlinked for privacy
  service_category    TEXT NOT NULL,
  experience_bucket   TEXT NOT NULL, -- '0-2' | '3-5' | '6-10' | '10+'
  region              TEXT NOT NULL, -- 'US-West' | 'US-East' | 'Europe' | etc.
  primary_platform    TEXT NOT NULL,
  effective_rate_bucket TEXT NOT NULL, -- '$50-75' | '$75-100' | ... — never exact value
  contributed_at      TIMESTAMPTZ DEFAULT now()
  -- No link back to users table
);
```

### RLS Policies

```sql
-- Enable RLS on all user-data tables
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- Policy template (same pattern for all tables):
CREATE POLICY "Users can only access their own data"
  ON streams FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- benchmark_contributions has no user_id — no RLS needed, but write-only from server:
-- Service role can INSERT; anon can only SELECT aggregates (view, not table)
```

### Indexes for Performance

```sql
-- Critical for dashboard load (user's transactions in date range)
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_stream ON transactions(stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, start_time DESC);
CREATE INDEX idx_time_entries_stream ON time_entries(stream_id) WHERE stream_id IS NOT NULL;

-- For deduplication check on import
CREATE INDEX idx_transactions_dedup ON transactions(user_id, platform, platform_tx_id);
```

### Rejected Alternatives
- **PlanetScale (MySQL)**: No RLS; no `auth.uid()` integration; enum workarounds for JSON columns
- **Firebase Firestore**: Security rules more complex than Postgres RLS; no relational aggregations; pricing unpredictable at scale
- **Neon**: Excellent Postgres but no built-in auth or storage; more assembly required
- **Self-hosted Postgres**: Operational overhead not appropriate for a 0→1 product

---

## ADR-004: PostHog for Product Analytics

### Context
GigAnalytics needs activation funnel data (where do users drop off in the 10-minute onboarding?) and feature adoption metrics (who uses the timer vs. calendar inference? what % opt into benchmarking?). A tool that shows these funnels without requiring manual SQL is essential for iteration.

### Decision
**PostHog** as the primary product analytics tool.

### Rationale
- **Funnels**: "Signup → CSV Upload → Time Entry → First $/hr view" is the core activation funnel; PostHog renders this as a visual funnel with step-level drop-off rates
- **Session recording**: anonymous playback of where users get stuck in CSV import (no PII captured)
- **Feature flags**: can roll out A/B pricing analyzer to 20% of users before full launch
- **Self-hostable**: if benchmark data privacy requirements tighten, PostHog can move to self-hosted with no SDK changes
- **Generous free tier**: 1M events/month free; well within MVP range

### Key Events to Track
```typescript
// Activation funnel
posthog.capture('signup_completed', { method: 'email' | 'google' })
posthog.capture('csv_upload_started', { platform: 'stripe' | 'paypal' | 'upwork' })
posthog.capture('csv_upload_completed', { platform, row_count, stream_count })
posthog.capture('csv_upload_failed', { platform, error_type })
posthog.capture('time_entry_created', { source: 'timer' | 'manual' | 'calendar', entry_type })
posthog.capture('dashboard_first_view', { streams_count, has_time_data: boolean })

// Core feature usage
posthog.capture('timer_started', { stream_id_hashed })
posthog.capture('timer_stopped', { duration_minutes })
posthog.capture('calendar_connected')
posthog.capture('calendar_events_proposed', { count })
posthog.capture('calendar_events_confirmed', { count, pct_confirmed })
posthog.capture('benchmark_opted_in')
posthog.capture('benchmark_opted_out')
posthog.capture('upgrade_clicked', { source: 'feature_gate' | 'pricing_page' })
posthog.capture('pro_subscribed', { plan: 'monthly' | 'annual' })

// Engagement
posthog.capture('recommendation_viewed', { type: 'stream_comparison' | 'rate_increase' })
posthog.capture('tax_export_downloaded')
posthog.capture('income_goal_set')
```

### Implementation
```typescript
// app/providers.tsx (Client Component)
'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

export function Providers({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false,       // manual pageview capture
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true,         // never capture financial inputs
        maskTextSelector: '[data-sensitive]', // mask $ amounts
      },
      persistence: 'localStorage+cookie',
    })
  }
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
```

---

## ADR-005: Plausible for Page Analytics

### Context
PostHog is for product/funnel analytics. We also need acquisition analytics: what channels drive signups? What landing pages convert? This requires a lightweight, cookie-free tool that works without a consent banner.

### Decision
**Plausible** as secondary, page-level analytics.

### Rationale
- **Cookie-free**: no consent banner required in EU/UK
- **GDPR-compliant by default**: no IP storage; no cross-site tracking
- **Acquisition sources**: shows which UTM sources convert to signups
- **Goals/Conversions**: `plausible('Signup')`, `plausible('CSV Uploaded')` → lightweight conversion events without full event schema
- **~$9/month**: trivial cost; worth it for clean marketing attribution data separate from product analytics

### Key Plausible Goals
```
Signup
CSV Upload Started
Pro Plan Clicked
Benchmark Opted In
```

---

## ADR-006: Stripe Checkout for Pro Tier

### Context
GigAnalytics has a free tier (core $/hr calculation, 1 stream, 90-day history) and a Pro tier (unlimited streams, calendar integration, tax export, benchmark access, A/B pricing). Revenue model: $9/month or $79/year.

### Decision
**Stripe Checkout** with pre-built payment route templates. No custom payment form.

### Pricing Structure
```
Free:
  - 1 income stream
  - Manual time entry only (no timer persistence across devices)
  - 90-day transaction history
  - Basic $/hr for one stream
  - CSV import: Stripe only

Pro ($9/month or $79/year — 27% savings):
  - Unlimited income streams
  - One-tap timer with cross-device sync
  - Google Calendar integration
  - Full history (unlimited)
  - Cross-stream comparison + recommendations
  - Tax export (CPA-ready CSV)
  - Benchmark access (if opted in)
  - Stripe + PayPal + Upwork + Gumroad CSV import
  - Ad spend ROI calculator
```

### Implementation
```typescript
// Using pre-built templates from /opt/scide/templates/payments/

// Products to create via Stripe API:
// 1. GigAnalytics Pro Monthly — $9.00/month
// 2. GigAnalytics Pro Annual — $79.00/year

// Checkout session creation: app/api/checkout/route.ts (from template)
// Webhook handling: app/api/webhooks/route.ts (from template)
//   - customer.subscription.created → set user.plan = 'pro' in Supabase
//   - customer.subscription.deleted → set user.plan = 'free'
//   - invoice.payment_failed → notify user

// Customer portal: app/api/customer-portal/route.ts (from template)
//   → users can cancel, upgrade, download invoices without contacting support
```

### Feature Gating in Code
```typescript
// lib/plan.ts
export async function getUserPlan(userId: string): Promise<'free' | 'pro'> {
  const { data } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', userId)
    .single()
  return data?.plan ?? 'free'
}

// In Server Components:
const plan = await getUserPlan(userId)
if (plan === 'free') {
  return <UpgradePrompt feature="cross-stream comparison" />
}
```

### Free Tier Limitations as Conversion Hooks
```
When free user tries to:
  → Add 2nd stream: "Upgrade to Pro to track unlimited income sources"
  → Connect calendar: "Calendar inference requires Pro"
  → Download tax export: "Tax export is a Pro feature — upgrade before tax season"
  → View cross-stream comparison: blur/lock the comparison view with upgrade CTA
```

---

## ADR-007: Vercel AI Gateway for Recommendation Text

### Context
The ROI engine produces numbers. The product's value comes from translating those numbers into actionable recommendations in plain English. An LLM is the right tool for this; it's zero-cost via the Vercel AI Gateway.

### Decision
Use **Vercel AI Gateway** → **Claude Haiku** for recommendation text generation. Rule-based fallback if LLM is unavailable.

### Usage Pattern
```typescript
// app/api/recommendations/route.ts
import { createGateway } from '@ai-sdk/gateway'
import { generateText } from 'ai'

const gateway = createGateway()

export async function POST(req: Request) {
  const { streamROIData } = await req.json()
  
  // Build structured prompt — no raw user data sent to LLM
  const prompt = buildRecommendationPrompt(streamROIData)
  
  const { text } = await generateText({
    model: gateway('anthropic/claude-haiku-4-5'), // cheap + fast for short text
    prompt,
    maxTokens: 200, // recommendations are short
  })
  
  return Response.json({ recommendation: text })
}

function buildRecommendationPrompt(data: StreamROIData[]): string {
  // Convert numbers to prompt — no PII, no raw CSV data
  const sorted = [...data].sort((a, b) => b.effective_hourly_rate - a.effective_hourly_rate)
  return `
    A freelancer has ${data.length} income streams with these effective hourly rates:
    ${sorted.map(s => `${s.name}: $${s.effective_hourly_rate}/hr (${s.total_hours}h this month)`).join('\n')}
    
    Write a 2-sentence actionable recommendation comparing the highest and lowest earners.
    Be specific with numbers. Do not be generic. Do not use filler phrases.
    Example: "Coaching earns 2.9× more per hour than Upwork. Shifting 5 hours from Upwork proposals to securing one more coaching client could add $655/month."
  `
}
```

### Rule-Based Fallback
```typescript
// lib/recommendations.ts — deterministic fallback if AI call fails
export function getRuleBasedRecommendation(streams: StreamROI[]): string {
  const sorted = [...streams].sort((a, b) => b.effective_hourly_rate - a.effective_hourly_rate)
  if (sorted.length < 2) return null
  
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]
  const multiplier = (top.effective_hourly_rate / bottom.effective_hourly_rate).toFixed(1)
  
  return `${top.name} earns ${multiplier}× more per hour than ${bottom.name}. ` +
    `Consider whether time spent on ${bottom.name} could shift toward ${top.name}.`
}
```

---

## Constraint Log: What Is Out of Scope

| Constraint | Rationale |
|-----------|-----------|
| **No native mobile app (MVP)** | PWA with responsive design + mobile-optimized timer; native app is post-revenue |
| **No real-time Upwork/Stripe API OAuth (MVP)** | API integrations require review processes; CSV import ships first, API second |
| **No automatic bank transaction sync (MVP)** | Plaid/MX integration is complex and expensive; not needed for core $/hr calculation |
| **No team/agency features** | Primary segment is individual freelancers; team billing is a Series A problem |
| **No white-label or API access** | Post-revenue feature; adds security surface area |
| **No iOS/Android push notifications** | PWA push sufficient for MVP; native app needed for reliable push |
| **No self-hosted option (MVP)** | Increases ops burden; offer for privacy-conscious power users post-revenue |
| **No Zapier/n8n webhooks (MVP)** | Post-MVP integration layer; not blocking core value |

---

## Dependency Versions (Lock at Start)

```json
{
  "next": "14.2.x",
  "react": "18.x",
  "typescript": "5.x",
  "@supabase/supabase-js": "2.x",
  "@supabase/ssr": "0.x",
  "stripe": "14.x",
  "posthog-js": "1.x",
  "ai": "3.x",
  "@ai-sdk/gateway": "0.x",
  "zod": "3.x",
  "tailwindcss": "3.x",
  "@radix-ui/react-*": "latest compatible",
  "recharts": "2.x",
  "papaparse": "5.x",
  "date-fns": "3.x"
}
```

### Key Library Rationale
- **papaparse**: Battle-tested CSV parser; handles quoting edge cases in Stripe/PayPal CSVs; 5MB for complete parsing in browser
- **recharts**: React-native chart library; Composable; no Canvas dependency; accessible SVG output
- **date-fns**: Tree-shakeable; handles timezone edge cases (PayPal PST/PDT normalization)
- **zod**: Runtime validation of CSV rows after parsing; prevents bad data reaching DB
- **@radix-ui**: Accessible primitives for timer controls, dialogs, dropdowns; no style lock-in

---

## Acceptance Criteria for This Document

```
AC: Tech stack document committed to /docs/define
AC: All ADRs include rationale and rejected alternatives
AC: Database schema includes RLS policies for all user-data tables
AC: Environment variables listed with security classification (NEXT_PUBLIC_ vs server-only)
AC: Feature gate pattern defined (getUserPlan → free/pro)
AC: Stripe pricing structure decided ($9/month, $79/year)
AC: PostHog events defined for full activation funnel
AC: Out-of-scope constraints explicitly listed to prevent scope creep
AC: Dependency versions pinned with rationale
```

---

*This document is the authoritative constraints reference for all Ideate → Prototype work. Deviations from these decisions require a new ADR entry and a doc update.*
