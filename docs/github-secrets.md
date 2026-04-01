# GitHub Secrets — Setup Guide

Configure these secrets at: `https://github.com/ErlisK/openclaw-workspace/settings/secrets/actions`

## Required for CI/CD

| Secret | Required | Value | Where to find |
|--------|----------|-------|---------------|
| `VERCEL_ACCESS_TOKEN` | ✅ | Vercel personal token | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | ✅ | `team_J0gjGtYSAnuiHxa1M2p643ON` | From .vercel/project.json |
| `VERCEL_PROJECT_ID` | ✅ | `prj_5gYahyjr16BDnJf2J7fSN209FQnV` | From .vercel/project.json |

## Required for integrations (set when ready)

| Secret | Required | Purpose |
|--------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | When using Supabase | Cloud task sync |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | When using Supabase | Auth + data access |
| `NEXT_PUBLIC_POSTHOG_KEY` | When using PostHog | Analytics events |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional | Custom PostHog host |
| `NEXT_PUBLIC_SENTRY_DSN` | When using Sentry | Error monitoring |
| `SENTRY_AUTH_TOKEN` | For source maps | Error grouping |
| `SENTRY_ORG` | For source maps | Your Sentry org slug |

## Feature Flags

Feature flags are set as Vercel **environment variables** (not GitHub secrets) —
they are `NEXT_PUBLIC_` vars that are baked in at build time.

**Already configured via Vercel API:**

| Variable | Production | Staging (preview) |
|----------|-----------|-------------------|
| `NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT` | `0` (opt-in) | `1` (on by default) |
| `NEXT_PUBLIC_FLAG_TODAY_CAP` | `3` | `3` |
| `NEXT_PUBLIC_FLAG_AUTH_ENABLED` | `1` | `1` |
| `NEXT_PUBLIC_SEED_DATA` | `false` | `true` |

## Vercel GitHub Integration

For production deploys to work via CI (deploy-prod.yml), the workflow
uses VERCEL_ORG_ID + VERCEL_PROJECT_ID to link to the correct project.

These values are already in `.vercel/project.json` — copy them to GitHub Secrets.

## Rotation Policy

| Secret | Rotation | Action |
|--------|----------|--------|
| VERCEL_ACCESS_TOKEN | 90 days | Revoke old, generate new at vercel.com/account/tokens |
| SUPABASE_ANON_KEY | On breach | Rotate in Supabase → Settings → API |
| POSTHOG_KEY | On breach | Rotate in PostHog → Project Settings |
| SENTRY_AUTH_TOKEN | 90 days | Revoke in Sentry → Settings → Auth Tokens |
| GITHUB_PERSONAL_ACCESS_TOKEN | 90 days | Rotate in GitHub → Settings → Developer settings |
