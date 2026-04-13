# KidColoring — Event Taxonomy & Funnel Definitions
## Phase 2: Define · Measurement Infrastructure

> This document defines every measurable user action in the KidColoring product. Events are the source of truth for assumption testing, funnel analysis, and product decisions. Schema migration v0 implements these tables in Supabase.

---

## Funnel Architecture

KidColoring's primary conversion funnel has 6 stages. Each stage has a defined entry event, exit event, and measurable conversion rate.

```
┌─────────────────────────────────────────────────────────────┐
│  DISCOVERY        │ Source: SEO / referral / social / paid  │
│  page_view        │ Entry: first website visit              │
├─────────────────────────────────────────────────────────────┤
│  ACTIVATION       │ User starts creating a book             │
│  story_started    │ KPI: % of visitors who start a story    │
├─────────────────────────────────────────────────────────────┤
│  GENERATION       │ Story submitted → AI generates pages    │
│  preview_ready    │ KPI: % of story starts that complete    │
├─────────────────────────────────────────────────────────────┤
│  EVALUATION       │ User views preview pages                │
│  preview_viewed   │ KPI: % who view all preview pages       │
├─────────────────────────────────────────────────────────────┤
│  CONVERSION       │ User pays and downloads the PDF         │
│  book_downloaded  │ KPI: % of previews that convert to $    │
├─────────────────────────────────────────────────────────────┤
│  RETENTION        │ User creates a second book              │
│  book_2_started   │ KPI: % of purchasers who return         │
├─────────────────────────────────────────────────────────────┤
│  ADVOCACY         │ User shares a book or refers a friend   │
│  share_triggered  │ KPI: referral K-factor per cohort       │
└─────────────────────────────────────────────────────────────┘
```

---

## Full Event Taxonomy

### Naming Convention
`{entity}_{action}` — past tense, snake_case, no version suffixes

### Section 1: Discovery Events

| Event | Trigger | Properties | Assumption Tested |
|-------|---------|-----------|-------------------|
| `page_viewed` | Any page load | `page`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `session_id` | None (baseline) |
| `homepage_viewed` | Homepage load | `referrer`, `utm_source`, `above_fold_variant` | C1 — COPPA badge conversion |
| `landing_page_viewed` | SEO landing page load | `keyword_slug`, `referrer` | SEO funnel |
| `referral_link_clicked` | Referral URL visited | `referrer_user_id`, `referral_code` | D2 — party pack virality |

### Section 2: Activation Events

