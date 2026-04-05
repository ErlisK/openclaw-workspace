# Change Risk Radar

**Know before vendor changes break your business.**

A SaaS that watches the tools your company depends on—Stripe, Shopify, AWS, Google Workspace, Salesforce, Okta, and 25+ more—alerting you in plain English when a change creates operational, legal, pricing, or security risk.

## What We Monitor

- **Changelog scraping** — daily scrape of 30+ vendor release notes and changelogs
- **Pricing page diffs** — snapshot + diff of pricing pages to detect fee changes
- **ToS/Legal diffs** — daily snapshot of Terms of Service, Privacy Policy, DPA pages
- **API docs diffs** — monitor for endpoint deprecations, new auth requirements

## Project Structure

```
apps/change-risk-radar/          # Next.js app
  src/
    app/
      page.tsx                   # Landing page + waitlist
      hypothesis/page.tsx        # ICP + problem + value hypothesis grid
      taxonomy/page.tsx          # Risk taxonomy v0 (35 event types)
      observatory/page.tsx       # Live change observatory
      api/
        waitlist/route.ts        # Waitlist signups → Supabase
        deposit/route.ts         # Stripe checkout for $50 deposit
        observatory/collect/     # Cron-triggered collection engine
    lib/
      scraper.ts                 # Vendor changelog scrapers
      observatory.ts             # Snapshot + diff engine
      taxonomy.ts                # Risk event type definitions
      hypothesis.ts              # ICP + problem hypothesis data
docs/
  hypothesis-grid.md             # Hypothesis grid (markdown)
  risk-taxonomy-v0.md            # Risk taxonomy (markdown)
```

## Database (Supabase)

Tables:
- `crr_waitlist` — email signups
- `crr_deposits` — refundable deposit intents
- `crr_vendors` — monitored vendor catalog
- `crr_diffs` — detected changes with risk classification
- `crr_snapshots` — raw page snapshots for diff computation

## Deployment

Deployed on Vercel with cron job running every 6 hours to collect vendor diffs.

## Phase 1 Goals

- [ ] ≥300 unique diffs across ≥25 vendors in 2 weeks
- [ ] ≥50 waitlist signups
- [ ] ≥10 refundable deposits
- [ ] ≥150 weekly unique visitors

## Hypothesis Grid

See [docs/hypothesis-grid.md](docs/hypothesis-grid.md) or visit `/hypothesis` in-app.

## Risk Taxonomy

35 concrete event types across 5 categories. See [docs/risk-taxonomy-v0.md](docs/risk-taxonomy-v0.md) or visit `/taxonomy` in-app.

## Operations: Diagnostics Endpoint

### `GET /api/diagnostics/notifications`

Protected endpoint reporting Slack notifications adoption and schema presence.

**Auth:** Pass the `DIAGNOSTICS_KEY` env var value via query param or header:
```bash
# Query param
curl "https://change-risk-radar.vercel.app/api/diagnostics/notifications?key=<DIAGNOSTICS_KEY>"

# Authorization header
curl -H "Authorization: Bearer <DIAGNOSTICS_KEY>" \
  "https://change-risk-radar.vercel.app/api/diagnostics/notifications"
```

**Response:**
```json
{
  "ok": true,
  "now": "2025-01-01T00:00:00.000Z",
  "tables_present": ["crr_notification_channels", "crr_alert_dispatches", ...],
  "tables_missing": [],
  "metrics": {
    "endpoints": {
      "total_active": 12,
      "distinct_active_orgs": 5,
      "by_kind": { "slack_webhook": 8, "email": 3, "webhook": 1 }
    },
    "last_24h": {
      "total_dispatches": 47,
      "sent": 44,
      "failed": 3,
      "error_rate": 6.38,
      "alerts": 15
    },
    "log_24h": {
      "total": 52,
      "sent": 49,
      "failed": 3,
      "avg_latency_ms": 342
    }
  },
  "errors": []
}
```

**Env vars required:**
- `DIAGNOSTICS_KEY` — strong secret key (set in Vercel dashboard or via API)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (already present)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (already present)
