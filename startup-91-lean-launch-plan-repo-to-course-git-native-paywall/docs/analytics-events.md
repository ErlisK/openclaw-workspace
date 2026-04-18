# TeachRepo — Analytics Event Specification

**Version:** 1.0  
**Last updated:** 2025-04  
**Instrumentation:** Custom events stored in `analytics_events` table (Supabase) + optional Posthog/Plausible passthrough

---

## Event Schema

Every event follows this base structure:

```typescript
interface AnalyticsEvent {
  event_name: string;       // Snake_case event identifier
  user_id?: string;         // Supabase auth user ID (null if anonymous)
  course_id?: string;       // UUID of relevant course
  lesson_id?: string;       // UUID of relevant lesson
  properties: Record<string, any>;  // Event-specific properties
  created_at: string;       // ISO 8601 timestamp
  session_id?: string;      // Browser session identifier
  ip_hash?: string;         // Hashed IP for dedup (never raw IP)
}
```

---

## Events

### `onboarding_started`

**Trigger:** User visits `/dashboard/new` or runs `teachrepo init` for the first time  
**Validates:** H1 (adoption funnel start)

| Property | Type | Description |
|----------|------|-------------|
| `source` | `"web" \| "cli"` | How they started onboarding |
| `referrer` | `string` | HTTP referrer or UTM source |
| `affiliate_ref` | `string \| null` | Affiliate code if present |

---

### `onboarding_completed`

**Trigger:** First course is published (first `course_published` for a user)  
**Validates:** H1 (onboarding completion rate, time-to-publish)

| Property | Type | Description |
|----------|------|-------------|
| `source` | `"web" \| "cli"` | How they completed onboarding |
| `duration_seconds` | `number` | Seconds from `onboarding_started` to this event |
| `num_lessons` | `number` | Number of lessons in first published course |
| `has_quiz` | `boolean` | Whether any lessons have quizzes |
| `has_price` | `boolean` | Whether course has a price set |

**Key metric:** `duration_seconds` median — must be ≤900 (15 minutes) to validate H1.

---

### `course_created`

**Trigger:** Creator creates a new course record (may not yet be published)  
**Validates:** H1 (adoption), H2 (import method distribution)

| Property | Type | Description |
|----------|------|-------------|
| `source` | `"github_url" \| "local_upload" \| "manual"` | How the course was created |
| `repo_url` | `string \| null` | GitHub repo URL if imported |
| `num_lessons_detected` | `number` | Markdown files found during import |
| `has_existing_quizzes` | `boolean` | Frontmatter quizzes found in source |

---

### `course_published`

**Trigger:** Creator publishes a course (sets `published = true`)  
**Validates:** H1 (adoption), H3 (quiz adoption rate)

| Property | Type | Description |
|----------|------|-------------|
| `num_lessons` | `number` | Total lesson count |
| `num_quiz_questions` | `number` | Total quiz questions across all lessons |
| `has_price` | `boolean` | Whether the course is paid |
| `price_cents` | `number \| null` | Price in cents (null if free) |
| `has_affiliates_enabled` | `boolean` | Affiliate tracking enabled |
| `version` | `string` | Course version from course.config.yaml |
| `is_first_publish` | `boolean` | True if this is the creator's first course |

---

### `lesson_viewed`

**Trigger:** Enrolled student (or preview visitor) opens a lesson page  
**Validates:** H4 (post-purchase engagement — do students actually use what they paid for?)

| Property | Type | Description |
|----------|------|-------------|
| `lesson_slug` | `string` | Lesson identifier |
| `lesson_order` | `number` | Position in course |
| `is_preview` | `boolean` | Whether this is a free preview lesson |
| `is_enrolled` | `boolean` | Whether viewer is enrolled |
| `referrer` | `string` | HTTP referrer |
| `time_on_page_seconds` | `number` | Time spent (tracked on page exit) |

---

### `quiz_attempted`

**Trigger:** Student submits answers to a lesson quiz  
**Validates:** H3 (quiz engagement), H6 (AI vs manual quiz quality)

| Property | Type | Description |
|----------|------|-------------|
| `lesson_slug` | `string` | Lesson with the quiz |
| `num_questions` | `number` | Total questions in quiz |
| `num_correct` | `number` | Correct answers |
| `score_pct` | `number` | Score as percentage (0–100) |
| `passed` | `boolean` | Whether score ≥ pass threshold |
| `quiz_source` | `"manual" \| "ai_generated"` | How the quiz was created |
| `attempt_number` | `number` | Which attempt (1 = first try) |

---

### `quiz_passed`

**Trigger:** Student passes a lesson quiz (score ≥ threshold)  
**Validates:** H3 (quiz completion rates)

| Property | Type | Description |
|----------|------|-------------|
| `lesson_slug` | `string` | Lesson with the quiz |
| `score_pct` | `number` | Passing score |
| `attempt_number` | `number` | Which attempt they passed on |
| `quiz_source` | `"manual" \| "ai_generated"` | Quiz authoring source |

---

### `checkout_initiated`

**Trigger:** Student clicks "Enroll" / "Buy Now" button — Stripe Checkout session created  
**Validates:** H4 (payment funnel entry)

| Property | Type | Description |
|----------|------|-------------|
| `price_cents` | `number` | Course price |
| `currency` | `string` | e.g., `"usd"` |
| `stripe_session_id` | `string` | Stripe Checkout session ID |
| `affiliate_ref` | `string \| null` | Affiliate code if attributed |
| `source_page` | `"course_landing" \| "lesson_gate" \| "dashboard"` | Where checkout was triggered |

