# Changelog

All notable changes to FocusDo are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — 2026-04-01 · MVP Public Release

### Added
- **Data export** — download all tasks as CSV (opens in Excel/Sheets/Numbers) or JSON (full portable snapshot). Available from the Dashboard (📊 → Export). Zero server upload — everything stays on device.
- **Privacy Policy** — `/privacy` page covering data storage, third-party services, your rights, and contact.
- **Terms of Service** — `/terms` page covering acceptable use, disclaimers, and data ownership.
- **Legal footer links** — Privacy and Terms links added to the status bar.
- **CHANGELOG.md** — this file.

### Changed
- Dashboard now accepts `onExport` prop and shows an Export button in the footer row.
- Status bar on desktop now shows Privacy · Terms links alongside keyboard hint.

---

## [0.1.1] — 2026-04-01 · Phase 3 Polish

### Added
- **Onboarding flow** — first-run two-step wizard: welcome screen explaining the core loop, then a task-add step with progress bar (3 slots) and starter suggestions. Auto-dismisses after first task is added; never shows again (persisted via `focusdo:onboarded` localStorage key).
- **5 onboarding E2E tests** — welcome prompt visible, CTA transition, skip persists, auto-dismiss, pre-existing task suppresses prompt.
- **Focus Mode default ON** — `NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT=1` set in production via Vercel env API.

### Changed
- **TodayView empty states** — four contextual states: fresh (N/? hints), has-backlog (P-to-promote), all-done (🎉 banner), full (B-to-demote hint). Capacity remaining count shown when partially filled.
- **BacklogView empty state** — "Add a task" CTA button wired to `openInput`; "Promote with P" hint.
- **HelpModal redesign** — grouped by workflow (Add/navigate · Task actions · Priority · Focus/view), colour-coded sections, Core Loop strip at top, keyboard chip styling.
- **E2E `clearState()`** — now sets `focusdo:onboarded=1` so existing tests bypass the new onboarding prompt.

---

## [0.1.0] — 2026-04-01 · Phase 3 — Production Hardening

### Added
- **Health API** (`/api/health`, `/api/health/db`) — edge runtime, returns status/version/uptime/integrations/flags.
- **RLS migrations** — `006_rls_verification.sql` (verification queries), `007_backup_procedures.sql` (`cleanup_old_deleted_tasks`, `cleanup_old_sessions`, `v_backup_status` view).
- **Uptime monitor** — `.github/workflows/uptime.yml`: 5 checks per run, auto-opens GitHub issue on failure, auto-closes on recovery.
- **Maintenance workflow** — `.github/workflows/maintenance.yml`: daily pg_dump → artifact (30-day retention), weekly Lighthouse regression, weekly H3 check, monthly DB cleanup.
- **28 smoke tests** — extended suite including `/api/health` suite (9 tests) and offline fallback check.
- **Production readiness checklist** — `docs/production-readiness.md` (90 items).
- **Production hardening doc** — `docs/production-hardening.md`.
- **Burn-in report** — `docs/burn-in-report.md`.

### Changed
- GitHub Actions workflows point to correct production URL (`focusdo-rho.vercel.app`).

### Tagged
- `v0.1.0` annotated tag: Phase 3 baseline.

---

## [0.0.3] — 2026-03-31 · Phase 2 — CI/CD, Feature Flags, Staging

### Added
- **Feature flags** (`lib/env.ts`) — `getFeatureFlags()` with typed `FeatureFlags` interface, memoised; `_resetFlagCache()` for tests. Reads `NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT`, `NEXT_PUBLIC_SEED_DATA`, `NEXT_PUBLIC_FLAG_AUTH_ENABLED`, `NEXT_PUBLIC_FLAG_TODAY_CAP`.
- **Seed data** (`lib/seed.ts`) — `injectSeedTasks()` (8 demo tasks: 3 today, 5 backlog), `hasSeedTasks()`, `clearSeedTasks()`. Seed IDs prefixed `seed-`.
- **20 flag unit tests** — flag parsing, seed inject/clear/preserve.
- **24 analytics unit tests** (`tests/unit/analytics.test.ts`).
- **9–11 perf/observability E2E tests** (`tests/e2e/perf-observability.spec.ts`).
- **CI workflow** (`.github/workflows/ci.yml`) — 6-job pipeline: unit→build→smoke→e2e→perf→lighthouse; triggers on `main` and `staging`.
- **Deploy prod workflow** — vercel build + deploy prebuilt + post-deploy smoke + Sentry release notify.
- **Deploy staging workflow** — staging branch → Vercel preview + H1/H2/H3 checklist summary.
- **Deploy preview workflow** — PR previews + manual QA checklist comment.
- **8 Vercel env vars** set via API (4 production + 4 preview targets).
- **`staging` branch** created and pushed.

