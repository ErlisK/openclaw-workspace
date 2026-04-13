# PostHog Funnel Configuration — ClipSpark

## Overview

All funnel events are instrumented and verified sending to PostHog.
Project: Default project (ID: 375773)
Host: https://us.posthog.com

## Main Conversion Funnel (6 steps)

Create this funnel in PostHog UI:
Dashboard → New Insight → Funnels

**Funnel name:** Main Conversion Funnel: Visit → Signup → Upload → Preview → Export → Publish

**Steps:**
| Step | Event | Description | Code Location |
|------|-------|-------------|---------------|
| 1 | `landing_page_viewed` | User visits landing page | `components/LandingTracker.tsx` (useEffect) |
| 2 | `signup` | User completes auth callback | `app/auth/callback/route.ts` (isNewUser check) |
| 3 | `upload_started` | User starts file/URL import | `app/upload/page.tsx` (handleSubmit) |
| 4 | `preview_ready` | **ACTIVATION** — First clip preview appears | `components/JobStatusRealtime.tsx` (previewTracked) |
| 5 | `export_download` | User downloads a clip | `components/ExportPanel.tsx` (download onClick) |
| 6 | `export_completed` | User publishes to YouTube/LinkedIn | `app/api/clips/[id]/publish/*/route.ts` |

**Funnel window:** 30 days
**Conversion type:** First touch
**Filter:** `app = 'clipspark'` (on all events)

---

## Secondary Funnels

### Funnel 2: Upload → First Preview (Processing Funnel)
**Name:** Upload to Activation
| Step | Event | Properties to track |
|------|-------|---------------------|
| 1 | `upload_started` | `mode`, `platform`, `file_size_bytes` |
| 2 | `job_submitted` | `job_id`, `platform`, `clips_requested` |
| 3 | `preview_ready` | `clip_count`, `elapsed_ms` |

**Purpose:** Identify processing drop-off (failed jobs, timeouts)

### Funnel 3: Pricing → Checkout → Payment
**Name:** Monetization Funnel
| Step | Event | Properties to track |
|------|-------|---------------------|
| 1 | `pricing_page_viewed` | — |
| 2 | `checkout_started` | `price_id`, `plan_label` |
| 3 | `checkout_completed` | `mode`, `amount`, `currency` |

**Purpose:** Identify checkout friction

### Funnel 4: Signup → Activation (Onboarding Quality)
**Name:** Signup to Activation Speed
| Step | Event |
|------|-------|
| 1 | `signup` |
| 2 | `upload_started` |
| 3 | `preview_ready` |

**Funnel window:** 7 days (tighter — want fast activation)
**Purpose:** Track if onboarding flow converts new users within a week

---

## Event Properties Reference

### `signup`
```json
{ "email": "user@example.com", "provider": "email|google", "referrer": "..." }
```

### `upload_started` / `url_import_started`
```json
{ "mode": "file|url", "platform": "YouTube Shorts|LinkedIn|...", "clips_requested": 5, "file_size_bytes": 12345678, "file_type": "audio/mp3" }
```

### `upload_completed` / `url_import_completed`
```json
{ "job_id": "uuid", "asset_id": "uuid", "mode": "file|url", "platform": "..." }
```

### `job_submitted`
```json
{ "platform": "YouTube Shorts", "clips_requested": 5, "duration_sec": 3600, "is_alpha": false, "plan": "free" }
```

### `preview_ready` (ACTIVATION EVENT)
```json
{ "job_id": "uuid", "clip_count": 6, "elapsed_ms": 320000 }
```

### `clip_editor_opened`
```json
{ "clip_id": "uuid", "platform": "...", "score": 0.87 }
```

### `clip_approved`
```json
{ "clip_id": "uuid", "score": 0.87, "platform": "YouTube Shorts", "duration_sec": 52 }
```

### `export_download`
```json
{ "clip_id": "uuid", "watermarked": true|false }
```

### `export_completed` (PUBLISH)
```json
{ "platform": "YouTube Shorts|LinkedIn", "provider": "youtube|linkedin", "clip_id": "uuid", "posted_url": "..." }
```

### `checkout_started`
```json
{ "price_id": "price_xxx", "plan_label": "Pro Monthly|Pro Annual" }
```

### `checkout_completed` (SERVER)
```json
{ "mode": "subscription|payment", "amount": 900, "currency": "usd", "customer_id": "cus_xxx" }
```

### `quota_hit`
```json
{ "plan": "free", "clips_used": 5, "clips_quota": 5 }
```

---

## User Identification

On every login/signup, PostHog `$identify` is called with:
```json
{
  "$set": {
    "email": "user@example.com",
    "plan": "free|pro",
    "is_alpha": false,
    "onboarding_done": true,
    "created_at": "2025-01-15T..."
  }
}
```

This enables PostHog to segment funnels by:
- `plan = free` vs `plan = pro`
- `is_alpha = true`
- Cohorts: "Users who signed up this week"

---

## PostHog Funnel Setup (Manual Steps)

Since the PostHog Management API requires a Personal API Key (blocked by MFA), 
funnels must be created manually in the UI.

1. Log in at https://us.posthog.com
2. Navigate to your project → Insights → New Insight
3. Select "Funnels"
4. For each funnel above:
   a. Name it as specified
   b. Add steps in order using event names from the table
   c. Set funnel window to 30 days (or 7 for onboarding)
   d. Save to dashboard

Recommended dashboard layout:
- Row 1: Main conversion funnel (big)
- Row 2: Activation rate trend (line graph: preview_ready / signup × 100)
- Row 3: Upload → Preview funnel + Pricing → Checkout → Paid funnel
- Row 4: Daily active users (DAU) trend

---

## Key Metrics to Monitor (Weekly)

| Metric | Formula | Target |
|--------|---------|--------|
| Signup → Activation rate | preview_ready / signup | ≥ 40% |
| Upload success rate | preview_ready / upload_started | ≥ 80% |
| Activation → Export rate | export_download / preview_ready | ≥ 60% |
| Free → Pro conversion | checkout_completed / signup | ≥ 3% |
| Pricing page → Checkout | checkout_started / pricing_page_viewed | ≥ 20% |

---

## Quota Hit Alert

When a user hits quota, fire:
```typescript
trackServer(userId, 'quota_hit', { plan, clips_used, clips_quota })
```

This is already in `app/api/ingest/route.ts`. 
In PostHog: create an Alert on `quota_hit` events — any spike means free users 
are hitting limits and should be targeted for Pro upgrade emails.
