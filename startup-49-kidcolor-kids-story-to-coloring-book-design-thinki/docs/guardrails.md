# KidColoring — Product Guardrails
## Phase 2: Define · Safety, Privacy, and Compliance Constraints

> These are **non-negotiable product constraints**, not design preferences.  
> Every feature shipped in Phase 3 (Prototype) and beyond must be evaluated against these guardrails before merging.  
> Violation of any Tier 1 guardrail is a blocker — do not ship.

---

## Tier 1 — Absolute (Never Violate)

These constraints are legally required, existentially critical, or both.  
They are not adjustable without legal review.

### G-01 · Parent-Owned Accounts Only

**Rule:** Children never create accounts. Children never authenticate. Children never provide any personal information directly to the system.

**Rationale:**  
COPPA (Children's Online Privacy Protection Act) requires verifiable parental consent before collecting any personal information from a child under 13. The safest COPPA path is: *do not collect child information at all* — let parents manage everything on the child's behalf.

**Implementation:**
- Auth system: `auth.users` holds parent/teacher accounts only
- Child data (nickname, age) stored in `children` table with `parent_id` FK — *created by the parent*
- No login screen, email field, or account creation flow is ever shown to a child
- The kid-facing UI (story input + coloring preview) runs in a **guest/anonymous session** under the parent's account
- `profiles.role` CHECK constraint enforces `'parent' | 'teacher' | 'admin'` — no `'child'` role

**Audit event:** `coppa_gate_shown` — emitted whenever a parent account is required and not present

**Test:** Red-team audit: attempt to create a child account via any UI path, API endpoint, or direct Supabase RPC

---

### G-02 · Strict Data Minimization

**Rule:** Collect only the minimum data necessary for the product to function. Default to collecting less, not more.

**What we collect (explicit allowlist):**

| Data | Where Stored | Why | Retention |
|------|-------------|-----|-----------|
| Parent email | `auth.users` (Supabase Auth) | Authentication, delivery | Until account deletion |
| Parent display name | `profiles.display_name` | Optional personalization | Until account deletion |
| COPPA consent timestamp | `profiles.coppa_agreed_at` | Legal record | 7 years (legal minimum) |
| Child nickname | `children.nickname` | Personalizes the book cover | Until parent deletes |
| Child age (integer, not DOB) | `children.age_years` | Line complexity calibration | Until parent deletes |
| Child interests (text array) | `children.interests` | Story suggestions (optional) | Until parent deletes |
| Story text (raw prompt) | `stories.raw_text` | Required for generation | 90 days post-delivery, then deleted |
| Session ID (random UUID) | `events.session_id` | Analytics, de-identified | 90 days |
| Purchase record | `books` table | Financial/delivery requirement | 7 years (legal minimum) |

**What we explicitly do NOT collect:**
- Child's real name (nickname only, chosen by parent)
- Child's date of birth (integer age only)
- Child's photograph or voice recording (even if voice input used — transcription only, raw audio discarded immediately)
- Child's IP address linked to child identity
- Behavioral tracking tied to a child identifier
- Any data about children's activity beyond the anonymous session

**Implementation:**
- `stories.raw_text` column: scheduled deletion job at 90 days post `books.delivered_at`
- No analytics events ever contain child PII — `events.properties` is audited by a pre-write validator
- `events` table: `user_id` is the *parent* UUID, never a child identifier

---

### G-03 · Kid-Facing UI Requires Zero Reading Ability

**Rule:** The kid-facing story input screen and coloring preview must be fully usable by a child who cannot read.

**Rationale:**  
Target age range includes 3–7 year olds. Many 4-year-olds have pre-reading emergent literacy. If a child cannot use the product independently because it requires reading, we've failed the core use case (self-authored coloring books).

**Requirements:**

| Component | No-Reading Implementation |
|-----------|--------------------------|
| Story input (primary) | 4-step guided wizard using large illustrated emoji/icons — tapping, not typing |
| Story input (secondary) | Voice input option: child speaks, app transcribes — no keyboard |
| Character selection | Grid of illustrated character types (dinosaur, princess, robot, etc.) — icons only |
| Setting selection | Illustrated scene cards (forest, space, ocean, castle) — icons only |
| Action selection | Animated motion icons (running, flying, eating, sleeping) — icons only |
| "Create my book" button | Large, colorful button with icon (✨ or 🎨) + optional audio label |
| Progress screen | Animated illustration only (no "Generating..." text) |
| Preview screen | Large image-first layout — no text labels required to understand content |

**Accessibility additions:**
- Tap any element → plays audio description (Web Speech API or short MP3s)
- Font size ≥ 24px for any text that does appear
- Color is never the sole indicator of state
- Touch targets ≥ 48×48px on all interactive elements

**Constraint on parent/teacher UI:** Does NOT apply — parent UI can and should use text freely.

**Test:** Usability test with 5 children aged 4–7 who complete the story creation flow without parent help and without reading any text.

---

### G-04 · Explicit Account + Data Deletion Flows

**Rule:** A parent must be able to permanently delete their account and all associated data in three taps or fewer, from within the app, at any time.

**Rationale:**  
COPPA requires operators to allow parents to delete child information at any time. GDPR (if any EU users) requires "right to erasure." California Consumer Privacy Act (CCPA) requires deletion on request. Being easy about deletion also builds trust that generates conversion.

**Deletion flow specification:**

#### Flow 1: Delete a child profile
```
Settings → Child profiles → [Child name] → Delete child
→ Confirmation modal: "Delete [Nickname]'s profile and all their books?"
→ Confirm → Soft-delete (30-day grace)
→ Day 30: Hard delete: children row, associated stories, books, pages, satisfaction_ratings
```
Events emitted: `child_profile_deleted`, `deletion_scheduled`

#### Flow 2: Delete account
```
Settings → Account → Delete account
→ Show data summary: "This will permanently delete your account, [N] children's profiles, and [N] books."
→ Type "DELETE" to confirm (prevents accidental tap)
→ Confirm → Soft-delete all records linked to user_id (30-day grace)
→ Email confirmation sent: "Your account will be permanently deleted on [date]"
→ Day 30: Hard delete entire account cascade
→ Day 30 audit event: account_deleted_hard
```
Events emitted: `account_deletion_requested`, `account_deletion_email_sent`, `account_deleted_hard`

#### Flow 3: Delete a single book
```
My Books → [Book] → ⋮ menu → Delete
→ Confirmation: "Delete [Story title] forever?"
→ Confirm → Immediate hard delete (book + pages)
→ PDF link invalidated
```
Events emitted: `book_deleted`

#### Flow 4: Cancel deletion (grace period)
```
Email link "Cancel deletion" → Session validates token → deletion_cancelled event
→ Account restored to active status
```

**Implementation:**
- `deleted_at timestamptz` column added to `profiles`, `children`, `books` tables via migration v0.2
- Nightly cron job (`pg_cron` or Vercel cron): hard-deletes all rows where `deleted_at < now() - interval '30 days'`
- `stories.raw_text` cleared (set to `[deleted]`) on child profile deletion; story row retained for analytics integrity
- All deletion events written to `events` table *before* the cascade — these are the legal audit trail
- `auth.users` deletion: called last via Supabase admin client, after all child data is purged

**Test:** Walk through all 4 deletion flows against the production schema; verify cascade with `SELECT COUNT(*)` on each table after hard delete.

---

## Tier 2 — Strong Preferences (Require Exception Process to Override)

These are strong design and ethical commitments that can be revisited with explicit stakeholder sign-off.

### G-05 · No Behavioral Advertising or Data Selling

**Rule:** User data is never sold, licensed, or used for behavioral advertising targeting.

**Implementation:** `events` table data is used solely for product analytics (funnel measurement, A/B tests). No third-party analytics pixels. No Google Ads remarketing tags. No Facebook/Meta pixel on any page where child content is created or previewed.

**Permitted analytics tools:** First-party only (Supabase events table + our own dashboards).

---

### G-06 · No Dark Patterns in Subscription Flows

**Rule:** Subscription cancellation must be as easy as subscription sign-up (same number of steps, same UI prominence).

**Patterns explicitly banned:**
- Hiding cancel behind a support email or chat
- "Are you sure?" loops more than once
- Pre-checked renewal checkboxes
- Making free tier features disappear immediately on cancellation (use grace period)

---

### G-07 · AI Output Safety — Three-Layer Defense

**Rule:** Three independent safety checks must pass before any generated image is shown to a child.

**Layer 1 — Input text filter** (pre-generation):  
OpenAI Moderation API on `stories.raw_text`. If `safety_passed = false`, story is rejected with a friendly error; no generation job is queued.

**Layer 2 — Prompt sanitization** (during generation):  
System prompt wraps user story in strict coloring-book context: "black and white coloring page, age-appropriate, no violence, no adult content, simple line art."

**Layer 3 — Output image classifier** (post-generation):  
Every generated page passes through a content classifier (Google Vision SafeSearch or equivalent) before `pages.image_url` is written. If confidence < 99.5%, page is flagged for human review; book status set to `'failed'`; parent notified; full refund issued.

**Events:** `safety_input_blocked`, `safety_output_flagged`, `safety_output_approved`

**Metric:** `safety_output_approved / (safety_output_approved + safety_output_flagged)` ≥ 99.5%

---

### G-08 · Transparent AI Disclosure

**Rule:** Parents are told clearly at sign-up and at each book creation that content is AI-generated.

**Implementation:**  
- COPPA consent modal (step 2 of sign-up) includes: "KidColoring uses AI to generate coloring pages. AI can occasionally make mistakes. All content is filtered for age-appropriateness."
- Footer of every generated preview: "AI-generated · Reviewed for age-appropriateness"
- Privacy policy section "How we use AI" is required before COPPA consent is recorded

---

### G-09 · Story Text Deleted After 90 Days

**Rule:** `stories.raw_text` is deleted (set to NULL or `[deleted]`) 90 days after `books.delivered_at`.

**Rationale:** Story text may contain child preferences, interests, or family details the parent shared casually. Retaining it indefinitely creates unnecessary privacy risk.

**Implementation:**  
Vercel cron route (`/api/cron/story-cleanup`) running nightly, deletes `raw_text` on stories where the linked book was delivered more than 90 days ago.

---

### G-10 · Print-Only Delivery by Default

**Rule:** The default delivery mode is a PDF file sent to the parent for home printing. No persistent child-accessible cloud storage of completed books.

**Rationale:** Child coloring activity is ephemeral. Storing the finished book in a child-accessible cloud folder creates ongoing data residency without clear value to offset the risk.

**Exception:** Parent may explicitly opt in to "save to My Books" during checkout. This creates a retrievable download link accessible only to the authenticated parent.

---

## Tier 3 — Aspirational (Build When Resources Allow)

| Guardrail | Description | Target |
|-----------|-------------|--------|
| G-11 | iKeepSafe COPPA Safe Harbor certification | Pre-school distribution |
| G-12 | FERPA compliance review for teacher accounts | District-level licensing |
| G-13 | Accessibility audit (WCAG 2.1 AA for kid UI) | 6 months post-launch |
| G-14 | Independent security penetration test | First 500-user milestone |
| G-15 | AI bias audit (character diversity, representation) | 3 months post-launch |

---

## Guardrail-to-Schema Mapping

| Guardrail | Column(s) / Table(s) | Enforcement Mechanism |
|-----------|---------------------|----------------------|
| G-01 Parent-only accounts | `profiles.role` CHECK | Auth middleware; no child auth route |
| G-02 Data minimization | `children` (no DOB, no real name) | Schema constraint; no optional PII fields |
| G-02 Story retention | `stories.raw_text` | Nightly cron sets to NULL after 90d |
| G-04 Deletion | `profiles.deleted_at`, `children.deleted_at` | Cascade delete migration v0.2 |
| G-04 Audit trail | `events` (deletion events) | Append-only; written before cascade |
| G-07 Safety | `stories.safety_passed`, `stories.safety_score` | Pre-generation gate |
| G-07 Safety | `books.status = 'failed'` | Post-generation classifier gate |
| G-08 AI disclosure | `profiles.coppa_agreed` + `coppa_agreed_at` | Cannot create story without consent |
| G-09 Story cleanup | `stories.raw_text` | Nightly cron |

---

## Guardrail-to-Event Mapping

| Guardrail | Event Name | Trigger |
|-----------|-----------|---------|
| G-01 | `coppa_gate_shown` | Child UI loaded without parent auth |
| G-02 | `pii_scrub_triggered` | Data minimization validator blocked a field |
| G-04 | `child_profile_deleted` | Parent deletes child profile |
| G-04 | `account_deletion_requested` | Parent initiates account deletion |
| G-04 | `account_deleted_hard` | Nightly cron hard-deletes after 30d |
| G-07 | `safety_input_blocked` | Pre-generation text filter blocked |
| G-07 | `safety_output_flagged` | Post-generation image classifier flagged |
| G-07 | `safety_output_approved` | Book cleared for preview |
| G-09 | `story_text_purged` | Nightly cron purges raw_text after 90d |

---

## Compliance Checklist (Pre-Launch Gate)

Before any public beta:

- [ ] COPPA consent modal reviewed by legal counsel
- [ ] No child account creation path exists in any UI state
- [ ] Children table contains NO date-of-birth column
- [ ] Story raw text deletion cron tested end-to-end
- [ ] Account + child deletion cascade tested against production schema
- [ ] Safety filter red-teamed with 200 adversarial prompts
- [ ] AI disclosure copy approved and visible on every preview page
- [ ] Privacy policy published at `/privacy` and linked from sign-up
- [ ] CCPA "Do Not Sell" link visible in footer (even if data not sold — legal requirement in CA)
- [ ] Deletion confirmation email tested (parent receives within 60 seconds)

---

*Derived from: 507 research snippets (theme: `safety` = 62 snippets), COPPA 16 CFR Part 312, CCPA Cal. Civ. Code §1798, Phase 1 risks.md (R-03 COPPA, R-08 Content Moderation)*
