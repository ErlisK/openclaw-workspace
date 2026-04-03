# KidColoring — Analytics Event Taxonomy
## Phase 2: Define · Full Event Specification

> **Source of truth** for every analytics event emitted by the KidColoring application.  
> Engineers implement events from this doc. Product measures assumptions from this doc.  
> Every event name, property key, and funnel definition in Supabase must match what is written here.

---

## Event Schema

All events are written to the `events` table (view alias: `events_api`):

```sql
events (
  id          bigserial PRIMARY KEY,   -- append-only
  user_id     uuid NULL,               -- NULL for anonymous sessions
  session_id  text NOT NULL,           -- always present; anonymous or auth'd
  event_name  text NOT NULL,           -- snake_case, see taxonomy below
  props       jsonb NOT NULL,          -- event-specific payload (alias: properties)
  ts          timestamptz NOT NULL     -- server timestamp (alias: created_at)
)
```

**Write rules:**
- Written server-side only via `service_role` key — never from the browser
- Idempotent: duplicate events are allowed (de-dup at query time)
- `session_id` is a UUID generated client-side at session start; persisted in `sessionStorage`
- `user_id` is set after auth; back-filled on session if user signs in mid-session

---

## Core Funnel

```
view_landing
    ↓
start_generator
    ↓
story_entered
    ↓
page_generated (×12)
    ↓
paywall_viewed
    ↓
paywall_intent
    ↓
checkout_completed   ← purchase
    ↓
book_exported        ← download
    ↓
share_clicked        ← viral loop
```

---

## Event Catalogue

### 1. `view_landing`

**Stage:** Discovery  
**Trigger:** Landing page (`/`) mounts and is visible for ≥2 seconds  
**Assumption tested:** A-1 (WTP), C-1 (COPPA badge placement)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `referral_code` | string | no | Referral code from URL param `?ref=` |
| `utm_source` | string | no | UTM source if present |
| `utm_medium` | string | no | UTM medium if present |
| `utm_campaign` | string | no | UTM campaign if present |
| `variant` | string | no | A/B variant assigned at session start |
| `is_returning` | boolean | yes | True if session_id seen before |
| `viewport_w` | integer | no | Viewport width bucket (mobile/tablet/desktop) |

**Example:**
```json
{
  "event_name": "view_landing",
  "props": {
    "referral_code": "abc12345",
    "utm_source": "instagram",
    "variant": "coppa_badge_above_fold",
    "is_returning": false,
    "viewport_w": 390
  }
}
```

---

### 2. `start_generator`

