# AgentQA — MVP Scope & Acceptance Criteria

*Status: READY FOR BUILD | Derived from: scope.md, personas.md, competitor-grid.md*  
*Last updated: April 2026*

---

## What We Are Building

A web platform where a founder submits a public URL + description of what their app should do, pays $5–$15, and receives a structured test report (video + network logs + console errors + AI summary) from a human tester within 2–4 hours — with zero SDK install on the tested app.

**The single sentence that must be true when MVP ships:**
> A non-technical founder can go from "I just deployed a Lovable app" to "I have a test report with bugs and logs" in under 4 hours, spending under $15, without writing a single line of test code.

---

## System Overview

```
Buyer (founder)
  → Submit form (URL + flows + tier + payment)
  → Wait for tester assignment (<15 min)
  → Tester runs session in AgentQA Chrome environment
      → network requests captured (proxy)
      → console errors captured (CDP)
      → screen recorded
      → tester writes bug report
  → AI summary generated
  → Buyer receives report page
```

---

## Module 1: Test Submission Flow

### Description
The buyer-facing intake form. Must be completable by a non-technical user in under 3 minutes.

### Acceptance Criteria

**AC-1.1 — URL validation**
- [ ] Input accepts any HTTPS URL
- [ ] System validates URL is publicly reachable (HTTP 200 response within 10 seconds)
- [ ] Rejects localhost, private IPs (10.x, 192.168.x, 127.x)
- [ ] Rejects URLs returning 4xx/5xx
- [ ] Shows clear error: "This URL isn't publicly accessible. AgentQA requires a live deployed URL."

**AC-1.2 — Flow description**
- [ ] Textarea accepts plain-English description of what to test
- [ ] Character limit: 1,000 characters
- [ ] Helper text: "Describe what your app should do. E.g. 'Visit the homepage, click Get Started, fill in the signup form, and confirm the dashboard loads.'"
- [ ] Minimum 20 characters enforced with friendly error

**AC-1.3 — Tier selection**
- [ ] 3 tiers displayed: Quick (10 min / $5), Standard (20 min / $10), Deep (30 min / $15)
- [ ] Each tier shows: duration, price, flows covered, what's included in the report
- [ ] Standard tier highlighted as "Most Popular"
- [ ] Tier selection required before proceeding to payment

**AC-1.4 — Payment (Stripe)**
- [ ] Stripe Checkout integration (no card data stored on AgentQA servers)
- [ ] Payment must complete before test is queued
- [ ] On successful payment: redirect to "Test Submitted" confirmation page with job ID
- [ ] On failed payment: stay on form, show error, do not queue test
- [ ] Buyer receives email confirmation with job ID and expected delivery window

**AC-1.5 — Test queuing**
- [ ] On payment success: create test job record in DB with status `queued`
- [ ] Record contains: url, flow_description, tier, buyer_email, created_at, status
- [ ] Buyer confirmation page shows: job ID, tier, expected turnaround ("Your Quick test will be delivered by [time+2h]")

---

## Module 2: Tester Dashboard

### Description
The environment where the human tester conducts the test. Must capture network + console data automatically with no action from the tester beyond clicking through the app.

### Acceptance Criteria

**AC-2.1 — App display**
- [ ] Tested app rendered in an embedded iframe at 1920×1080 (Chrome desktop viewport)
- [ ] If iframe embedding is blocked (X-Frame-Options), fall back to opening in a managed Chrome window via CDP
- [ ] Tester cannot navigate outside the tested domain without confirmation
- [ ] Timer shown prominently (countdown from tier duration: 10/20/30 min)

**AC-2.2 — Network request capture**
- [ ] All outgoing network requests intercepted via browser proxy or CDP Network domain
- [ ] Captured per request: timestamp, method (GET/POST/etc.), URL, status code, response time (ms), response size
- [ ] Displayed in real-time in a collapsible panel below the iframe
- [ ] Failures (4xx, 5xx, network error) highlighted in red
- [ ] No SDK install required on the tested app — capture is entirely platform-side