| Event | Trigger | Properties | Assumption Tested |
|-------|---------|-----------|-------------------|
| `story_wizard_started` | User clicks "Create book" CTA | `session_id`, `variant` (`wizard`/`blank`), `source_page` | A1 — story wizard |
| `story_field_focused` | User clicks into story input | `field_type`, `session_id` | A1 |
| `child_age_set` | Age slider/input changed | `age_value`, `age_range` | A2 — age calibration |
| `child_name_set` | Name field completed | `has_name: bool` (don't store actual name) | A2 |
| `story_text_entered` | Text field blur with content | `word_count`, `has_character_name: bool`, `has_setting: bool`, `variant` | A1 |
| `story_submitted` | User clicks "Generate" | `word_count`, `age_range`, `variant`, `wizard_steps_completed: int` | A1, B1 |
| `story_abandoned` | Session ends after start, no submit | `last_field_touched`, `time_on_page_s`, `word_count_at_abandon` | A1 |

### Section 3: Generation Events

| Event | Trigger | Properties | Assumption Tested |
|-------|---------|-----------|-------------------|
| `generation_queued` | Story submitted → job created | `job_id`, `story_word_count`, `age_range`, `page_count` | B1 |
| `first_page_ready` | First page image generated | `job_id`, `time_to_first_page_ms`, `page_index: 0` | B1 — 60-second target |
| `generation_completed` | All pages generated | `job_id`, `total_pages`, `total_time_ms`, `quality_score` | B1, B2 |
| `generation_failed` | Job errored or timed out | `job_id`, `error_type`, `page_index_at_failure` | B1 |
| `content_flagged` | Safety classifier triggered | `flag_type`, `severity`, `story_word_count` | C2 — content safety |

### Section 4: Evaluation Events

| Event | Trigger | Properties | Assumption Tested |
|-------|---------|-----------|-------------------|
| `preview_viewed` | Preview page render in viewport | `job_id`, `pages_viewed: int`, `time_on_preview_s` | B1, D1 |
| `preview_page_zoomed` | User zooms/enlarges a preview page | `job_id`, `page_index` | B2 — print quality interest |
| `preview_regenerated` | User clicks "Try again" | `job_id`, `reason_selected` | A3 — character consistency |
| `preview_accepted` | User clicks "Get full book" | `job_id`, `pages_viewed`, `time_on_preview_s` | D1 — pricing conversion |
| `preview_abandoned` | Session ends on preview, no purchase | `job_id`, `pages_viewed`, `time_on_preview_s`, `last_action` | D1 |

### Section 5: Conversion Events

| Event | Trigger | Properties | Assumption Tested |
|-------|---------|-----------|-------------------|
| `checkout_started` | Payment flow initiated | `job_id`, `price_variant`, `product_type` (`single`/`party_pack`/`subscription`) | D1 |
| `checkout_completed` | Payment confirmed | `job_id`, `price_paid`, `product_type`, `payment_method` | D1 |
| `checkout_abandoned` | Payment flow exited without completion | `job_id`, `step_abandoned` (`email`/`payment`/`confirm`), `price_variant` | D1 |
| `book_downloaded` | PDF download link clicked | `job_id`, `book_id`, `page_count`, `file_size_kb` | D1 |
| `subscription_started` | Subscription payment confirmed | `plan` (`monthly`/`annual`), `price`, `referral_code` | D3 |

### Section 6: Retention Events

| Event | Trigger | Properties | Assumption Tested |
|-------|---------|-----------|-------------------|
| `return_visit` | Authenticated user visits after ≥ 24h gap | `user_id`, `days_since_last_visit`, `books_created_total` | D3 |
| `story_started_book_n` | User starts Nth book | `user_id`, `book_number`, `days_since_first_book` | D3 — subscription timing |
| `subscription_prompt_shown` | Upsell modal displayed | `user_id`, `trigger_event` (`post_download`/`start_book_2`), `variant` | D3 |
| `subscription_prompt_dismissed` | Upsell modal closed | `user_id`, `trigger_event`, `variant` | D3 |
| `subscription_cancelled` | Cancellation confirmed | `user_id`, `reason`, `books_created_on_plan` | D3 |

### Section 7: Advocacy Events

| Event | Trigger | Properties | Assumption Tested |
|-------|---------|-----------|-------------------|
| `share_prompt_shown` | Post-download share CTA shown | `user_id`, `book_id`, `channel_options_shown` | D2 |
| `share_triggered` | User clicks share on any platform | `user_id`, `book_id`, `platform` (`whatsapp`/`instagram`/`copy_link`/`email`) | D2 |
| `referral_code_created` | User requests referral link | `user_id`, `referral_code` | D2 |
| `referral_converted` | New user purchases via referral | `referrer_user_id`, `new_user_id`, `referral_code` | D2 — K-factor |

### Section 8: Quality Signal Events

| Event | Trigger | Properties | Assumption Tested |
|-------|---------|-----------|-------------------|
| `satisfaction_rated` | Post-download rating prompt | `user_id`, `book_id`, `rating_1_5`, `free_text_flag` | A2, A3, B2 |
| `print_quality_rated` | Print quality prompt (48h post-download) | `user_id`, `book_id`, `rating_1_5`, `printer_type` | B2 |
| `session_duration_reported` | Optional survey: how long did child color? | `user_id`, `book_id`, `duration_min`, `child_age` | A2 — engagement hypothesis |
| `regeneration_requested` | User contacts support for quality issue | `user_id`, `book_id`, `issue_type` | A3, B2 |

---

## Funnel KPIs (Measurable From Day 1)

| Stage | Primary KPI | Baseline Target | Stretch Target |
|-------|-------------|----------------|----------------|
| Discovery → Activation | Story start rate | 15% of homepage visitors | 25% |
| Activation → Generation | Story submission rate | 70% of story starts | 85% |
| Generation → Evaluation | Preview completion rate | 85% of submissions | 95% |
| Evaluation → Conversion | Preview-to-purchase rate | 20% of previews | 35% |
| Conversion → Retention | 30-day second book rate | 25% of purchasers | 40% |
| Retention → Subscription | Subscription conversion | 8% of single buyers | 15% |
| Any stage → Advocacy | Referral trigger rate | 5% of purchasers | 12% |

---

## Assumption-to-Event Mapping

Cross-reference: each assumption from `pov-hmw.md` mapped to its primary measurement event(s).

| Assumption # | Assumption (short) | Primary Event(s) | Measurement Window |
|-------------|-------------------|------------------|--------------------|
| A-1 | Story wizard > blank field | `story_submitted.word_count` by `variant` | 500 story submissions |
| A-2 | Story-driven = 2× engagement | `session_duration_reported` by book type | 30-day survey, N=200 |
| A-3 | Character consistency = no refund | `preview_regenerated.reason`, `satisfaction_rated` | 200 book deliveries |
| B-1 | First page < 60s at p95 | `first_page_ready.time_to_first_page_ms` | Infrastructure test |
| B-2 | Print quality is top complaint | `print_quality_rated`, `regeneration_requested.issue_type` | 200 print downloads |
| C-1 | COPPA badge lifts conversion | `story_wizard_started` rate by `homepage_variant` | 500 homepage visitors |
| C-2 | Safety filter ≥ 99.5% | `content_flagged` in red-team (offline test) | 200 adversarial prompts |
| D-1 | $9.99 optimal price | `checkout_completed` rate by `price_variant` | 1,000 visitors |
| D-2 | Party pack virality K > 0.2 | `referral_converted` sourced from `party_pack` buyers | 50 party pack orders |
| D-3 | Sub prompt at book 2 > post-1st | `subscription_started` by `trigger_event` variant | 500 subscription prompts |

---

## Retention Cohort Definitions

**Cohort A — Single Book Buyers**  
Users who complete `checkout_completed` with `product_type: single`.  
Primary question: What % create a second book within 30/60/90 days?

**Cohort B — Party Pack Buyers**  
Users who complete `checkout_completed` with `product_type: party_pack`.  
Primary question: What is the referral rate (referrals per buyer) within 30 days?

**Cohort C — Subscribers**  
Users who complete `subscription_started`.  
Primary question: What is month-2 and month-3 retention?

**Cohort D — Teacher Users**  
Users who reach `story_submitted` with `age_range: 5-7` or `6-8` on a Sunday.  
Primary question: What is the Sunday session rate after 4 weeks?

---

## Session Definition

A **session** begins on first `page_viewed` and ends after **30 minutes of inactivity**.  
`session_id` = UUID generated client-side, stored in `localStorage`, passed with every event.  
Sessions bridge across page navigations within the same browser tab.  
A new session begins if the user returns after > 30 min gap.

---

*This taxonomy is implemented in Supabase via `schema_migration_v0.sql`. Event ingestion via API route `/api/events` (POST). All events stored in the `events` table with `user_id` (nullable for anonymous) and `session_id`.*