### Changed
- `useTasks.ts` — imports `getIntegrationFlags` from `@/lib/env`; lazy init for `focusMode` state.

---

## [0.0.2] — 2026-03-30 · Phase 1 — Core App, PWA, Auth

### Added
- **Core app scaffold** — Next.js 14, TypeScript, Tailwind CSS, App Router.
- **`lib/types.ts`** — `Task`, `AppEvent` union, `HOTKEY_MAP`, `TaskList`, `TODAY_CAP = 3`.
- **`lib/tasks.ts`** — pure task mutators/selectors (`promoteTask`, `demoteTask`, `getTodayTasks`, `getBacklogTasks`, `getFocusTasks`, `canPromote`).
- **`lib/analytics.ts`** — client-side event ring-buffer (500 events), `track<E>()`, `getStats()` computing H1/H2/H3 metrics.
- **`hooks/useTasks.ts`** — unified auth+tasks state hook, Supabase lazy sync, optimistic local writes.
- **`hooks/useKeyboard.ts`** — global keydown handler (n/f/Tab/j/k/Space/x/p/b/e/d/1/2/3/Esc).
- **Components** — `TodayView`, `BacklogView`, `AuthModal`, `TaskInput`, `TaskItem`, `HelpModal`, `Dashboard`, `ErrorBoundary`.
- **`app/page.tsx`** — split-pane desktop / tabs mobile, Focus Mode, status bar, modals.
- **`app/auth/callback/`** — static server component + `"use client"` callback handler.
- **`app/global-error.tsx`** — global error boundary.
- **`lib/supabase.ts`** — lazy Proxy client, no crash without env vars; `isSupabaseConfigured` flag.
- **`lib/database.types.ts`** — TypeScript types for Postgres schema.
- **`lib/posthog.ts`** — PostHog client with `NEXT_PUBLIC_POSTHOG_KEY`.
- **`app/providers.tsx`** — PostHogProvider wrapper.
- **Sentry** — `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`.
- **PWA** — `public/manifest.json`, `public/sw.js`, `public/icons/icon-192.png`.
- **Supabase migrations** — `001_initial_schema.sql`, `002_rls_policies.sql`, `003_analytics_views.sql` (H1/H2/H3 views + activation funnel).
- **`supabase/seed/dev_seed.sql`**, `supabase/config.toml`.
- **21 unit tests** (`tests/unit/tasks.test.ts`) — all passing.
- **18 smoke tests** (`tests/smoke/http.test.ts`) — all passing (P90: 36ms).
- **9 Playwright E2E tests** (`tests/e2e/app.spec.ts`).
- **`vercel.json`** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, cache headers.
- **`.lighthouserc.json`** — performance budget (LCP≤2500ms, FCP≤1800ms, TTI≤3500ms, TBT≤300ms, CLS≤0.1, score≥85).
- **Docs** — `mvp-spec.md`, `adr-001.md` through `adr-003.md`, `erd.md`, `event-schema.md`, `acceptance-criteria.md`, `github-secrets.md`, `staging-runbook.md`.

### Architecture decisions
- **Client-only MVP** — localStorage first, no backend required (ADR-001).
- **Lazy Supabase Proxy** — defers `createClient` until first call, prevents SSR crashes (ADR-002).
- **`/auth/callback` split** — static server component + `force-dynamic` client component (ADR-003).

---

## [0.0.1] — 2026-03-29 · Initial commit

- Project initialised via `create-next-app`.

---

[0.2.0]: https://github.com/ErlisK/openclaw-workspace/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/ErlisK/openclaw-workspace/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ErlisK/openclaw-workspace/compare/v0.0.3...v0.1.0
[0.0.3]: https://github.com/ErlisK/openclaw-workspace/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/ErlisK/openclaw-workspace/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/ErlisK/openclaw-workspace/releases/tag/v0.0.1