**Stage:** Activation  
**Trigger:** User clicks the primary CTA on landing page ("Make a coloring book" / "Try it free")  
**Assumption tested:** A-1 (conversion path entry), C-1 (COPPA badge effect on start rate)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input_variant` | string | yes | `wizard` \| `blank` \| `voice` |
| `coppa_seen` | boolean | yes | Was COPPA badge visible when CTA was clicked? |
| `coppa_badge_variant` | string | no | `above_fold` \| `footer` (A/B experiment) |
| `cta_position` | string | yes | `hero` \| `sticky_nav` \| `mid_page` \| `footer` |
| `time_on_landing_s` | integer | yes | Seconds spent on landing before clicking |

**Example:**
```json
{
  "event_name": "start_generator",
  "props": {
    "input_variant": "wizard",
    "coppa_seen": true,
    "coppa_badge_variant": "above_fold",
    "cta_position": "hero",
    "time_on_landing_s": 14
  }
}
```

**Funnel metric:** `start_generator / view_landing` = **Activation Rate**  
**Baseline target:** ≥ 35% of landing views activate

---

### 3. `story_entered`

**Stage:** Activation → Generation  
**Trigger:** User submits their story (wizard complete + confirm, or text submit, or voice confirm)  
**Assumption tested:** A-4 (wizard > blank prompt quality), A-3 (age/complexity calibration)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `input_variant` | string | yes | `wizard` \| `blank` \| `voice` |
| `word_count` | integer | yes | Word count of the assembled `raw_text` |
| `character_count` | integer | yes | Number of characters in the prompt |
| `age_range` | string | no | `2-4` \| `4-6` \| `6-8` \| `8-11` \| `11-13` |
| `child_age` | integer | no | Child's age in years |
| `wizard_character_count` | integer | no | Number of characters selected in wizard |
| `wizard_setting` | string | no | Setting selected in wizard |
| `wizard_action` | string | no | Action selected in wizard |
| `has_hero_name` | boolean | no | Did user enter a hero name? |
| `safety_passed` | boolean | yes | Result of Layer 1 safety filter |
| `safety_score` | number | no | Highest category safety score (0–1) |
| `story_id` | string | yes | UUID of created `stories` row |

**Example:**
```json
{
  "event_name": "story_entered",
  "props": {
    "input_variant": "wizard",
    "word_count": 47,
    "character_count": 248,
    "age_range": "4-6",
    "child_age": 5,
    "wizard_character_count": 2,
    "wizard_setting": "space",
    "wizard_action": "explore",
    "has_hero_name": true,
    "safety_passed": true,
    "safety_score": 0.004,
    "story_id": "uuid-here"
  }
}
```

**Funnel metric:** `story_entered / start_generator` = **Story Completion Rate**  
**Baseline target:** ≥ 70%

---

### 4. `page_generated`

**Stage:** Generation  
**Trigger:** Each individual coloring page image is successfully written to `pages` table  
**Assumption tested:** B-1 (generation speed at p95), A-3 (character consistency per page)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `page_index` | integer | yes | 0-based page position in book |
| `generation_ms` | integer | yes | Time from page job dispatch to image received (ms) |
| `model_id` | string | yes | AI model identifier |
| `model_version` | string | no | Model checkpoint hash |
| `quality_score` | number | no | Per-page quality classifier score (0–1) |
| `is_cover` | boolean | yes | True for page_index=0 |
| `is_preview` | boolean | yes | True for page_index ∈ {0,1} |
| `total_pages` | integer | yes | Total pages in this book |
| `book_id` | string | yes | UUID of book |
| `generation_job_id` | string | yes | UUID of generation_job |
| `safety_approved` | boolean | yes | Layer 3 (output image) result |

**Example:**
```json
{
  "event_name": "page_generated",
  "props": {
    "page_index": 0,
    "generation_ms": 18400,
    "model_id": "stability-ai/sdxl",
    "quality_score": 0.87,
    "is_cover": true,
    "is_preview": true,
    "total_pages": 12,
    "book_id": "uuid-here",
    "generation_job_id": "uuid-here",
    "safety_approved": true
  }
}
```

**Funnel metric:** `page_generated(page_index=0) / story_entered` = **First Page Rate**  
**p95 target:** first page ≤ 60,000 ms

---

### 5. `book_exported`

**Stage:** Delivery  
**Trigger:** User downloads or receives their PDF coloring book  
**Assumption tested:** B-2 (print quality), D-1 (delivery satisfaction)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `book_id` | string | yes | UUID of book |
| `page_count` | integer | yes | Number of pages in PDF |
| `product_type` | string | yes | `single` \| `party_pack` \| `subscription_book` |
| `pdf_size_bytes` | integer | no | PDF file size in bytes |
| `delivery_method` | string | yes | `download` \| `email` |
| `price_paid_cents` | integer | no | Price paid (0 for free first book) |
| `generation_ms` | integer | no | Total book generation time |
| `time_to_export_s` | integer | no | Seconds from `checkout_completed` to export click |

**Example:**
```json
{
  "event_name": "book_exported",
  "props": {
    "book_id": "uuid-here",
    "page_count": 12,
    "product_type": "single",
    "pdf_size_bytes": 4823041,
    "delivery_method": "download",
    "price_paid_cents": 999,
    "generation_ms": 214000,
    "time_to_export_s": 8
  }
}
```

**Funnel metric:** `book_exported / checkout_completed` = **Delivery Rate**  
**Baseline target:** ≥ 95%

---

### 6. `share_clicked`

**Stage:** Advocacy / Viral  
**Trigger:** User clicks any share button (post-download prompt, preview share, account page)  
**Assumption tested:** D-2 (party pack K-factor), referral viral loop

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `share_surface` | string | yes | `post_download` \| `preview` \| `account` \| `party_pack_upsell` |
| `channel` | string | yes | `whatsapp` \| `instagram` \| `facebook` \| `link_copy` \| `email` \| `sms` |
| `referral_code` | string | yes | The referral code attached to this share |
| `book_id` | string | no | Which book is being shared |
| `product_type` | string | no | `single` \| `party_pack` |
| `has_preview_image` | boolean | no | Did the share include a coloring page preview image? |

**Example:**
```json
{
  "event_name": "share_clicked",
  "props": {
    "share_surface": "post_download",
    "channel": "whatsapp",
    "referral_code": "abc12345",
    "book_id": "uuid-here",
    "product_type": "single",
    "has_preview_image": true
  }
}
```

**Funnel metric:** `share_clicked / book_exported` = **Share Rate**  
**K-factor formula:** `referral_conversions / share_clicked_count`  
**Baseline target:** ≥ 15% of exports trigger a share click

---

### 7. `paywall_viewed`

**Stage:** Conversion  
**Trigger:** User sees the checkout / pricing page (after preview, before payment)  
**Assumption tested:** D-1 (pricing), A/B experiment: `pricing_v1`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `price_variant` | string | yes | `low_799` \| `mid_999` \| `high_1299` |
| `price_cents` | integer | yes | Shown price in cents |
| `product_type` | string | yes | `single` \| `party_pack` \| `subscription` |
| `trigger` | string | yes | `preview_cta` \| `export_click` \| `share_prompt` \| `upsell_banner` |
| `book_id` | string | no | Which book triggered this paywall |
| `pages_previewed` | integer | no | How many preview pages were seen before paywall |
| `time_in_preview_s` | integer | no | Seconds in preview before paywall triggered |

**Example:**
```json
{
  "event_name": "paywall_viewed",
  "props": {
    "price_variant": "mid_999",
    "price_cents": 999,
    "product_type": "single",
    "trigger": "preview_cta",
    "book_id": "uuid-here",
    "pages_previewed": 2,
    "time_in_preview_s": 34
  }
}
```

**Funnel metric:** `paywall_viewed / page_generated(is_preview=true, page_index=1)` = **Preview→Paywall Rate**  
**Baseline target:** ≥ 60%

---

### 8. `paywall_intent`

**Stage:** Conversion  
**Trigger:** User signals purchase intent within the checkout flow (clicks Pay, starts Stripe, applies promo)  
**Assumption tested:** D-1 (pricing framing), conversion rate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `price_variant` | string | yes | A/B variant shown |
| `price_cents` | integer | yes | Price in cents |
| `product_type` | string | yes | `single` \| `party_pack` \| `subscription` |
| `intent_type` | string | yes | `checkout_started` \| `card_added` \| `promo_applied` \| `pay_clicked` |
| `referral_code` | string | no | If applied at checkout |
| `discount_pct` | integer | no | Discount % if promo was applied |
| `book_id` | string | no | |

**Example:**
```json
{
  "event_name": "paywall_intent",
  "props": {
    "price_variant": "mid_999",
    "price_cents": 999,
    "product_type": "single",
    "intent_type": "pay_clicked",
    "book_id": "uuid-here"
  }
}
```

**Funnel metric:** `paywall_intent / paywall_viewed` = **Intent Rate**  
**Baseline target:** ≥ 45% (measures price friction)

---

## Extended Event Catalogue

These events complete the full funnel and assumption coverage:

| Event Name | Stage | Trigger | Primary Assumption |
|-----------|-------|---------|-------------------|
| `checkout_completed` | Conversion | Stripe webhook: payment_intent.succeeded | A-1 WTP |
| `checkout_abandoned` | Conversion | User leaves paywall without completing | A-1 WTP |
| `preview_viewed` | Evaluation | User swipes/scrolls preview pages | D-1 Preview quality |
| `preview_swiped` | Evaluation | Swipe to additional preview page | D-1 Preview depth |
| `generation_started` | Generation | `generation_jobs` status → dispatched | B-1 Speed |
| `generation_completed` | Generation | `generation_jobs` status → complete | B-1 Speed, cost |
| `generation_failed` | Generation | `generation_jobs` status → failed | B-1 Reliability |
| `safety_input_blocked` | Safety | Layer 1 classifier: blocked | C-2 Safety |
| `safety_output_flagged` | Safety | Layer 3 classifier: flagged | C-2 Safety |
| `safety_output_approved` | Safety | Layer 3 classifier: approved | C-2 Safety |
| `coppa_gate_shown` | Safety | Child UI loaded without parent auth | C-1 COPPA |
| `coppa_consent_shown` | Activation | COPPA modal displayed | C-1 COPPA |
| `coppa_consent_given` | Activation | Parent ticks COPPA checkbox | C-1 COPPA |
| `satisfaction_rated` | Retention | Post-delivery rating submitted | A-2, A-3, B-2 |
| `subscription_started` | Retention | Subscription activated | D-3 Sub conversion |
| `subscription_cancelled` | Retention | Subscription cancelled | D-3 Churn |
| `referral_clicked` | Advocacy | Referral link visited | D-2 K-factor |
| `referral_converted` | Advocacy | Referral resulted in purchase | D-2 K-factor |
| `story_text_purged` | Compliance | 90-day cron purges raw_text | G-9 Retention |
| `account_deletion_requested` | Compliance | Parent requests account delete | G-4 Deletion |
| `account_deleted_hard` | Compliance | Hard delete executed by cron | G-4 Deletion |

---

## Funnel Definitions

Funnels are stored in the `funnels` table as JSONB definitions. The funnel query engine reads these definitions and computes step conversion rates from the `events` table.

### Funnel 1: Core Conversion

```json
{
  "name": "core_conversion",
  "description": "Full funnel from first visit to PDF export",
  "steps": [
    {"event": "view_landing",      "label": "Discovery"},
    {"event": "start_generator",   "label": "Activated"},
    {"event": "story_entered",     "label": "Story Submitted"},
    {"event": "page_generated",    "label": "First Page Generated",
     "filter": {"page_index": 0}},
    {"event": "paywall_viewed",    "label": "Paywall Seen"},
    {"event": "paywall_intent",    "label": "Intent Shown"},
    {"event": "checkout_completed","label": "Purchased"},
    {"event": "book_exported",     "label": "PDF Downloaded"}
  ],
  "session_window_hours": 24
}
```

### Funnel 2: Activation Only

```json
{
  "name": "activation",
  "description": "From first visit to first page generated",
  "steps": [
    {"event": "view_landing",    "label": "Visited"},
    {"event": "start_generator", "label": "Started"},
    {"event": "story_entered",   "label": "Story Entered"},
    {"event": "page_generated",  "label": "Page 1 Generated", "filter": {"page_index": 0}}
  ],
  "session_window_hours": 2
}
```

### Funnel 3: Viral / Referral

```json
{
  "name": "viral_referral",
  "description": "From export to referred purchase — K-factor measurement",
  "steps": [
    {"event": "book_exported",      "label": "Exported Book"},
    {"event": "share_clicked",      "label": "Shared"},
    {"event": "referral_clicked",   "label": "Referral Opened"},
    {"event": "view_landing",       "label": "Referral Landed"},
    {"event": "checkout_completed", "label": "Referral Purchased"}
  ],
  "session_window_hours": 720
}
```

### Funnel 4: Subscription Conversion

```json
{
  "name": "subscription_conversion",
  "description": "From purchase to subscription (D-3 assumption test)",
  "steps": [
    {"event": "checkout_completed",  "label": "First Purchase"},
    {"event": "book_exported",       "label": "PDF Downloaded"},
    {"event": "paywall_viewed",      "label": "Paywall Seen Again",
     "filter": {"product_type": "subscription"}},
    {"event": "subscription_started","label": "Subscribed"}
  ],
  "session_window_hours": 720
}
```

### Funnel 5: COPPA + Safety Gate

```json
{
  "name": "coppa_safety_gate",
  "description": "Compliance events — should have zero blocks at Layer 3",
  "steps": [
    {"event": "coppa_consent_shown", "label": "COPPA Shown"},
    {"event": "coppa_consent_given", "label": "COPPA Agreed"},
    {"event": "story_entered",       "label": "Story Submitted"},
    {"event": "safety_output_approved","label": "Safety Approved"}
  ],
  "session_window_hours": 1
}
```

---

## Funnel KPIs with Targets

| Funnel | Step | Metric | Baseline | Stretch |
|--------|------|--------|----------|---------|
| Core | view_landing → start_generator | Activation Rate | 35% | 50% |
| Core | start_generator → story_entered | Story Completion | 70% | 85% |
| Core | story_entered → page_generated[0] | First Page Rate | 95% | 99% |
| Core | page_generated[1] → paywall_viewed | Preview→Paywall | 60% | 75% |
| Core | paywall_viewed → paywall_intent | Intent Rate | 45% | 60% |
| Core | paywall_intent → checkout_completed | Close Rate | 70% | 85% |
| Core | checkout_completed → book_exported | Delivery Rate | 95% | 99% |
| Viral | book_exported → share_clicked | Share Rate | 15% | 30% |
| Viral | share_clicked → referral_converted | Referral CVR | 10% | 20% |
| Sub | book_exported → subscription_started | Sub Conversion | 8% | 15% |

---

## Implementation Notes

### TypeScript Client (src/lib/analytics.ts)

```typescript
// Server-side only — never import in client components
import { createClient } from '@supabase/supabase-js'