**AC-2.3 — Console log capture**
- [ ] All console output captured via Chrome DevTools Protocol (Runtime domain / console events)
- [ ] Captured per entry: timestamp, level (log/warn/error/info), message text
- [ ] Errors displayed in red, warnings in yellow
- [ ] Displayed in real-time in a second collapsible panel
- [ ] No SDK install required on the tested app

**AC-2.4 — Screen recording**
- [ ] Full session screen recorded from first tester interaction to session end
- [ ] Recording includes the full browser viewport (app + tester interactions)
- [ ] Recording automatically stops at tier time limit
- [ ] Video uploaded to storage on session end; accessible on report page

**AC-2.5 — Bug report form**
- [ ] Tester can log bugs during session: title + severity (P0/P1/P2/P3) + description + screenshot
- [ ] Screenshot tool: click to capture current iframe state
- [ ] Bugs saved incrementally (not lost if browser closes)
- [ ] Minimum 1 bug logged OR explicit "No bugs found" checkbox required to submit

**AC-2.6 — Session completion**
- [ ] "Complete Session" button enabled only when timer reaches 0 OR tester clicks early + confirms
- [ ] On completion: session status → `tester_complete`, triggers AI summary generation
- [ ] Tester receives confirmation that report has been submitted

---

## Module 3: AI Report Generation

### Description
After the tester completes the session, the platform generates an AI summary using Vercel AI Gateway. This makes the report readable by non-technical founders and pasteable into AI coding agents.

### Acceptance Criteria

**AC-3.1 — Trigger**
- [ ] AI summary triggered automatically on session status → `tester_complete`
- [ ] Runs as a Vercel serverless function (server-side only, never client-side)
- [ ] Uses `gateway('anthropic/claude-sonnet-4.5')` via Vercel AI Gateway

**AC-3.2 — Input to AI**
- [ ] Prompt includes: original flow description, bug list (title + severity + description), console error count + top 3 errors, network failure count + top 3 failed URLs

**AC-3.3 — AI output**
- [ ] One paragraph plain-English summary (max 150 words): what was tested, what worked, what broke, severity
- [ ] Structured bug list: each bug formatted as `[P{severity}] {title}: {one-line description}`
- [ ] "Paste into your AI agent" block: pre-formatted prompt that includes the summary + bug list, ready to copy

**AC-3.4 — Fallback**
- [ ] If AI generation fails (timeout, API error): report still delivered with tester's raw notes
- [ ] Error logged; admin alerted; buyer sees "AI summary temporarily unavailable" message

---

## Module 4: Report Delivery

### Description
The buyer-facing report page. Must communicate findings clearly to a non-technical audience.

### Acceptance Criteria

**AC-4.1 — Report page structure**
- [ ] Accessible at `/report/[job-id]` — unique URL per test
- [ ] Authenticated view: only the buyer (by email link token) can see the report
- [ ] Sections: Summary, AI Summary, Video Playback, Bugs Found, Network Requests, Console Errors

**AC-4.2 — Video playback**
- [ ] Session recording plays in-page (no external link required)
- [ ] Seekable, pausable
- [ ] Timestamp markers for each logged bug

**AC-4.3 — Network request table**
- [ ] Sortable/filterable table: timestamp, method, URL, status, response time
- [ ] Red highlight for 4xx/5xx responses
- [ ] Export as CSV

**AC-4.4 — Console log display**
- [ ] Scrollable list with level badges (error/warn/log)
- [ ] Filter by level
- [ ] Copy-all button

**AC-4.5 — AI summary block**
- [ ] Displayed prominently at top of report
- [ ] One-click copy of "paste into your AI agent" block
- [ ] Block formatted as: "AgentQA test report for [URL]. Tester found [N] issues. [Summary]. Bug list: [formatted list]."

