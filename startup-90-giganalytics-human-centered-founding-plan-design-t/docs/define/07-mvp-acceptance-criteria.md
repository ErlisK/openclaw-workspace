# GigAnalytics — MVP Core Flow Acceptance Criteria
## BDD Specification: New User → 2 Streams → CSV → Timer → $/hr + Heatmap

**Document type:** Acceptance Criteria (Gherkin BDD + supplemental constraints)  
**Date:** April 2026  
**Target:** MVP Definition of Done — all scenarios must pass before Prototype is considered shippable  
**Persona tested:** Alex — UX designer, Stripe + Upwork income, Toggl user, first-time GigAnalytics user  

---

## Scope of This Document

This document specifies the **complete first-session core flow** acceptance criteria:

```
[AC-F1] Signup (zero-waitlist, <60s)
[AC-F2] Add income stream #1 (manual stream)
[AC-F3] Add income stream #2 (CSV upload — Stripe sample)
[AC-F4] Timer: start, run, stop
[AC-F5] Hourly rate calculation + display
[AC-F6] Heatmap placeholder (MVP: shows data requirement; full heatmap is post-MVP)
[AC-F7] Cross-cutting: performance, error handling, auth guards, mobile
[AC-F8] Playwright E2E test map
```

**Note on Heatmap:** Per the feature priority decision in `03-feature-priorities.md`, the full heatmap requires ≥60 days of time+income data. In a first session, the MVP delivers: (1) a $/hr summary view as the "heatmap MVP", and (2) a heatmap placeholder that shows what data is still needed. The full interactive heatmap is a post-MVP feature.

---

## Test Data Fixtures

All scenarios use these fixtures:

### Fixture: Stripe Sample CSV (`stripe-sample.csv`)
```csv
id,created,available_on,currency,amount,fee,net,reporting_category,description,customer_email
ch_001,2024-01-08 09:15:00,2024-01-15 00:00:00,usd,2400.00,69.90,2330.10,charge,"Invoice INV-001 · Acme Corp",cto@acmecorp.com
ch_002,2024-01-22 14:30:00,2024-01-29 00:00:00,usd,1800.00,52.50,1747.50,charge,"Invoice INV-002 · Acme Corp",cto@acmecorp.com
ch_003,2024-02-05 11:00:00,2024-02-12 00:00:00,usd,2400.00,69.90,2330.10,charge,"Invoice INV-003 · Acme Corp",cto@acmecorp.com
po_001,2024-01-16 00:00:00,2024-01-16 00:00:00,usd,-2330.10,0.00,-2330.10,payout,"STRIPE PAYOUT",
```
Expected parse result: 3 income transactions, 1 payout (excluded from income), gross $6,600, fees $192.30, net $6,407.70

