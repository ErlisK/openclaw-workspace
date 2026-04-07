# Analytics.md — PlaytestFlow Analytics Guide

## Overview

PlaytestFlow uses two analytics systems:
1. **PostHog** (product analytics — event tracking, funnels, session replay)
2. **Vercel Analytics** (web vitals, traffic) + internal Supabase event logs

## PostHog

- **Dashboard**: https://us.posthog.com/project/372731
- **Project**: PlaytestFlow (Default project)
- **Host**: `https://us.i.posthog.com`
- **Env var**: `NEXT_PUBLIC_POSTHOG_KEY`

### Events Tracked

| Event | When | Properties |
|-------|------|------------|
| `$pageview` | Every page load (automatic) | URL, referrer |
| `$pageleave` | When user leaves (automatic) | — |
| `waitlist_submit` | Waitlist form successfully submitted | `email_domain`, `source_path`, `utm_*` |
| `pricing_click` | Pricing plan CTA clicked | `plan` (starter/pro/studio), `source_path` |
| `consent_checked` | IRB-lite consent checkbox toggled | `checked` (bool), `source_path` |

### User Identification
After `waitlist_submit`, PostHog `identify()` is called with the user's email so future events are tied to that person.

### Disabling Analytics in Dev
Set `NEXT_PUBLIC_POSTHOG_KEY` to empty string or unset it. All PostHog calls are guarded by:
```ts
if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
```
The app works fully without the key configured.

## Internal Supabase Event Logs

- Page views → `page_views` table (via `/api/track`)
- Pricing clicks → `pricing_clicks` table (via `/api/pricing-click`)
- Waitlist signups → `waitlist` table (via `/api/waitlist`)

## Health Check

**Endpoint**: `GET /api/healthz`

Returns:
```json
{
  "ok": true,
  "supabase": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

`supabase` will be `"fail"` if the database connection is down.

## Troubleshooting

- **Events not appearing in PostHog**: Check browser console for errors. Verify `NEXT_PUBLIC_POSTHOG_KEY` is set in Vercel env.
- **Supabase health failing**: Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel.
- **No client secrets**: Only `NEXT_PUBLIC_*` PostHog keys are sent to the browser. No server-side PostHog key is used.
