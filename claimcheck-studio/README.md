# ClaimCheck Studio — Landing Page & Admin

Evidence-backed, channel-ready content for life sciences. This repo contains the landing page, waitlist/lead capture, analytics, and admin dashboard.

## Live

- **Production:** https://citebundle.com (domain propagating)
- **Vercel:** https://claimcheck-studio-3hok1k9fm-limalabs.vercel.app

---

## Running Locally

```bash
# Install deps
npm install

# Copy env (fill in values)
cp .env.example .env.local

# Dev server
npm run dev
# → http://localhost:3000
```

## Required Environment Variables

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never expose to client |
| `ADMIN_SECRET` | Server only | Password for /admin |
| `NEXT_PUBLIC_APP_URL` | Client + Server | e.g. `https://citebundle.com` |

---

## Admin Dashboard

URL: `/admin`

Login with `ADMIN_SECRET`. Three tabs:
- **📊 Metrics** — Today/yesterday views & leads, 7-day trend table, recent 25 leads with UTM/referrer
- **Waitlist** — Manage signups; click ✉️ Invite to send a Supabase magic-link email
- **Users** — View and manage confirmed app users

The invite fix (login links now working): invite emails redirect to `/api/auth/callback?next=/dashboard` which exchanges the OTP code for a session before sending the user to the dashboard.

---

## Supabase Tables

### `cc_waitlist` (existing)
Stores lead/waitlist submissions.

Columns: `id`, `name`, `email`, `company`, `role`, `use_case`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `landing_path`, `referrer`, `ip`, `user_agent`, `status`, `invited_at`, `created_at`

### `cc_page_views` (create if missing)

Run this DDL in Supabase SQL Editor:

```sql
create table if not exists cc_page_views (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  pathname text,
  search text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  user_agent text,
  session_id text,
  ip text
);

-- Optional index for time-range queries
create index if not exists cc_page_views_ts_idx on cc_page_views (ts);
```

---

## Analytics

- `POST /api/analytics/pageview` — Called automatically on page load. Inserts into `cc_page_views`. Fails open (never crashes the page) if table doesn't exist yet.
- `GET /api/admin/metrics` — Requires `x-admin-secret` header. Returns today/yesterday stats, 7-day trend, and recent 25 leads.

---

## SEO / Meta

- OG image: `public/og.png` (1200×630)
- `public/robots.txt` and `public/sitemap.xml` are static files
- Metadata set in `src/app/layout.tsx`

---

## Lead Capture

UTM params, referrer, landing path, and user agent are all captured client-side in `LeadForm.tsx` and sent to `POST /api/lead`.

To add email notifications on new lead (planned for next iteration):
1. Implement `onNewLead(row)` in `src/app/api/lead/route.ts`
2. Use AgentMail or a transactional email provider
3. A hook stub is already in place at the bottom of the POST handler

---

## Next Steps

- [ ] AgentMail integration: send founder notification email on every new lead
- [ ] Daily summary email via Vercel Cron (scheduled task)
- [ ] Add `cc_page_views` table to Supabase (see DDL above)
- [ ] A/B test hero copy variants
- [ ] citebundle.com domain DNS propagation + Vercel domain verify
