# Production Hardening — Phase 3

## Architecture

```
┌─────────────┐    HTTPS    ┌────────────────┐    SQL (RLS)   ┌────────────────┐
│  Browser    │────────────▶│  Vercel Edge   │──────────────▶│  Supabase PG   │
│  PWA/SW     │             │  Next.js 14    │               │  + Auth        │
└─────────────┘             └────────────────┘               └────────────────┘
                                    │                                │
                              ┌─────┴─────┐                   ┌─────┴──────┐
                              │  PostHog  │                   │  Backups   │
                              │ Analytics │                   │  Daily pg  │
                              └───────────┘                   │  dump →    │
                                    │                         │  Artifacts │
                              ┌─────┴─────┐                   └────────────┘
                              │  Sentry   │
                              │  Errors   │
                              └───────────┘
```

## Production Checklist

### ✅ Vercel (Complete)

| Item | Status | Notes |
|------|--------|-------|
| Project linked | ✅ | `prj_5gYahyjr16BDnJf2J7fSN209FQnV` |
| Production alias | ✅ | `focusdo-rho.vercel.app` |
| SSL certificate | ✅ | Vercel automatic (Let's Encrypt) |
| Security headers | ✅ | CSP, HSTS, X-Frame-Options, etc. |
| Feature flags (prod) | ✅ | 4 env vars set via API |
| Feature flags (staging) | ✅ | 4 env vars set via API |
| Deploy workflow | ✅ | `deploy-prod.yml` |
| Preview workflow | ✅ | `deploy-preview.yml` |
| Staging workflow | ✅ | `deploy-staging.yml` |

### ⚙️ Supabase (Provision when ready)

| Item | Status | Action |
|------|--------|--------|
| Project created | ⬜ | Create at supabase.com → New Project |
| Migrations applied | ⬜ | Run SQL files 001–007 in SQL editor |
| RLS verified | ⬜ | Run migration 006 verification queries |
| Auth configured | ⬜ | Enable Email (magic link) in Auth settings |
| `NEXT_PUBLIC_SUPABASE_URL` | ⬜ | Add to Vercel env vars |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⬜ | Add to Vercel env vars |
| Backup plan | ⬜ | Add `SUPABASE_DB_URL` to GitHub Secrets |
| Connection pooler | ⬜ | Enable PgBouncer (Settings → Database) |

### ⚙️ Sentry (Provision when ready)

| Item | Status | Action |
|------|--------|--------|
| Project created | ⬜ | sentry.io → New Project → Next.js |
| DSN configured | ⬜ | Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel |
| Alert rule: error spike | ⬜ | See alerting thresholds below |
| Release tracking | ⬜ | Add `SENTRY_AUTH_TOKEN` to GitHub Secrets |

### ⚙️ PostHog (Provision when ready)

| Item | Status | Action |
|------|--------|--------|
| Project created | ⬜ | app.posthog.com → New Project |
| Key configured | ⬜ | Add `NEXT_PUBLIC_POSTHOG_KEY` to Vercel |
| H1/H2/H3 funnels | ⬜ | Create in PostHog Insights |
| Session replay | ⬜ | Phase 3 — enable with user consent |

### ✅ Monitoring (Complete)

| Item | Status | Notes |
|------|--------|-------|
| Uptime check | ✅ | Every 15min via `uptime.yml` |
| Health API | ✅ | `GET /api/health` (edge, <50ms) |
| Deep health | ✅ | `GET /api/health/db` (DB latency) |
| Incident alerts | ✅ | Auto GitHub issue on failure |
| Auto-close | ✅ | Issue closes on recovery |
| Daily maintenance | ✅ | `maintenance.yml` at 03:00 UTC |
| Backup export | ✅ | pg_dump → GitHub artifact (30d) |

### ✅ RLS Security (Complete)

| Table | RLS Enabled | Policies |
|-------|-------------|---------|
| profiles | ✅ | select/update own |
| tasks | ✅ | select/insert/update own (soft-delete only) |
| events | ✅ | select/insert own |
| sessions | ✅ | select/insert own |

## Alerting Thresholds

### Sentry Alert Rules

Configure in Sentry → Alerts → New Alert Rule:

```
Alert 1: Error Spike (P0)
  Trigger: error_count > 10 in any 5-minute window
  Notify: email + Slack

Alert 2: Error Rate Exceeds H3 Threshold (P1)  
  Trigger: errors/events > 1% in 60-minute window
  Notify: email

Alert 3: New Error Type (P2)
  Trigger: first occurrence of any new error fingerprint
  Notify: email
```

### GitHub Actions Uptime Alerts

Configured in `uptime.yml`:
- Creates GitHub issue with `incident` + `production` labels
- Deduplicates (won't create duplicate issues)
- Auto-closes with recovery comment

### Performance Thresholds

| Metric | Target | Alert Level |
|--------|--------|-------------|
| P90 page load | < 1500ms | Warning at 2000ms |
| P95 API latency | < 300ms | Warning at 500ms |
| LCP | < 2500ms | Error in LHCI |
| CLS | < 0.1 | Error in LHCI |
| Uptime | > 99.9% | Alert on any downtime |

## Backup Strategy

### Current (localStorage-only mode)
- No server-side data — nothing to back up
- localStorage is browser-local; users own their data

### With Supabase (when configured)

**Free Tier:**
- No automatic PITR
- GitHub Actions `maintenance.yml` runs `pg_dump` daily at 03:00 UTC
- Artifacts retained 30 days
- Manual export: `pg_dump $SUPABASE_DB_URL | gzip > backup.sql.gz`

**Pro Tier ($25/mo):**
- Automatic daily backups, 7-day retention
- Point-in-time recovery (PITR) up to 7 days
- No manual backup script needed

**Recommended:** Start with Free, upgrade to Pro when daily active users > 100.

## Domain Configuration

### Current (Vercel default)
- `https://focusdo-rho.vercel.app` ← production
- SSL: Vercel automatic (Let's Encrypt, auto-renewed)
- CDN: Vercel Edge Network (200+ PoPs)

### Custom Domain (when ready)
1. Buy domain (e.g., `focusdo.app` at Namecheap ~$12/yr)
2. Vercel → Project → Domains → Add domain
3. Add CNAME record: `@` → `cname.vercel-dns.com`
4. SSL auto-provisioned within 60s

## Incident Response Runbook

### P0: Complete outage (no HTTP 200)
```bash
# 1. Check Vercel status
curl -s https://www.vercel-status.com/api/v2/status.json | python3 -m json.tool

# 2. Roll back last deployment
npx vercel rollback --token $VERCEL_ACCESS_TOKEN

# 3. Verify rollback
curl -s -o /dev/null -w "%{http_code}" https://focusdo-rho.vercel.app

# 4. Close incident issue manually if auto-close misses
```

### P1: Elevated error rate (> 1%)
```bash
# 1. Check Sentry for error type + stack trace
# 2. Check recent commits: git log --oneline -10
# 3. If code regression: git revert HEAD && git push origin main
# 4. If Supabase issue: check supabase.com/dashboard
```

### P2: Performance degradation (LCP > 2.5s)
```bash
# 1. Run Lighthouse locally
npm run lhci

# 2. Check bundle size
npm run build && du -sh .next/static

# 3. Check Vercel Edge deployment logs
npx vercel logs --token $VERCEL_ACCESS_TOKEN
```
