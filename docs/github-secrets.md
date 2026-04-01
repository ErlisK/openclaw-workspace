# GitHub Secrets Setup Guide
**Project:** FocusDo MVP  
**Date:** 2025-07-07

This file documents all secrets that must be configured in the GitHub repository
before CI/CD workflows will fully function.

---

## How to Add Secrets

1. Go to **GitHub → ErlisK/openclaw-workspace → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add each secret below

---

## Required Secrets

### Vercel (REQUIRED for deploy workflows)

| Secret | Value | How to get |
|--------|-------|-----------|
| `VERCEL_ACCESS_TOKEN` | Your Vercel token | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `team_J0gjGtYSAnuiHxa1M2p643ON` | Already known |
| `VERCEL_PROJECT_ID` | `prj_SBJyPIJbPzDUaywggtWsCdyqPaUv` | Already known |

---

## Optional Secrets (for full observability)

### Supabase

| Secret | Value | How to get |
|--------|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase dashboard → Settings → API |
| `SUPABASE_ACCESS_TOKEN` | Personal access token | [app.supabase.com/account/tokens](https://app.supabase.com/account/tokens) |
| `SUPABASE_PROJECT_ID` | Project ref ID | Supabase dashboard → Settings → General |

### PostHog

| Secret | Value | How to get |
|--------|-------|-----------|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | PostHog → Project Settings → Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://app.posthog.com` | Default unless self-hosted |

### Sentry

| Secret | Value | How to get |
|--------|-------|-----------|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxx@oyyy.ingest.sentry.io/zzz` | Sentry → Project Settings → Client Keys |
| `SENTRY_AUTH_TOKEN` | Auth token | [sentry.io/settings/account/api/auth-tokens](https://sentry.io/settings/account/api/auth-tokens) |
| `SENTRY_ORG` | Your Sentry org slug | Sentry → Organization Settings |

### Lighthouse CI (optional)

| Secret | Value | How to get |
|--------|-------|-----------|
| `LHCI_GITHUB_APP_TOKEN` | GitHub app token | [github.com/apps/lighthouse-ci](https://github.com/apps/lighthouse-ci) |

---

## Environments

Configure GitHub environments for deployment gates:

1. **production** — requires manual approval + Vercel secrets
   - Go to Settings → Environments → New environment → "production"
   - Add required reviewers (optional)
   - Add environment secrets (Vercel, Supabase, PostHog, Sentry)

---

## Secret Rotation Policy

| Secret | Rotation frequency |
|--------|-------------------|
| `VERCEL_ACCESS_TOKEN` | Every 90 days |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | On compromise only (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Every 30 days if used |
| `SENTRY_AUTH_TOKEN` | Every 90 days |
| `NEXT_PUBLIC_POSTHOG_KEY` | On compromise only (safe to expose) |

---

## Secrets That Must NEVER Be in Code

| Secret | Risk if exposed |
|--------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Full database access, bypasses RLS |
| `SENTRY_AUTH_TOKEN` | Can delete Sentry data |
| `VERCEL_ACCESS_TOKEN` | Can deploy/delete all Vercel projects |
| Any private API key | Varies |

These must ONLY be in:
- GitHub Secrets (server-side workflows)
- Vercel Environment Variables (server-side only)
- Local `.env.local` (gitignored)

**Never in `.env.example`, commit history, PR descriptions, or issue comments.**