**AC-4.6 — Delivery notification**
- [ ] Buyer receives email when report is ready: "Your AgentQA report is ready" + link to report page
- [ ] Email sent within 5 minutes of AI summary completion
- [ ] Report link uses signed token (expires 30 days)

**AC-4.7 — Rating**
- [ ] 5-star report quality rating shown at bottom of report
- [ ] Optional comment field
- [ ] Submitted rating stored in DB; used for tester quality tracking
- [ ] Required for internal success metric: ≥85% "useful" (4–5 stars)

---

## Module 5: Admin / Tester Management (Internal)

### Description
Internal tooling to assign tests to testers and monitor queue. Not buyer-facing in v1.

### Acceptance Criteria

**AC-5.1 — Queue view**
- [ ] Admin dashboard at `/admin` (auth-gated)
- [ ] Lists all queued tests: job ID, URL, tier, created_at, status
- [ ] One-click "Assign to tester" → select tester from list → status → `assigned`

**AC-5.2 — Tester accounts**
- [ ] Testers have accounts (email + password)
- [ ] Tester sees their assigned tests queue
- [ ] Each test shows: URL, flow description, tier, time limit, deadline

**AC-5.3 — Tester payout tracking**
- [ ] Each completed test records: tester_id, job_id, completed_at, payout_amount
- [ ] Monthly payout summary per tester (manual payment in v1 via Wise/PayPal)

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page load (submission form) | <2s |
| Test job creation (post-payment) | <3s |
| Tester assignment (from queue) | <15 min (manual in v1) |
| AI summary generation | <60s |
| Report delivery email | <5 min after session complete |
| Video upload + processing | <10 min after session complete |
| Uptime | 99% (Vercel + Supabase managed infra) |

---

## Data Model (Supabase)

```sql
-- Core tables

test_jobs
  id uuid PK
  url text NOT NULL
  flow_description text NOT NULL
  tier text CHECK (tier IN ('quick','standard','deep'))
  status text CHECK (status IN ('queued','assigned','in_progress','tester_complete','report_ready'))
  buyer_email text NOT NULL
  stripe_payment_intent_id text
  created_at timestamptz DEFAULT now()
  assigned_at timestamptz
  completed_at timestamptz
  report_url text
  ai_summary text
  buyer_rating int CHECK (buyer_rating BETWEEN 1 AND 5)

network_requests
  id uuid PK
  job_id uuid FK → test_jobs.id
  captured_at timestamptz
  method text
  url text
  status_code int
  response_time_ms int
  response_size_bytes int

console_logs
  id uuid PK
  job_id uuid FK → test_jobs.id
  captured_at timestamptz
  level text CHECK (level IN ('log','info','warn','error'))
  message text

bugs
  id uuid PK
  job_id uuid FK → test_jobs.id
  severity text CHECK (severity IN ('P0','P1','P2','P3'))
  title text
  description text
  screenshot_url text
  logged_at timestamptz

testers
  id uuid PK
  email text UNIQUE
  name text
  status text CHECK (status IN ('active','inactive'))
  total_tests_completed int DEFAULT 0
  total_payout_usd numeric DEFAULT 0
```

---

## Launch Checklist

Before calling v1 "launched":

- [ ] AC-1.1 through AC-1.5: Submission flow fully functional
- [ ] AC-2.1 through AC-2.6: Tester dashboard works end-to-end
- [ ] AC-3.1 through AC-3.4: AI summary generated and delivered
- [ ] AC-4.1 through AC-4.7: Report page complete with all sections
- [ ] AC-5.1 through AC-5.3: Admin queue + tester dispatch working
- [ ] Stripe live mode payments tested
- [ ] End-to-end smoke test: submit → assign → complete → report delivered
- [ ] Buyer email notifications working
- [ ] Video storage + playback working
- [ ] 3 internal "shadow tests" run with real testers before public launch
- [ ] All Playwright E2E tests passing against production URL
