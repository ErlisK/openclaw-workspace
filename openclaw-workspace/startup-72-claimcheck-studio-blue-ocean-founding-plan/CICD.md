# CI/CD — ClaimCheck Studio

**App:** [app.citebundle.com](https://app.citebundle.com)  
**Repo:** [ErlisK/openclaw-workspace](https://github.com/ErlisK/openclaw-workspace)  
**Monorepo path:** `openclaw-workspace/startup-72-claimcheck-studio-blue-ocean-founding-plan/apps/claimcheck-studio/`

---

## Pipeline Overview

```
push to master
      │
      ▼
 ┌─────────────┐     ┌──────────┐     ┌────────────┐     ┌──────────────────┐
 │  lint &     │────▶│  build   │────▶│   smoke    │────▶│ deploy production│
 │ type-check  │     │ (Next.js)│     │   tests    │     │ app.citebundle.com│
 └─────────────┘     └──────────┘     └────────────┘     └──────────────────┘

push to staging
      │
      ▼
 ┌─────────────┐     ┌──────────┐     ┌───────────────┐
 │  lint &     │────▶│  build   │────▶│ deploy staging│
 │ type-check  │     │ (Next.js)│     │ (vercel preview│
 └─────────────┘     └──────────┘     └───────────────┘

open PR → master
      │
      ▼
 ┌─────────────┐     ┌──────────┐     ┌──────────────────────┐
 │  lint &     │────▶│  build   │────▶│ deploy preview URL   │
 │ type-check  │     │ (Next.js)│     │ + PR comment with URL │
 └─────────────┘     └──────────┘     └──────────────────────┘
```

---

## Workflow: `.github/workflows/claimcheck-ci.yml`

### Trigger conditions
- Push to `master`/`main`/`staging` **only if files under the ClaimCheck Studio path changed**
- Pull requests targeting `master`/`main` with ClaimCheck changes
- Path filter: `openclaw-workspace/startup-72-claimcheck-studio-blue-ocean-founding-plan/**`

### Jobs

| Job | Runs on | Condition |
|-----|---------|-----------|
| `lint` | every push/PR | always |
| `build` | every push/PR | after lint |
| `smoke` | push to master/staging | after build |
| `deploy-preview` | PRs only | after build |
| `deploy-production` | push to master/main | after build + smoke |
| `deploy-staging` | push to staging | after build |

### Concurrency
`cancel-in-progress: true` — newer push cancels queued runs for the same ref.

---

## Smoke Tests

Run against `https://app.citebundle.com` after every production deploy:

```
✅ / → 200
✅ /eval → 200  
✅ /admin → 200
✅ /api/jobs/worker → 200
✅ /api/jobs?stats=1 → 200
✅ Sessions API (sanity count check)
✅ Telemetry ingest (POST /api/telemetry)
```

After a successful production deploy, a `ci.production_deployed` telemetry event is emitted with the commit SHA, ref, actor, and run ID — visible in the `/admin` ops dashboard.

---

## Required GitHub Secrets

Set at repository level (`Settings → Secrets → Actions`):

| Secret | Value | Used by |
|--------|-------|---------|
| `VERCEL_TOKEN` | Vercel personal access token | Deploy jobs |
| `VERCEL_ORG_ID` | `team_J0gjGtYSAnuiHxa1M2p643ON` | Vercel CLI |
| `VERCEL_PROJECT_ID` | `prj_Z28kHxsaZkRfCUiwuxIdnZJtroox` | Vercel CLI |

**Status:** All three secrets are set ✅

---

## Vercel Environment Variables

Managed at: Vercel Dashboard → claimcheck-studio → Settings → Environment Variables

| Variable | Environments | Notes |
|----------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Dev | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Dev | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Dev | Server-side only |
| `NEXT_PUBLIC_APP_URL` | Production, Preview, Dev | `https://app.citebundle.com` |
| `AWS_ACCESS_KEY_ID` | Production, Preview | Bedrock LLM access |
| `AWS_SECRET_ACCESS_KEY` | Production, Preview | Bedrock LLM access |
| `AWS_SESSION_TOKEN` | Production, Preview | Bedrock LLM access |
| `AWS_REGION` | Production, Preview | `us-east-1` |
| `CRON_SECRET` | Production | Vercel cron auth |
| `WORKER_SECRET` | Production | Worker endpoint auth |

**Never commit secrets to git.** The `.env.local` file is gitignored.

---

## Vercel Cron

`vercel.json` registers a 1-minute cron trigger on `/api/jobs/worker`:

```json
{
  "crons": [{ "path": "/api/jobs/worker", "schedule": "* * * * *" }]
}
```

The worker authenticates via the `Authorization: Bearer $CRON_SECRET` header injected by Vercel.

---

## Deployment Environments

| Environment | URL | Branch | Notes |
|-------------|-----|--------|-------|
| **Production** | [app.citebundle.com](https://app.citebundle.com) | `master`/`main` | Protected; requires smoke pass |
| **Staging** | Vercel preview URL | `staging` | Deploy on push |
| **Preview** | Per-PR Vercel URL | Any PR | Auto-commented on PR |

---

## Supabase Migrations

Migrations are in `supabase/migrations/`. Apply manually to the project:

```bash
# Apply a migration
curl -s "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"<SQL here>"}'
```

Migration history tracked in `cc_schema_migrations` table:

| Version | Description |
|---------|-------------|
| `001` | RLS policies for core tables |
| `002` | Full data model (17 tables, pgvector, billing, connectors) |
| `003` | Telemetry indexes, views, job queue functions, pg_cron stubs |

---

## Branch Protection (recommended)

For `master`/`main`:
- Require `lint`, `build`, `smoke` to pass before merge
- Require at least 1 approval (via CODEOWNERS)
- Disallow force pushes
- Require linear history

Configure at: GitHub → Settings → Branches → Add branch protection rule

---

## Local Development

```bash
cd openclaw-workspace/startup-72-claimcheck-studio-blue-ocean-founding-plan/apps/claimcheck-studio

# Install
npm install

# Dev server (requires .env.local with Supabase + AWS keys)
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build

# Deploy to production manually
npx vercel --prod --token $VERCEL_ACCESS_TOKEN --yes
```

---

*ClaimCheck Studio · [citebundle.com](https://citebundle.com) · hello@citebundle.com*