type EventName =
  | 'view_landing' | 'start_generator' | 'story_entered'
  | 'page_generated' | 'book_exported' | 'share_clicked'
  | 'paywall_viewed' | 'paywall_intent' | 'checkout_completed'
  | 'checkout_abandoned' | 'preview_viewed' | 'generation_started'
  | 'generation_completed' | 'generation_failed' | 'safety_input_blocked'
  | 'safety_output_flagged' | 'safety_output_approved' | 'coppa_gate_shown'
  | 'coppa_consent_shown' | 'coppa_consent_given' | 'satisfaction_rated'
  | 'subscription_started' | 'subscription_cancelled'
  | 'referral_clicked' | 'referral_converted'
  | 'story_text_purged' | 'account_deletion_requested' | 'account_deleted_hard'

async function track(
  event_name: EventName,
  session_id: string,
  props: Record<string, unknown>,
  user_id?: string
): Promise<void>
```

### Property Validation Rules

- All `*_id` properties must be valid UUIDs
- `price_cents` must be a positive integer
- `generation_ms` must be a positive integer
- `safety_score` must be between 0 and 1
- `quality_score` must be between 0 and 1
- `word_count` must be ≥ 0

### Session ID Generation

```typescript
function getOrCreateSessionId(): string {
  const key = 'kc_session_id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}
```

---

*Linked to: domain-model.md (events table), event-taxonomy.md (Phase 2), guardrails.md (G-02, G-07), pov-hmw.md (assumptions A-1 through E-1)*  
*Schema: events table (v0.1.0), funnels table (v1.1.0)*
