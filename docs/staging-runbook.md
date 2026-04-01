# Staging Environment — Runbook

## Overview

| Property | Value |
|----------|-------|
| Branch | `staging` |
| Deploy trigger | Push to `staging` branch |
| CI workflow | `.github/workflows/deploy-staging.yml` |
| Vercel env | preview |
| Feature flags | Focus Mode default=ON, Seed data=true |
| URL | Dynamic preview URL per deploy |

## Feature Flags on Staging

Staging uses distinct feature flags (set in Vercel project → preview env):

```
NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT = 1    # Focus Mode on when app opens
NEXT_PUBLIC_SEED_DATA               = true # Pre-loaded demo tasks
NEXT_PUBLIC_FLAG_AUTH_ENABLED       = 1    # Sync button visible
NEXT_PUBLIC_FLAG_TODAY_CAP          = 3    # Today cap = 3 tasks
```

These are already set via the Vercel API. No manual action needed.

## Deploying to Staging

```bash
# 1. Sync staging with main
git checkout staging
git merge main
git push origin staging

# 2. CI picks up the push, runs deploy-staging.yml
# 3. Preview URL is posted in the workflow summary
```

Or deploy directly from the terminal (workaround — avoid npx vercel --prod):

```bash
cd /path/to/focusdo
npx vercel build --token $VERCEL_ACCESS_TOKEN
npx vercel deploy --prebuilt --token $VERCEL_ACCESS_TOKEN
# Returns a preview URL: https://focusdo-xxxx-limalabs.vercel.app
```

## 24h Burn-in Validation

After staging is deployed, run through the following manually:

### 1. Verify seed data (NEXT_PUBLIC_SEED_DATA=true)
- Open the staging URL in a fresh private/incognito window
- You should see 3 tasks in Today + 5 tasks in Backlog
- Confirms `injectSeedTasks()` ran on empty localStorage

### 2. Verify Focus Mode default (NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT=1)
- Open staging URL fresh
- Focus Mode badge ("FOCUS") should be visible immediately
- Confirms `getFeatureFlags().focusModeDefault === true`

### 3. H1: Median time-to-first-task
- Using keyboard only: press `N`, type a task, `Enter`, `j`, `Space`
- Open the 📊 dashboard to see H1 metric
- Target: < 60s (keyboard path: ~5–6s)

### 4. H2: Keyboard completion ratio
- Complete 10 tasks using `Space`/`X` keys only
- Open 📊 dashboard → H2 should show ≥70%

### 5. H3: Error rate
- After 24h of normal usage, open 📊 dashboard
- H3 error rate should be < 1%
- Check Sentry dashboard for any reported errors

## Seed Data Details

Seed tasks injected by `lib/seed.ts` when `NEXT_PUBLIC_SEED_DATA=true`:

**Today (3 tasks — at cap):**
- "Review pull requests" (high)
- "Write daily standup update" (medium)
- "Fix the login redirect bug" (high)

**Backlog (5 tasks):**
- "Refactor authentication module" (medium)
- "Add unit tests for task store" (medium)
- "Update README with setup steps" (low)
- "Design new onboarding flow" (low)
- "Upgrade Node.js to v22" (low)

Tasks can be cleared by deleting localStorage: `localStorage.removeItem("focusdo:tasks")`

## Environment Promotion

When staging burn-in passes all three hypotheses:

1. Merge `staging` → `main`
2. `deploy-prod.yml` automatically deploys to production
3. Verify `https://focusdo-rho.vercel.app` is live (HTTP 200)

## Rollback

```bash
# Roll back to previous commit on main
git revert HEAD
git push origin main

# deploy-prod.yml automatically redeploys
```

Or use Vercel dashboard → Deployments → Redeploy any previous build.
