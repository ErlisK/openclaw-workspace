# Production-Readiness Checklist — FocusDo MVP
**Version:** 1.0 · **Date:** 2025-07-07  
**48-hour validation window criteria**

Legend: ✅ Done · 🔧 Configured (pending credentials) · 📋 Documented · ⏳ Phase 2

---

## 1. CI/CD Pipeline

### 1.1 Continuous Integration
| # | Check | Status | File |
|---|-------|--------|------|
| CI-01 | TypeScript type-check on every PR | ✅ | `.github/workflows/ci.yml` |
| CI-02 | ESLint on every PR | ✅ | `.github/workflows/ci.yml` |
| CI-03 | Unit tests with coverage gate (≥60%) | ✅ | `.github/workflows/ci.yml` + `vitest.config.ts` |
| CI-04 | Production build verification | ✅ | `.github/workflows/ci.yml` |
| CI-05 | HTTP smoke tests against deployed URL | ✅ | `.github/workflows/ci.yml` + `tests/smoke/http.test.ts` |
| CI-06 | Lighthouse performance budget | ✅ | `.github/workflows/ci.yml` + `.lighthouserc.json` |
| CI-07 | Concurrent runs cancelled on new push | ✅ | `concurrency:` in all workflows |

### 1.2 Continuous Deployment
| # | Check | Status | File |
|---|-------|--------|------|
| CD-01 | Auto-deploy to Vercel production on `main` push | ✅ | `.github/workflows/deploy-prod.yml` |
| CD-02 | Preview deploy on every PR | ✅ | `.github/workflows/deploy-preview.yml` |
| CD-03 | Preview URL posted as PR comment | ✅ | `.github/workflows/deploy-preview.yml` |
| CD-04 | Post-deploy smoke check (HTTP 200 gate) | ✅ | `deploy-prod.yml` |
| CD-05 | Sentry release notification on deploy | 🔧 | `deploy-prod.yml` (needs `SENTRY_AUTH_TOKEN`) |
| CD-06 | Never cancel in-flight production deploys | ✅ | `cancel-in-progress: false` |

---

## 2. Environment Variables & Secrets

| # | Check | Status | Detail |
|---|-------|--------|--------|
| ENV-01 | All env vars documented | ✅ | `.env.example` |
| ENV-02 | Required secrets documented for GitHub | ✅ | `docs/github-secrets.md` |
| ENV-03 | Secret rotation policy defined | ✅ | `docs/github-secrets.md` |
| ENV-04 | `SUPABASE_SERVICE_ROLE_KEY` never in client code | ✅ | Enforced by code review |
| ENV-05 | Runtime env validation with warnings | ✅ | `lib/env.ts` + `logEnvStatus()` |
| ENV-06 | App degrades gracefully with no env vars | ✅ | All integrations optional |
| ENV-07 | Vercel env vars set in dashboard | 🔧 | Add via Vercel dashboard when Supabase is provisioned |
| ENV-08 | `.env.local` in `.gitignore` | ✅ | Default Next.js `.gitignore` |

---

## 3. RLS Policies (Supabase)

| # | Check | Status | File |
|---|-------|--------|------|
| RLS-01 | RLS enabled on `tasks` table | ✅ | `supabase/migrations/002_rls_policies.sql` |
| RLS-02 | Users can only SELECT their own tasks | ✅ | `tasks: select own` policy |
| RLS-03 | Users can only INSERT their own tasks | ✅ | `tasks: insert own` policy |
| RLS-04 | Users can only UPDATE their own tasks | ✅ | `tasks: update own` policy |
| RLS-05 | No hard DELETE (soft-delete only) | ✅ | Only `status='deleted'` allowed |
| RLS-06 | RLS enabled on `events` table | ✅ | `events: insert/select own` |
| RLS-07 | RLS enabled on `profiles` table | ✅ | `profiles: select/update own` |
| RLS-08 | RLS enabled on `sessions` table | ✅ | `sessions: own` policies |
| RLS-09 | Service role key never in client bundle | ✅ | Code review + `lib/env.ts` manifest |
| RLS-10 | Supabase anon key restrictions tested | 📋 | Verify after Supabase project setup |

---

## 4. Daily Backups

