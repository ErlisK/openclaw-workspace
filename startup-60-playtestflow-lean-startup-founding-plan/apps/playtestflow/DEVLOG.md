# DEVLOG.md — PlaytestFlow Instrumentation

## Project Path
```
~/openclaw-workspace/startup-60-playtestflow-lean-startup-founding-plan/apps/playtestflow/
```
Monorepo: `https://github.com/ErlisK/openclaw-workspace`
Vercel Project ID: `prj_FItqYZ1f3ljsYAVvs8NxGOsLcySR`
Live URL: https://playtestflow.vercel.app

## What Was Done

### 1. Repo & Deps
- Cloned monorepo from GitHub
- Located Next.js app at `startup-60-playtestflow-lean-startup-founding-plan/apps/playtestflow/`
- Installed `posthog-js` package

### 2. /api/healthz Route Added
- File: `app/api/healthz/route.ts`
- Returns `{ ok: true, supabase: 'ok'|'fail', timestamp }`
- Tests Supabase connectivity via a lightweight `select id from waitlist limit 1`

### 3. PostHog Integration
- Created PostHog account: `scide-founder@agentmail.to`
- Project: "Default project" (PlaytestFlow) on us.i.posthog.com
- PostHog Project API Key: `phc_svhNzAHtjnQic6giBefNrbCogKd7CEeE2ZdsxCFWuEZg`
- Added `PostHogProvider` wrapper in `components/PostHogProvider.tsx`
- Updated `app/layout.tsx` to wrap children in `<PostHogProvider>`
- Updated `lib/analytics.ts` to add PostHog event helpers (preserved existing UTM/session utilities)
- Instrumented `app/page.tsx`:
  - `waitlist_submit` on successful form submit
  - `pricing_click` on pricing CTA click
  - `consent_checked` on consent checkbox toggle

### 4. Vercel Env Vars Set
- `NEXT_PUBLIC_POSTHOG_KEY` → set for production/preview/development
- `NEXT_PUBLIC_POSTHOG_HOST` → `https://us.i.posthog.com`
- Supabase vars already present: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 5. Deployment
- Deployed via `vercel --prod` with `VERCEL_ACCESS_TOKEN`
- Build passed with 0 TypeScript errors