### Fixture: Timer Session
- Stream: "Acme Corp" (from Stripe CSV stream #1)
- Start: user taps start
- Duration: 1 hour 45 minutes (simulated by immediately stopping with edit)
- Type: Billable

### Fixture: Time Entry (pre-existing, to enable $/hr calculation)
- Stream: "Acme Corp" — 38.5 billable hours (from CSV import period Jan–Feb 2024)
- Stream: "Upwork" — 14.0 billable hours + 3.5 overhead (proposal) hours

---

## [AC-F1] Feature: Zero-Waitlist Signup

### Scenario F1.1: Email signup — happy path
```gherkin
GIVEN a new visitor lands on the GigAnalytics homepage
WHEN they click "Get started free"
THEN they see a signup form with fields: Email, Password
AND no additional fields are present (no name, company, phone, use case)
AND no "request access" or "join waitlist" copy is present

WHEN they enter a valid email and password (≥8 chars)
AND click "Create account"
THEN their account is created
AND they are redirected to the onboarding dashboard
AND sample data is loaded and visible
AND the elapsed time from first click to dashboard view is ≤60 seconds
```

### Scenario F1.2: Google OAuth signup
```gherkin
GIVEN a new visitor is on the signup page
WHEN they click "Continue with Google"
THEN they are redirected to Google's OAuth consent screen
WHEN they approve access
THEN they are redirected back to GigAnalytics
AND their account is created (no additional form required)
AND they are on the onboarding dashboard with sample data
```

### Scenario F1.3: Sample data is loaded immediately
```gherkin
GIVEN a new user has just created an account
WHEN they land on the dashboard for the first time
THEN they see a banner: "You're viewing sample data — import yours to get started"
AND the dashboard shows:
  - At least 2 sample income streams
  - Sample $/hr values per stream
  - A "Start with your data" CTA button
AND all sample stream cards are visually distinguished (e.g., "SAMPLE" badge)
```

### Scenario F1.4: Duplicate email is rejected
```gherkin
GIVEN an account already exists for "alex@example.com"
WHEN a new visitor tries to sign up with "alex@example.com"
THEN they see an error: "An account with this email already exists. Sign in instead."
AND a "Sign in" link is present in the error message
AND no account is created
```

### Scenario F1.5: Weak password is rejected
```gherkin
GIVEN a visitor is on the signup form
WHEN they enter a password with fewer than 8 characters
AND click "Create account"
THEN they see an inline error: "Password must be at least 8 characters"
AND no network request is made to the backend
```

### Scenario F1.6: Auth guard — unauthenticated access
```gherkin
GIVEN a user is not signed in
WHEN they navigate directly to /dashboard
THEN they are redirected to /login
AND after signing in they are redirected back to /dashboard
```

---

## [AC-F2] Feature: Add Income Stream #1 (Manual Stream)

### Scenario F2.1: Create manual stream — Upwork (no CSV yet)
```gherkin
GIVEN a new user is on the onboarding dashboard
WHEN they click "Add income stream"
THEN they see a stream creation panel with:
  - Stream name field (required)
  - Platform dropdown: Stripe / PayPal / Upwork / Gumroad / Etsy / Manual / Other
  - Color picker (optional)
  - "How do you get paid?" (optional, helper text)

WHEN they enter name "Upwork" and select platform "Upwork"
AND click "Create stream"
THEN the stream "Upwork" appears on the dashboard
AND the stream card shows: "No income data yet — upload a CSV or add manually"
AND a CTA "Upload Upwork CSV" is visible on the card
```

### Scenario F2.2: Stream name is required
```gherkin
GIVEN the stream creation panel is open
WHEN the user clicks "Create stream" with an empty name field
THEN an inline error appears: "Stream name is required"
AND no stream is created
```

### Scenario F2.3: Duplicate stream name warning
```gherkin
GIVEN a stream named "Upwork" already exists
WHEN the user creates a new stream also named "Upwork"
THEN they see a warning: "You already have a stream named 'Upwork'. Are you sure you want to create another?"
AND they can proceed or cancel
AND if they proceed, the duplicate stream is created (not blocked, just warned)
```

### Scenario F2.4: Stream appears in timer dropdown immediately
```gherkin
GIVEN the user has created a stream named "Upwork"
WHEN they open the timer widget (on any screen)
THEN "Upwork" appears in the stream selector dropdown
```

---

## [AC-F3] Feature: Add Income Stream #2 via CSV Upload (Stripe)

### Scenario F3.1: Upload Stripe CSV — happy path
```gherkin
GIVEN the user has created stream "Upwork" manually
AND they are on the dashboard
WHEN they click "Add income stream" → "Import from Stripe CSV"
OR they click "Upload Stripe CSV" from an existing empty stream card
THEN they see an upload panel with:
  - Drag-and-drop zone
  - "Browse files" fallback button
  - Text: "Supported formats: Stripe, PayPal, Upwork, Gumroad, Etsy"
  - Link: "How do I export my Stripe CSV?"

WHEN they upload stripe-sample.csv (the fixture file)
THEN within 5 seconds they see:
  "✓ Detected: Stripe balance export"
  "3 income transactions found"
  "Date range: Jan 8 – Feb 5, 2024"
  "Gross: $6,600.00 | Fees: $192.30 | Net: $6,407.70"
  A "Continue" button
```

### Scenario F3.2: Stream auto-detection from Stripe CSV
```gherkin
GIVEN the Stripe CSV has been detected and previewed (from F3.1)
WHEN the user clicks "Continue"
THEN they see the stream assignment screen:
  - Proposed stream: "Acme Corp" (detected from customer_email: cto@acmecorp.com)
  - Transaction count: 3
  - Net income: $6,407.70
  - A stream name field pre-filled with "Acme Corp" (editable)
  - "Use as stream" checkbox (checked by default)
  - Option: "Assign to existing stream" (dropdown showing "Upwork")

WHEN they keep defaults and click "Import"
THEN a new stream "Acme Corp" is created
AND all 3 income transactions are imported into that stream
AND the payout transaction is excluded (not counted as income)
AND the dashboard now shows 2 streams: "Upwork" and "Acme Corp"
```

### Scenario F3.3: Per-transaction fee display
```gherkin
GIVEN the Stripe CSV has been imported
WHEN the user views the "Acme Corp" stream detail
THEN each transaction shows:
  - Date
  - Description
  - Gross amount (e.g., $2,400.00)
  - Platform fee (e.g., -$69.90)
  - Net amount (e.g., $2,330.10)
AND the fee is labeled "Stripe processing fee"
AND no transaction shows a negative or zero fee without explanation
```

### Scenario F3.4: Payout rows excluded from income
```gherkin
GIVEN the Stripe CSV contains 3 charge rows and 1 payout row
WHEN the import is complete
THEN the stream shows 3 transactions (income only)
AND the payout is NOT shown in income
AND total income is $6,407.70 (not $6,407.70 - $2,330.10)
AND if the user navigates to "All transactions" they can see payout rows labeled "Payout (excluded from income)"
```

### Scenario F3.5: Re-upload same CSV — deduplication
```gherkin
GIVEN the Stripe CSV has already been imported
WHEN the user uploads the same stripe-sample.csv again
THEN the system detects 3 duplicate transactions (matching by platform_tx_id)
AND shows: "3 duplicates found and skipped — 0 new transactions added"
AND no duplicate income entries appear on the dashboard
AND the stream total remains unchanged at $6,407.70 net
```

### Scenario F3.6: Upload wrong file type
```gherkin
GIVEN the user is on the CSV upload panel
WHEN they upload a .xlsx file
THEN they see: "Please export as CSV. Excel files are not supported. Here's how →"
AND the file is rejected before processing
WHEN they upload a valid CSV that is NOT a financial export (e.g., contact list)
THEN they see: "We couldn't detect the format. Map columns manually →"
AND they are taken to the manual column mapping screen
```

### Scenario F3.7: Import completes within time limit
```gherkin
GIVEN a CSV file with ≤200 rows (typical 90-day export)
WHEN the user initiates import
THEN format detection completes in ≤2 seconds
AND stream assignment screen appears in ≤3 seconds
AND after clicking "Import", the dashboard updates in ≤5 seconds
Total import time (upload to dashboard updated): ≤10 seconds for ≤200-row CSV
```

---

## [AC-F4] Feature: Timer — Start, Run, Stop

### Scenario F4.1: Start timer — one tap (pre-selected stream)
```gherkin
GIVEN the user has streams "Upwork" and "Acme Corp"
AND "Acme Corp" was the last used stream
WHEN the user views the timer widget (home screen or floating widget)
THEN they see: "[▶ Start — Acme Corp]" as a single button
AND tapping it once starts the timer for "Acme Corp"
AND the timer starts counting from 0:00:00
AND a persistent timer bar appears at the top of every screen showing "Acme Corp · 0:00:01 ▪"
```

### Scenario F4.2: Timer persists across page refresh
```gherkin
GIVEN the user started a timer for "Acme Corp" at 14:30:00 UTC
WHEN the user refreshes the page (or closes and reopens the browser tab)
THEN the timer continues counting from the correct elapsed time
  (not reset to 0; elapsed = now - 14:30:00)
AND the persistent timer bar is still visible with the correct stream name
```

### Scenario F4.3: Timer stop → 1-tap save
```gherkin
GIVEN the timer has been running for 1:45:00 on "Acme Corp"
WHEN the user clicks the stop button (■ icon) in the persistent timer bar
THEN a review panel appears:
  "Session logged: Acme Corp"
  "Duration: 1h 45m"
  "[Change duration ▼]  [Change stream ▼]"
  "Note (optional): [___________]"
  "Billable: [✓ Yes]"
  "[Save]  [Discard]"

WHEN the user clicks "[Save]" without changing anything
THEN the time entry is saved with:
  - stream_id = "Acme Corp"
  - duration_minutes = 105
  - entry_type = "billable"
  - is_billable = true
  - source = "timer"
AND the timer resets to 0
AND the persistent timer bar disappears
AND the total for "Acme Corp" time this month increases by 1h 45m
```

### Scenario F4.4: Timer stop → edit duration
```gherkin
GIVEN the timer review panel is open showing 1h 45m
WHEN the user clicks "[Change duration ▼]"
THEN they can enter a custom duration in hours:minutes
OR enter start time and end time
WHEN they change duration to "2h 0m" and click "[Save]"
THEN the time entry is saved with duration_minutes = 120
AND a note is automatically added: "Duration edited from 1h 45m to 2h 0m"
```

### Scenario F4.5: Timer stop → change stream
```gherkin
GIVEN the timer review panel is open with stream "Acme Corp"
WHEN the user clicks "[Change stream ▼]"
THEN a dropdown shows all their streams: "Acme Corp", "Upwork"
WHEN they select "Upwork"
THEN the review panel updates to show "Session logged: Upwork"
AND clicking "[Save]" saves the entry to the "Upwork" stream
```

### Scenario F4.6: Only one timer can run at a time
```gherkin
GIVEN the user has a timer running for "Acme Corp"
WHEN they try to start another timer for "Upwork"
THEN they see a prompt: "You have a timer running for Acme Corp (2h 15m). Stop it first?"
  "[Stop Acme Corp and start Upwork]  [Keep Acme Corp running]"
WHEN they choose "Stop Acme Corp and start Upwork"
THEN the Acme Corp session is reviewed and saved
AND the Upwork timer starts immediately after
```

### Scenario F4.7: Long-running timer recovery
```gherkin
GIVEN the user started a timer 9 hours ago and never stopped it
WHEN they next open the app
THEN they see a banner: "Timer has been running for 9h 12m on Acme Corp. Did you forget to stop it?"
  "[Stop now]  [Edit duration]  [Discard session]"
WHEN they click "[Edit duration]"
THEN they can set the actual duration (e.g., 2h 0m)
AND the entry is saved with that edited duration
```

### Scenario F4.8: Quick-log retroactive entry
```gherkin
GIVEN the user did not use the timer during a work session
WHEN they click "[+ Log time]"
THEN a form appears:
  Stream: [Acme Corp ▼]
  Duration: [2] hrs [30] min
  OR: Start [09:00] End [11:30]
  Note: [optional]
  Type: [Billable ▼] / Proposal / Admin / Revision / Other

WHEN they fill in "2 hrs 30 min" and stream "Acme Corp" and click "Save"
THEN a time entry is created with:
  - duration_minutes = 150
  - source = "manual"
  - entry_type = "billable"
AND the dashboard updates immediately
AND the total elapsed time was ≤4 taps / interactions
```

### Scenario F4.9: Overhead time entry reduces effective $/hr
```gherkin
GIVEN the user logs 3 hours as "Proposal" type on "Upwork"
AND the "Upwork" stream has net_income = $840 and billable_hours = 10
THEN the "Upwork" stream card shows:
  Billable hours: 10.0h
  Overhead hours: 3.0h  (proposals)
  Total hours: 13.0h
  Stated $/hr: $84.00  (net / billable)
  Effective $/hr: $64.62  (net / total)
  "Overhead reduces your rate by 23%"
```

---

## [AC-F5] Feature: Hourly Rate — Calculation and Display

### Scenario F5.1: $/hr appears after first time entry + income data
```gherkin
GIVEN the user has imported Stripe CSV for "Acme Corp" (net: $6,407.70)
AND they have logged 38.5 billable hours on "Acme Corp"
WHEN they view the "Acme Corp" stream card
THEN they see:
  Net income (last 30 days or full import range): $6,407.70
  Billable hours: 38.5h
  Effective $/hr: $166.43
AND the calculation is correct: 6407.70 / 38.5 = $166.43
```

### Scenario F5.2: Cross-stream comparison is the primary view
```gherkin
GIVEN the user has 2 streams:
  "Acme Corp": net $6,407.70, 38.5 billable hrs, 0 overhead hrs
  "Upwork": net $840.00, 10 billable hrs, 3.5 overhead hrs (proposals)

WHEN they view the main dashboard
THEN the primary view is a ranked comparison:
  1. Acme Corp    $166.43/hr   ████████████████████
  2. Upwork        $64.62/hr   ████████

AND a recommendation is present, e.g.:
  "Acme Corp earns 2.6× more per hour than Upwork (including proposal time).
   Consider whether the time spent on Upwork proposals is worth the lower effective rate."
```

### Scenario F5.3: $/hr updates in real-time on new time entry
```gherkin
GIVEN the "Acme Corp" stream shows effective $/hr: $166.43 (38.5 hrs)
WHEN the user logs 1h 45m more on "Acme Corp"
THEN within 2 seconds the stream card updates to:
  Billable hours: 40.25h
  Effective $/hr: $159.19  (6407.70 / 40.25)
AND the cross-stream comparison reranks if order changes
```

### Scenario F5.4: Period selector — all metrics update together
```gherkin
GIVEN the dashboard shows "Last 30 days" as the default period
WHEN the user changes the period to "Last 90 days"
THEN ALL of the following update simultaneously:
  - Gross income per stream
  - Platform fees per stream
  - Net income per stream
  - Billable hours per stream
  - Overhead hours per stream
  - Effective $/hr per stream
  - Cross-stream comparison ranking
  - Recommendation text
AND no partial update state is shown (all metrics update atomically or with a loading skeleton)
```

### Scenario F5.5: Stream card shows complete fee breakdown
```gherkin
GIVEN the "Acme Corp" stream has Stripe income
WHEN the user views the stream detail card
THEN they see:
  Gross income:     $6,600.00
  Stripe fees:        -$192.30  (labeled "Stripe processing fees — 2.9% + $0.30/charge")
  Net income:       $6,407.70
  ─────────────────────────────
  Billable hours:    38.5h
  Overhead hours:     0.0h
  Total hours:       38.5h
  ─────────────────────────────
  Effective $/hr:   $166.43
AND every line item has a visible label (no unlabeled numbers)
```

### Scenario F5.6: No $/hr shown without time data
```gherkin
GIVEN the "Acme Corp" stream has income data (CSV imported)
AND the user has NOT logged any time entries for "Acme Corp"
WHEN they view the stream card
THEN the $/hr field shows a placeholder: "Log time to see your hourly rate →"
AND a prominent CTA links to the timer or quick-log entry
AND gross/net income IS shown (time data is not required to show income)
```

### Scenario F5.7: Income goal progress
```gherkin
GIVEN the user has set a monthly income goal of $8,000
AND their current net income this month is $6,407.70 (Acme Corp only)
WHEN they view the dashboard
THEN they see:
  Monthly goal: $8,000
  Progress: $6,407.70 / $8,000 (80.1%)
  Days remaining: [N] days
  On track: "You need $199/day to hit your goal"
AND the progress bar is visually prominent
```

---

## [AC-F6] Feature: Heatmap (MVP: Placeholder + First-Session State)

**Context:** The full heatmap (earnings density by hour-of-week) requires ≥60 days of matched time+income data. In a first session, the user has just imported 1 CSV and logged 1 timer session. The MVP delivers:
1. A correct "insufficient data" state that explains what's needed
2. The $/hr-by-stream ranked view as a proto-heatmap for immediate value
3. A day-of-week summary table when ≥7 days of time entries exist

### Scenario F6.1: Heatmap section shows correct "building" state on day 1
```gherkin
GIVEN the user is in their first session
AND they have <7 days of time entry data
WHEN they navigate to the "Heatmap" section (or "Best times" tab)
THEN they see:
  Title: "When do you earn the most per hour?"
  State: "Keep logging time — we'll show your best working hours after 7 days of data"
  Progress indicator: "0 / 7 days of data logged"
  Explanation: "This shows which hours of the week you earn the most, 
                helping you decide when to take on new work."
  CTA: "Log your first week of time →"
AND no empty heatmap grid is shown (a confusing empty grid is worse than an honest placeholder)
```

### Scenario F6.2: Day-of-week summary after ≥7 days of entries
```gherkin
GIVEN the user has logged time entries across ≥7 different calendar days
AND some days have income-attributed time entries
WHEN they view the Heatmap section
THEN they see a day-of-week summary table:
  Day     | Avg $/hr | Total hours logged
  ─────────────────────────────────────
  Monday  | $145/hr  | 12.5h
  Tuesday | $162/hr  | 8.0h
  ...
  (days with no data show "—")
AND a text callout shows the highest-earning day: "Tuesdays are your most productive day ($162/hr avg)"
AND a note: "Full hour-of-day heatmap unlocks after 60 days of data"
```

### Scenario F6.3: Full heatmap after ≥60 days of data
```gherkin
GIVEN the user has ≥60 days of matched time+income data
WHEN they view the Heatmap section
THEN they see a 7×24 grid (days × hours)
AND each cell is colored by relative $/hr (user's own scale, not benchmark)
AND hovering a cell shows: "[Day] [Hour]: avg $X/hr across N sessions"
AND 3 "peak times" are listed as text below the heatmap:
  "1. Tue/Wed 9-11am: $158/hr avg"
  "2. Mon/Thu morning: $134/hr avg"
  "3. Fri afternoon: $89/hr avg"
AND the user can filter by stream using a dropdown
```

### Scenario F6.4: $/hr by stream as the immediate first-session "heatmap"
```gherkin
GIVEN the user has 2 streams with income and time data
AND it is their first session (day 0)
WHEN they are on the main dashboard
THEN the cross-stream comparison (from AC-F5.2) serves as the immediate actionable view
AND it is labeled "Your best income sources by hourly rate" (not "heatmap")
AND the heatmap section separately notes that it's building
AND the user gets value from the $/hr comparison even before the 7-day threshold
```

---

## [AC-F7] Cross-Cutting: Performance, Errors, Auth, Mobile

### Performance Criteria

```gherkin
SCENARIO: Dashboard initial load
GIVEN the user is authenticated and has data
WHEN they navigate to /dashboard
THEN Time to First Contentful Paint (FCP) ≤ 1.5 seconds
AND Time to Interactive (TTI) ≤ 3 seconds
AND The $/hr values are visible within 3 seconds (not a loading spinner after 3s)

SCENARIO: CSV import performance
GIVEN a CSV with ≤200 rows
WHEN uploaded
THEN format detection ≤ 2 seconds
AND stream proposal screen ≤ 3 seconds
AND dashboard update after confirm ≤ 5 seconds

SCENARIO: Timer start performance
GIVEN the user taps "Start timer"
WHEN the tap event fires
THEN the timer display starts counting within 200ms
AND the DB record is written within 1 second (background, does not block UI)
```

### Error Handling

```gherkin
SCENARIO: Network error during CSV import
GIVEN the user's network drops during import processing
WHEN the import fails mid-stream
THEN they see: "Import failed — please try again. Your data has not been saved."
AND no partial/corrupt data is written to the database
AND the upload form is reset and available for retry

SCENARIO: Auth session expired mid-session
GIVEN the user's session token expires while they're on the dashboard
WHEN they try to log a time entry
THEN they are not silently logged out mid-flow
AND they see: "Your session expired. Signing you back in..."
AND after re-auth they are returned to where they were
AND any unsaved timer state (running timer start time) is preserved

SCENARIO: Stripe CSV with zero transactions
GIVEN the user uploads a valid Stripe CSV with no income rows (only payouts)
WHEN parsing completes
THEN they see: "No income transactions found in this file. 
               This file contains only payout records.
               To see income, export from Stripe → Reports → Balance → Itemized."
AND a link to the correct Stripe export page is provided

SCENARIO: CSV with mixed currencies
GIVEN the user uploads a Stripe CSV with some EUR transactions
WHEN the system detects non-USD rows
THEN they see: "We found transactions in EUR (3 transactions, €420.00). 
               Convert to USD at current rate? Or exclude from totals?"
AND the user can choose: [Convert at today's rate] [Exclude foreign currency] [Cancel]
```

### Auth Guards

```gherkin
SCENARIO: All protected routes require authentication
GIVEN a user is not signed in
WHEN they try to access any of:
  /dashboard, /streams/*, /timer, /import, /settings, /billing
THEN they are redirected to /login
AND the intended destination is preserved in the redirect (returnTo parameter)

SCENARIO: Free tier feature gate
GIVEN the user is on the free tier
WHEN they try to add a second income stream
THEN they see an upgrade prompt:
  "Unlimited streams require the Pro plan"
  "[Upgrade to Pro — $9/month]"
AND they cannot add the stream without upgrading
```

### Mobile Responsiveness

```gherkin
SCENARIO: Timer is usable on mobile
GIVEN the user is on a mobile device (375px viewport)
WHEN they view the timer
THEN the "[▶ Start — Acme Corp]" button is:
  - At least 44×44px (Apple HIG minimum tap target)
  - Visible without scrolling
  - Not obscured by navigation elements

SCENARIO: Stream cards stack vertically on mobile
GIVEN the user has 2 stream cards
WHEN viewed on mobile (375px)
THEN the cards stack vertically (not side by side)
AND all text is readable without horizontal scrolling
AND the $/hr figure is the largest text on each card

SCENARIO: CSV upload works on mobile
GIVEN the user is on mobile
WHEN they tap "Import CSV"
THEN the native file picker opens
AND they can select a CSV from Files / Google Drive / iCloud
AND the upload and parsing flow works identically to desktop
```

---

## [AC-F8] Playwright E2E Test Map

The following Playwright tests must be implemented and must pass against the deployed Vercel URL before MVP is considered shippable.

### Test File: `e2e/signup.spec.ts`
```typescript
test('User can sign up with email and reach dashboard in ≤60s')
test('Sample data is visible immediately after signup')
test('Duplicate email shows error, does not create account')
test('Unauthenticated access to /dashboard redirects to /login')
test('After login, user is redirected back to original destination')
```

### Test File: `e2e/streams.spec.ts`
```typescript
test('User can create a manual stream — appears on dashboard')
test('Stream shows empty state CTA when no income data')
test('Empty stream name shows validation error')
test('Stream appears in timer dropdown after creation')
```

### Test File: `e2e/csv-import.spec.ts`
```typescript
test('Stripe CSV is auto-detected and parsed (using fixture file)')
test('Import shows gross/fee/net preview correctly')
test('Stream auto-detection proposes "Acme Corp" from customer_email')
test('After import, dashboard shows new stream with correct net income')
test('Payout rows are excluded from income total')
test('Re-uploading same CSV skips duplicates, shows count')
test('Non-CSV file shows helpful error')
test('Import completes in ≤10 seconds for 200-row fixture')
```

### Test File: `e2e/timer.spec.ts`
```typescript
test('Timer starts in 1 tap with pre-selected stream')
test('Running timer shows in persistent header bar')
test('Timer continues after page refresh (correct elapsed time)')
test('Timer stop shows review panel with correct duration')
test('Timer save creates time entry in correct stream')
test('Only one timer can run at a time — second start prompts stop')
test('Quick-log retroactive entry saves in ≤4 interactions')
test('Long-running timer (>8h) shows recovery prompt on page load')
```

### Test File: `e2e/hourly-rate.spec.ts`
```typescript
test('$/hr is visible after CSV import + time entry')
test('$/hr = net_income / total_hours (billable + overhead)')
test('Cross-stream comparison shows both streams ranked')
test('Overhead entry (proposal type) reduces effective $/hr')
test('Period selector change updates all metrics simultaneously')
test('No $/hr shown when stream has income but no time entries')
test('$/hr updates within 2 seconds of new time entry saved')
```

### Test File: `e2e/heatmap.spec.ts`
```typescript
test('Heatmap section shows "building" state on day 0 (no data)')
test('Heatmap progress indicator shows 0/7 days on first session')
test('Day-of-week summary appears after 7+ days of time entries')
test('Full heatmap grid appears after 60+ days of data (mocked)')
```

### Test File: `e2e/auth-guards.spec.ts`
```typescript
test('All protected routes redirect to login when unauthenticated')
test('Free tier cannot add second stream (upgrade prompt shown)')
test('Upgrade prompt shows correct Pro price ($9/month)')
```

### Test File: `e2e/performance.spec.ts`
```typescript
test('Dashboard FCP ≤ 1500ms (Lighthouse or page timing API)')
test('CSV import ≤ 10 seconds for 200-row fixture')
test('Timer start updates UI within 200ms of tap')
```

---

## Definition of Done: MVP Core Flow

The MVP core flow is **complete** when ALL of the following are true:

```
☐ AC-F1: All 6 signup scenarios pass in Playwright
☐ AC-F2: All 4 stream creation scenarios pass
☐ AC-F3: All 7 CSV import scenarios pass (including deduplication)
☐ AC-F4: All 9 timer scenarios pass (including persistence + recovery)
☐ AC-F5: All 7 hourly rate scenarios pass (including real-time update)
☐ AC-F6: All 4 heatmap scenarios pass (placeholder, 7-day, 60-day, first-session)
☐ AC-F7: Performance criteria met (FCP ≤1.5s, import ≤10s, timer UI ≤200ms)
☐ AC-F7: All error handling scenarios produce user-friendly messages (no raw errors)
☐ AC-F7: All protected routes redirect correctly
☐ AC-F7: Timer and stream cards are usable on 375px mobile viewport
☐ AC-F8: All 8 Playwright test files have passing tests against deployed Vercel URL
☐ Total first-session time (signup → 2 streams → import → timer → $/hr): ≤10 minutes
☐ No raw error messages, stack traces, or technical error codes visible to users
☐ All financial data is user-isolated (RLS verified: User A cannot access User B's data)
```

---

*These acceptance criteria govern the Prototype phase. Every user story in the Ideate phase maps to at least one scenario in this document. No prototype is considered complete unless its corresponding AC scenarios pass.*
