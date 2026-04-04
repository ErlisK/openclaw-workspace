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