---

### `checkout_completed`

**Trigger:** Stripe `checkout.session.completed` webhook received and processed  
**Validates:** H4 (payment conversion), H5 (affiliate attribution)

| Property | Type | Description |
|----------|------|-------------|
| `price_cents` | `number` | Amount paid |
| `currency` | `string` | Currency |
| `stripe_session_id` | `string` | Stripe session ID |
| `affiliate_id` | `string \| null` | Affiliate attributed to this sale |
| `affiliate_commission_cents` | `number \| null` | Commission earned (if affiliate) |
| `payment_method_type` | `string` | e.g., `"card"` |

---

### `entitlement_granted`

**Trigger:** Enrollment record created in DB after payment webhook  
**Validates:** H4 (entitlement latency — must be <5 seconds)

| Property | Type | Description |
|----------|------|-------------|
| `stripe_session_id` | `string` | Stripe session ID |
| `latency_ms` | `number` | ms from checkout_completed to this event |
| `method` | `"webhook" \| "manual"` | How entitlement was granted |

**Critical metric:** `latency_ms` p95 must be <5000ms to validate H4.

---

### `affiliate_link_clicked`

**Trigger:** User visits a course URL with `?ref=<code>` parameter  
**Validates:** H5 (affiliate traffic volume)

| Property | Type | Description |
|----------|------|-------------|
| `affiliate_code` | `string` | The ref= value |
| `referrer_url` | `string` | HTTP referrer |
| `user_agent_type` | `"bot" \| "human"` | Basic bot detection |
| `is_return_visitor` | `boolean` | Has this IP hash visited before? |

---

### `affiliate_conversion`

**Trigger:** A checkout_completed event has a non-null affiliate_id  
**Validates:** H5 (affiliate channel effectiveness)

| Property | Type | Description |
|----------|------|-------------|
| `affiliate_code` | `string` | Affiliate code |
| `days_from_click` | `number` | Days between first click and purchase |
| `commission_cents` | `number` | Commission to be paid out |

---

### `ai_quiz_generated`

**Trigger:** AI "Generate Quiz" button clicked and generation completes  
**Validates:** H6 (AI feature usage)

| Property | Type | Description |
|----------|------|-------------|
| `lesson_slug` | `string` | Which lesson |
| `model` | `string` | AI model used (e.g., `"claude-sonnet-4-6"`) |
| `num_questions_generated` | `number` | How many questions AI returned |
| `generation_ms` | `number` | Time for AI to respond |
| `source` | `"web" \| "cli"` | Where generation was triggered |

---

### `ai_quiz_accepted`

**Trigger:** Creator clicks "Accept" / saves the AI-generated quiz  
**Validates:** H6 (AI quiz quality — accepted = quality was good)

| Property | Type | Description |
|----------|------|-------------|
| `lesson_slug` | `string` | Which lesson |
| `num_questions_kept` | `number` | How many AI questions were saved |
| `num_questions_edited` | `number` | How many were modified before saving |
| `num_questions_deleted` | `number` | How many were discarded |

---

### `ai_quiz_discarded`

**Trigger:** Creator dismisses AI-generated quiz without saving  
**Validates:** H6 (AI quiz quality — discard = quality was poor)

| Property | Type | Description |
|----------|------|-------------|
| `lesson_slug` | `string` | Which lesson |
| `reason` | `"too_generic" \| "incorrect" \| "not_needed" \| "other" \| null` | Optional discard reason (from prompt) |

---

### `sandbox_opened`

**Trigger:** Enrolled student opens a gated code sandbox  
**Validates:** Engagement metric for sandbox feature

| Property | Type | Description |
|----------|------|-------------|
| `sandbox_provider` | `"codesandbox" \| "stackblitz" \| "codepen"` | Sandbox type |
| `lesson_slug` | `string` | Lesson containing the sandbox |
| `is_enrolled` | `boolean` | Should always be true (gate should prevent unenrolled) |

---

## Funnel Definitions

### Onboarding Funnel (H1)
```
visit_landing_page
  → signup
    → onboarding_started
      → course_created
        → course_published  ← success
```

### Purchase Funnel (H4)
```
lesson_viewed (is_preview=true)
  → checkout_initiated
    → checkout_completed
      → entitlement_granted  ← success
        → lesson_viewed (is_enrolled=true)
```

### Affiliate Funnel (H5)
```
affiliate_link_clicked
  → (30-day window)
    → checkout_initiated (with affiliate_ref)
      → checkout_completed
        → affiliate_conversion  ← success
```

### AI Quiz Funnel (H6)
```
ai_quiz_generated
  → ai_quiz_accepted | ai_quiz_discarded
    → quiz_attempted (quiz_source="ai_generated")  ← engagement proof
```

---

## Implementation Notes

1. **Server-side only:** All events are written server-side via Supabase service role — never trust client-reported events for payment/entitlement data.
2. **Anonymous events:** `user_id` can be null for `lesson_viewed`, `affiliate_link_clicked` (pre-signup).
3. **IP hashing:** Never store raw IPs. Use SHA-256(IP + daily_salt) for dedup.
4. **Latency events:** `entitlement_granted.latency_ms` is calculated server-side as `Date.now() - webhook_received_at`.
5. **Passthrough to Posthog:** Optional. Add `NEXT_PUBLIC_POSTHOG_KEY` env var to enable client-side Posthog alongside server-side events.