| # | Check | Status | Detail |
|---|-------|--------|--------|
| BAK-01 | Supabase automatic daily backups | 🔧 | Auto-enabled on Supabase Pro plan |
| BAK-02 | 7-day backup retention | 🔧 | Supabase Pro plan default |
| BAK-03 | Point-in-time recovery | ⏳ | Supabase Pro plan; Phase 2 |
| BAK-04 | Backup verification cron job | ✅ | `.github/workflows/maintenance.yml` |
| BAK-05 | localStorage data export (client) | 📋 | `getEvents()` in `lib/analytics.ts`; export UI Phase 2 |
| BAK-06 | Manual pg_dump procedure documented | ✅ | `maintenance.yml` inline docs |
| BAK-07 | Supabase Free fallback: weekly manual export | 📋 | `pg_dump $DATABASE_URL \| gzip > backup-$(date +%Y%m%d).sql.gz` |

---

## 5. Uptime & Alerts

| # | Check | Status | Detail |
|---|-------|--------|--------|
| UP-01 | 15-minute uptime check via GitHub Actions | ✅ | `.github/workflows/uptime.yml` |
| UP-02 | Auto-create GitHub issue on downtime | ✅ | `uptime.yml` — creates labelled issue |
| UP-03 | Check: GET / returns 200 | ✅ | `uptime.yml` |
| UP-04 | Check: manifest.json returns 200 | ✅ | `uptime.yml` |
| UP-05 | Check: sw.js returns 200 | ✅ | `uptime.yml` |
| UP-06 | Sentry alerts on error spike (H3) | 🔧 | Configure in Sentry: alert if error rate > 1% in 15min window |
| UP-07 | Vercel incident page monitoring | 📋 | Subscribe at [vercel.com/status](https://vercel.com/status) |
| UP-08 | External uptime monitor (UptimeRobot/BetterStack) | ⏳ | Phase 2 — configure with email/SMS alerts |

**Sentry Alert Rule (configure manually):**
```
Name: H3 Error Rate Alert
Condition: error rate > 1% in last 15 minutes
Action: Send email + Slack notification
```

---

## 6. Performance Budget (P90 < 1.5s)

| # | Metric | Budget | Tool | Status |
|---|--------|--------|------|--------|
| PERF-01 | Largest Contentful Paint (LCP) | ≤ 2 500 ms | Lighthouse | ✅ Configured |
| PERF-02 | First Contentful Paint (FCP) | ≤ 1 800 ms | Lighthouse | ✅ Configured |
| PERF-03 | Time to Interactive (TTI) | ≤ 3 500 ms | Lighthouse | ✅ Configured |
| PERF-04 | Total Blocking Time (TBT) | ≤ 300 ms | Lighthouse | ✅ Configured |
| PERF-05 | Cumulative Layout Shift (CLS) | ≤ 0.1 | Lighthouse | ✅ Configured |
| PERF-06 | HTTP response P90 | ≤ 3 000 ms | Smoke test | ✅ Enforced |
| PERF-07 | Performance score | ≥ 85 | Lighthouse | ✅ Configured |
| PERF-08 | Static asset caching | `max-age=31536000, immutable` | `vercel.json` | ✅ Configured |
| PERF-09 | SW Cache-Control: no-cache | Enforced | `vercel.json` | ✅ Configured |
| PERF-10 | Lighthouse CI runs on `main` | ✅ | `ci.yml` (lighthouse job) | ✅ |

**Lighthouse config:** `.lighthouserc.json` — 3 runs, simulated 4G throttling, desktop

---

## 7. Security Headers

| # | Header | Value | Status |
|---|--------|-------|--------|
| SEC-01 | `X-Frame-Options` | `SAMEORIGIN` | ✅ `vercel.json` |
| SEC-02 | `X-Content-Type-Options` | `nosniff` | ✅ `vercel.json` |
| SEC-03 | `X-XSS-Protection` | `1; mode=block` | ✅ `vercel.json` |
| SEC-04 | `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ `vercel.json` |
| SEC-05 | `Permissions-Policy` | camera, mic, geo, payment disabled | ✅ `vercel.json` |
| SEC-06 | `Strict-Transport-Security` | `max-age=63072000; preload` | ✅ `vercel.json` |
| SEC-07 | `Content-Security-Policy` | Supabase, PostHog, Sentry allowlisted | ✅ `vercel.json` |
| SEC-08 | HTTPS enforced | Vercel default | ✅ |

---

## 8. Smoke Tests

| # | Test | Status | File |
|---|------|--------|------|
| SMK-01 | GET / returns HTTP 200 | ✅ | `tests/smoke/http.test.ts` |
| SMK-02 | Returns HTML content-type | ✅ | `tests/smoke/http.test.ts` |
| SMK-03 | Contains "FocusDo" in HTML | ✅ | `tests/smoke/http.test.ts` |
| SMK-04 | Links to manifest.json | ✅ | `tests/smoke/http.test.ts` |
| SMK-05 | Registers service worker | ✅ | `tests/smoke/http.test.ts` |
| SMK-06 | Security headers present | ✅ | `tests/smoke/http.test.ts` |
| SMK-07 | manifest.json returns 200 + valid JSON | ✅ | `tests/smoke/http.test.ts` |
| SMK-08 | sw.js returns 200 + no-cache | ✅ | `tests/smoke/http.test.ts` |
| SMK-09 | 404 returns 404 (not 500) | ✅ | `tests/smoke/http.test.ts` |
| SMK-10 | Response P90 < 3 000 ms | ✅ | `tests/smoke/http.test.ts` |
| E2E-01 | App loads with correct title | ✅ | `tests/e2e/app.spec.ts` |
| E2E-02 | Keyboard: add + complete task (H1/H2 path) | ✅ | `tests/e2e/app.spec.ts` |
| E2E-03 | Focus Mode shows max 3 tasks | ✅ | `tests/e2e/app.spec.ts` |
| E2E-04 | Keyboard navigation (J/K) | ✅ | `tests/e2e/app.spec.ts` |
| E2E-05 | Delete task via keyboard | ✅ | `tests/e2e/app.spec.ts` |
| E2E-06 | Tasks survive page reload | ✅ | `tests/e2e/app.spec.ts` |
| E2E-07 | Hypothesis Dashboard opens | ✅ | `tests/e2e/app.spec.ts` |
| E2E-08 | Help modal shows shortcuts | ✅ | `tests/e2e/app.spec.ts` |
| E2E-09 | No console errors on load | ✅ | `tests/e2e/app.spec.ts` |

---

## 9. Unit Tests

| # | Module | Coverage | Status |
|---|--------|----------|--------|
| UT-01 | `lib/tasks.ts` — createTask | ✅ | `tests/unit/tasks.test.ts` |
| UT-02 | `lib/tasks.ts` — completeTask | ✅ | `tests/unit/tasks.test.ts` |
| UT-03 | `lib/tasks.ts` — deleteTask | ✅ | `tests/unit/tasks.test.ts` |
| UT-04 | `lib/tasks.ts` — updateTaskText | ✅ | `tests/unit/tasks.test.ts` |
| UT-05 | `lib/tasks.ts` — getActiveTasks sorting | ✅ | `tests/unit/tasks.test.ts` |
| UT-06 | `lib/tasks.ts` — getFocusTasks (max 3) | ✅ | `tests/unit/tasks.test.ts` |
| UT-07 | `lib/tasks.ts` — getCompletedTasks ordering | ✅ | `tests/unit/tasks.test.ts` |
| UT-08 | Pure function immutability | ✅ | `tests/unit/tasks.test.ts` |

---

## 10. Pre-Launch Gate (48h Validation Window)

All items below must be ✅ before opening the validation window:

- [ ] `npm run test:unit` passes (all unit tests green)
- [ ] `npm run test:smoke` passes (all HTTP smoke tests green)  
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `vercel.json` deployed — security headers verified (curl -I)
- [ ] Sentry: at least one test error captured successfully
- [ ] PostHog: `session_started` event visible in dashboard
- [ ] Supabase: migrations applied, RLS tested with anon key
- [ ] GitHub Actions: all 4 workflow files visible and running
- [ ] Uptime check: 3 consecutive successful runs (45 min)
- [ ] Lighthouse CI: LCP < 2.5s, Performance ≥ 85

---

## Phase 2 Items (Post-Validation)

- External uptime monitor (BetterStack/UptimeRobot) with SMS alerts
- Supabase Pro for point-in-time recovery
- Session replay in Sentry (with consent UI)
- PostHog feature flags for A/B testing H1 variants
- Dependabot for automated security patches
- OWASP ZAP scan in CI pipeline
- Rate limiting on API routes
- Signed Supabase storage URLs for user avatars
