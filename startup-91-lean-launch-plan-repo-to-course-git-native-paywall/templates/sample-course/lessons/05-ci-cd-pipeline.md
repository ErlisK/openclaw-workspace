---
title: "CI/CD Pipeline That Ships With Confidence"
slug: "ci-cd-pipeline"
order: 5
access: paid
description: "Build a GitHub Actions pipeline that runs on every push: lint, typecheck, unit tests, E2E tests, and deploy to preview — all in under 4 minutes."
estimated_minutes: 20
sandbox_url: "https://stackblitz.com/edit/github-actions-ci-starter?embed=1&file=.github%2Fworkflows%2Fci.yml&hideExplorer=0"
---

# CI/CD Pipeline That Ships With Confidence

A good CI/CD pipeline is invisible when it's working and invaluable when it's not. This lesson builds a real pipeline: under 4 minutes end-to-end, deploys previews on every PR, and promotes to production automatically on merge to `main`.

> **Live exercise:** Use the embedded editor on the right (or below on mobile) to explore and edit the starter CI workflow. The sandbox has a real `.github/workflows/ci.yml` you can modify and see the effect.

## What "Good CI" Looks Like

A CI pipeline should give you a green/red signal in **under 5 minutes**. Developers stop trusting CI that takes 15+ minutes — they stop waiting and start merging anyway.

### Target pipeline structure

```
Push / PR opened
      │
      ▼
  ┌──────────┐
  │   lint   │  ~30s
  └──────────┘
      │
      ▼
  ┌──────────┐
  │typecheck │  ~45s
  └──────────┘
      │
      ▼
  ┌──────────┐
  │  tests   │  ~90s (unit + integration, parallel)
  └──────────┘
      │
      ▼
  ┌──────────────────┐
  │  build + deploy  │  ~60s (preview on PR, production on main)
  └──────────────────┘

Total: ~3m30s
```

## The GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── Fast checks (run in parallel) ──────────────────────────────────────────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci --workspace=apps/web
      - run: npm run lint --workspace=apps/web

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck --workspaces --if-present

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test --workspaces --if-present

  # ── Deploy (only after checks pass) ────────────────────────────────────────
  deploy-preview:
    needs: [lint, typecheck, test]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: |
          cd apps/web
          npx vercel --token ${{ secrets.VERCEL_TOKEN }} \
            --scope limalabs \
            --yes
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    needs: [lint, typecheck, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: |
          cd apps/web
          npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }} \
            --scope limalabs \
            --yes
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## Key Pipeline Patterns

### `concurrency` — cancel superseded runs

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

If you push twice quickly, the first run is cancelled when the second starts. Saves minutes and money on most CI providers.

### Caching dependencies

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm   # ← caches ~/.npm, ~30s saved per run
```

### Parallel fast checks

```yaml
jobs:
  lint:   { ... }
  typecheck: { ... }
  test:   { ... }
  deploy:
    needs: [lint, typecheck, test]   # ← waits for all three
```

This runs lint, typecheck, and tests concurrently — not serially. If any one fails, the others are still allowed to finish so you get the full picture.

### Secrets management

Never hardcode secrets in workflow files. Store them in **Settings → Secrets and variables → Actions**:

```
VERCEL_TOKEN        → your Vercel access token
STRIPE_SECRET_KEY   → your Stripe secret key (for integration tests only)
SUPABASE_SERVICE_ROLE_KEY → for DB migration jobs
```

Access in the workflow:

```yaml
env:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## Running E2E Tests in CI

```yaml
  e2e:
    needs: [deploy-preview]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: |
          BASE_URL=${{ steps.deploy.outputs.preview_url }} \
          npx playwright test
        working-directory: apps/web
```

E2E tests run against the deployed preview URL — exactly what the user would see.

## Shipping With Confidence

With this pipeline in place:

- Every PR gets a preview deployment — link in the PR description
- Every merge to `main` automatically ships to production
- Broken builds never reach main — the gates stop them
- The whole thing takes under 4 minutes

That's the goal: fast feedback, automated deploys, zero manual toil.
