# PlaytestFlow

A lightweight web app for indie tabletop and RPG designers to run repeatable remote playtests. Built with Next.js (App Router), Supabase, and Vercel.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost.3000) with your browser.

## Environment Variables

Create a `.env.local` file with at minimum:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only
```

### Optional: Enable PostHog Analytics

PostHog integration is entirely optional. The app runs fine without these keys. When you add them, events start flowing automatically — no code changes needed.

```env
# Client-side (prefix NEXT_PUBLIC_)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com   # default

# Server-side (no NEXT_PUBLIC_ prefix)
POSTHOG_KEY=phc_xxxxxxxxxxxx
POSTHOG_HOST=https://app.posthog.com               # default
```

## Ops

### Health Check

**`GET /api/health`** — Checks server and database connectivity.

```bash
curl https://playtestflow.vercel.app/api/health
```

Expected response (200 OK):

```json
{
  "ok": true,
  "db_ok": true,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "abc12345",
  "region": "iad1"
}
```

| Field | Description |
|---|---|
| `ok` | Overall health — currently mirrors `db_ok` |
| `db_ok` | Whether Supabase is reachable and queryable |
| `timestamp` | ISO-8601 time of the check |
| `version` | Git commit SHA (8 chars) or `package.json` version |
| `region` | Vercel edge region (`VERCEL_REGION`), or `null` locally |

Response is always **200**; check `ok` and `db_ok` for actual status. `Cache-Control: no-store` is set.

### Analytics Abstraction

Analytics live in `lib/analytics/index.ts`. Two layers:

**Client (`track(event, props)`):**
- No-op until the user accepts IRB consent (stored in `localStorage['irb_consent']`)
- No-op when `NEXT_PUBLIC_POSTHOG_KEY` is absent
- `autocapture` and `disable_session_recording` are `true` — only explicit events fire

**Server (`trackServer(event, props, distinctId?)`):**
- Safe to call from API routes; never includes raw PII
- No-op when `POSTHOG_KEY` is absent
- Uses `posthog-node` with immediate flush

### Instrumented Events

| Event | Layer | Notes |
|---|---|---|
| `waitlist_submitted` | Server | `email_hash` (SHA-256), `role`, UTM fields |
| `cta_click` | Client | `id`, `location`, `path`; consent-gated |
| `consent_accepted` | Client | fires once on checkbox check |

### Privacy Stance

- **Explicit events only** — autocapture disabled
- **Hashed identifiers** — raw emails never leave the API route; SHA-256 hash used as `distinct_id`
- **Consent-gated client events** — client events require `localStorage['irb_consent'] === 'true'`
- **No session recording** by default
- **Free-text excluded** — user-provided text fields never sent to analytics

## Deploy

Push to `main` → Vercel auto-deploys via GitHub integration.

To trigger manually:
```bash
vercel --prod
```
