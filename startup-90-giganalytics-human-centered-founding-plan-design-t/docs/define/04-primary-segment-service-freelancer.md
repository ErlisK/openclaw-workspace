# Primary Segment Selection: Service Freelancer
## Design/Dev/Coaching — 2–5 Clients/Platforms, Calendar Scheduling, Ad Spend or Platform Fees

**Document type:** Segment deep-dive  
**Date:** April 2026  
**Status:** Selected as MVP primary segment  

---

## Why Service Freelancer is the Primary Segment

After evaluating all three candidate segments against four selection criteria, Service Freelancer scores highest across every dimension:

| Criterion | Service Freelancer | Creator-Seller | Gig Worker |
|-----------|:-----------------:|:--------------:|:----------:|
| **Income level** (willingness to pay) | ✅ $4–15K/mo | ⚠️ $800–4K/mo | ⚠️ $800–3.5K/mo |
| **Data quality** (best API/CSV coverage) | ✅ Stripe + Upwork + Toggl | ⚠️ Etsy (2-file), Gumroad | ❌ No CSV for DoorDash/TR |
| **Time-to-value** (speed to first "aha") | ✅ $/hr gap visible in <5 min | ⚠️ Requires 2-CSV merge first | ❌ Manual entry required |
| **Community density** (acquisition efficiency) | ✅ r/freelance, Upwork, IH, LinkedIn | ⚠️ r/EtsySellers (fragmented) | ⚠️ r/doordash_drivers |
| **Existing tool friction** (switching motivation) | ✅ High: "Toggl + Stripe don't talk" | ⚠️ Medium: Google Sheets works | ⚠️ Low: bank app is enough |
| **Referral velocity** (tight professional networks) | ✅ Freelancer Slack/Discord/Twitter | ⚠️ Creator communities | ❌ Low network cohesion |

**Verdict:** Service Freelancer is the right primary segment for MVP. It has the highest income, best data access, fastest first-value delivery, and strongest community networks for organic growth.

---

## Segment Definition: Service Freelancer

### Who They Are
Skilled service providers who sell their expertise on an hourly or project basis across 2–5 simultaneous income sources. The work is knowledge-based (design, engineering, writing, coaching, consulting, marketing) and delivered remotely.

**Core structural reality:** They have time data in one tool (Toggl/Clockify/spreadsheet), money data in 2-4 other tools (Stripe, PayPal, Upwork, direct invoicing), and no single view that connects the two. They cannot answer "which client actually pays the most per hour of my effort?" without manual calculation they almost never do.

### Qualifying Profile
- **Services:** UX/UI design, software development, copywriting/content, business/life/fitness coaching, marketing consulting, accounting/bookkeeping, legal consulting, photography
- **Income:** $4,000–$15,000/month gross across all sources
- **Client count:** 2–5 active clients simultaneously (some long-term retainers, some project-based)
- **Platforms:** At least one of: Upwork, Toptal, Fiverr, direct Stripe, direct PayPal, Calendly+Stripe
- **Time tracking:** Uses Toggl, Clockify, Harvest, or spreadsheet — but the data is siloed
- **Tech comfort:** Medium-high. Uses SaaS tools daily; comfortable uploading CSVs; not a developer

### Composite Persona: Alex, 32
> UX designer. Works from home in Portland. Three income sources: (1) two long-term direct clients billed through Stripe invoices (~$6,000/month combined), (2) Upwork projects (~$2,500/month), (3) a monthly design critique coaching call via Calendly+Stripe (~$800/month). Tracks time in Toggl. Gets paid in Stripe and Upwork. Has been doing this for 3 years. Has never calculated true $/hr per client. Suspects direct clients pay better but can't prove it. Spends ~4 hours/week on Upwork proposals that convert at ~20%. Has a Notion income tracker he opened twice.

---

## The Primary Workflow: How Service Freelancers Currently Operate

### Current State (AS-IS) — The Fragmented Reality

```
MON      TUE      WED      THU      FRI
───────────────────────────────────────────────────────

[Work on direct client A — 3 hrs]
  Toggl: "Client A redesign" logged
  Stripe: Invoice sent (manual) — $2,400

[Upwork hourly contract — 4 hrs]
  Upwork Work Diary: auto-logs screenshots
  Toggl: may or may not also track here

[Coaching calls — 2 hrs]
  Calendly booking received
  Stripe: charge fires automatically ($400)
  Toggl: might log it, might not

[Proposals — 3 hrs this week]
  Not tracked anywhere
  Not billed to anyone

─────────────────────────────────────────────────────────
END OF WEEK: "How much did I make?"
  → Open Upwork: see $760 (NET, after 10% fee)
  → Check Stripe: see $2,400 + $400 = $2,800
  → Total (rough): ~$3,560 for the week
  → "How many hours did I work?" → unclear
  → "Which client pays most per hour?" → no idea

─────────────────────────────────────────────────────────
END OF MONTH: "Is Upwork worth it?"
  → Vague sense that direct clients pay better
  → Never confirmed with data
  → Too much friction to calculate manually
  → "I should figure this out someday"
```

### With GigAnalytics (TO-BE) — Unified View

```
ONCE (5-minute onboarding):
  Connect Stripe (CSV or OAuth)
  Upload Upwork CSV
  Connect Google Calendar
  Name streams: "Direct Clients" / "Upwork" / "Coaching"

ONGOING (30 seconds/day):
  Time entry quick-log after each session
  OR: calendar events auto-proposed as time entries

WEEKLY VIEW:
  Direct Clients:  $2,800  /  18 hrs  =  $155.56/hr  ▲
  Upwork:           $760   /  11 hrs  =   $69.09/hr  
  Coaching:         $400   /   2 hrs  =  $200.00/hr  ▲
  Proposals:         $0    /   3 hrs  =   $0.00/hr   ▼ (overhead)

  EFFECTIVE RATE (all time):  $3,960 / 34 hrs = $116.47/hr

  RECOMMENDATION:
  "Coaching earns 2.9× more per hour than Upwork.
   Consider 1 additional coaching hour instead of 3 Upwork proposals."
```

---

## Sub-Segment Nuances

### Sub-segment 1: Platform + Direct Hybrid (40% of segment)
**Profile:** Has an Upwork or Fiverr presence AND direct clients through Stripe/PayPal.  
**Primary pain:** "Is Upwork worth the 10% fee vs. direct clients?"  
**GigAnalytics hero moment:** Side-by-side $/hr: Upwork $71/hr vs. Direct $118/hr. Decision made.

### Sub-segment 2: Multi-Direct (30% of segment)
**Profile:** No marketplace; 3-5 direct clients, billed through different methods (Stripe, PayPal, wire transfer, occasional cash/check).  
**Primary pain:** "Which of my clients is most profitable per hour? Which should I prioritize / fire?"  
**GigAnalytics hero moment:** Per-client $/hr ranking. Clear answer to "who deserves my best availability."

### Sub-segment 3: Service + Passive Mix (20% of segment)
**Profile:** Active service work + passive income (a Gumroad course, a newsletter, a small Etsy print shop).  
**Primary pain:** "My passive income 'feels' smaller but requires almost no time. Is it actually high $/hr?"  
**GigAnalytics hero moment:** Gumroad digital products = $340/hr (creation amortized). Active UX work = $95/hr. Reframe.

### Sub-segment 4: High-Volume Proposal Writers (10% of segment)
**Profile:** Heavy Upwork/Fiverr presence, sends 15-20 proposals/week, low conversion rate.  
**Primary pain:** "How many hours do I lose on proposals that don't convert? What's the real cost?"  
**GigAnalytics hero moment:** "You spent 6.2 hrs on proposals this month. 2 converted → $1,400. Proposal $/hr: $225. Your Upwork project $/hr: $68. Proposals are your second-highest ROI activity."

---

## Calendar Integration: Why It's Especially Critical for This Segment

Service freelancers are the **highest calendar users** among all three personas. Research evidence:

- ~85% of service freelancers schedule client calls/meetings in Google Calendar (vs. ~30% of gig workers)
- Client names appear in calendar event titles at high rates ("Call with Acme Corp")
- Recurring weekly calls are calendared for months at a time
- Focus blocks ("deep work - Client A") are often blocked out, especially for designers/developers

**This means calendar = free time tracking data already waiting to be used.**

For Service Freelancers specifically, GigAnalytics' calendar integration can infer 30-50% of billable client hours automatically from existing Google Calendar data, before the user has manually logged a single time entry.

### Calendar Event Patterns (Service Freelancer)
| Event Type | Calendar Frequency | Time Trackable? | GigAnalytics Action |
|-----------|-------------------|-----------------|---------------------|
| Client calls ("Call with Acme") | Very high | ✅ Yes — exact duration | Auto-propose as billable entry |
| Project check-ins / standups | High | ✅ Yes | Auto-propose as billable |
| Coaching sessions | High (pre-booked via Calendly) | ✅ Yes | Auto-propose as billable |
| Deep work blocks ("Acme redesign") | Medium | ✅ Yes | Auto-propose as billable |
| Proposals / pitches | Low | ⚠️ Partial (meeting, not full proposal time) | Propose meeting time only |
| Admin / email / invoicing | Low | ⚠️ Partial | Tag as overhead |
| Personal appointments | Present | ❌ No — must exclude | Exclude from work calendar |

---

## CSV Export Patterns: What Service Freelancers Actually Export

Based on platform flow research and community patterns:

### Monthly (for invoicing/tax purposes)
- Upwork Transaction History CSV → confirm weekly earnings
- Stripe Balance CSV → reconcile with invoices sent
- Toggl Detailed Report CSV → calculate billable hours for invoices

### Quarterly
- PayPal Activity CSV → check direct payments from legacy clients
- Stripe Payout Reconciliation → match deposits to specific client payments

### Annually (tax season)
- All of the above plus 1099-K/1099-NEC from Upwork, Stripe, PayPal, Fiverr
- Toggl full-year export → estimate total hours worked

**The pain:** These files are in different formats, different date formats, different amount conventions (Upwork = net, Stripe = gross+fee separate, PayPal = gross+fee in same row). No tool aggregates them automatically.

---

## Ad Spend and Platform Fee Patterns

Service freelancers face two distinct cost structures that erode their stated $/hr:

### Platform Fees (Marketplaces)
| Platform | Fee | Effect on $/hr |
|----------|-----|---------------|
| Upwork | 10% flat | $100/hr stated → $90/hr net |
| Fiverr | 20% flat | $100/hr stated → $80/hr net |
| Toptal | 0% to freelancer (Toptal marks up client price) | No visible fee but rate-negotiation constraint |
| Upwork Connects | $0.15/Connect × 6/proposal = $0.90/proposal | At 20% conversion: $4.50 per won proposal in marketing spend |
| Freelancer Plus ($14.99/mo) | Monthly subscription | Amortize across won work |

### Ad Spend (Direct Client Acquisition)
Service freelancers who run ads to attract direct clients may spend:
- LinkedIn Ads: $50-200/month for B2B targeting (common for consultants)
- Google Ads: $100-500/month for "hire [specialty]" searches
- Facebook/Instagram: $50-150/month for creative professionals

**The gap GigAnalytics fills:** No tool connects "I spent $150 on LinkedIn ads this month" to "I got 2 new clients who paid $3,200 combined" to the resulting acquisition ROI calculation. Service freelancers who run ads are flying blind on ad effectiveness.

**MVP approach:** Manual ad spend input (enter monthly $ spent on platform/channel) → GigAnalytics shows: "LinkedIn: $150 → 2 clients → $3,200 revenue → 21.3× ROI. Upwork Connects: $18 → 3 clients → $2,400 revenue → 133× ROI."

---

## Specific Acceptance Criteria for Primary Segment

These complement the general AC-001 to AC-010 in `02-insight-brief.md` with service-freelancer-specific flows:

### SF-AC-001: Upwork + Stripe Cross-Stream Comparison
```
GIVEN a user has imported both Upwork CSV and Stripe CSV
AND has logged ≥2 hours of time per stream
WHEN they view the main dashboard
THEN they see BOTH streams with:
  - Upwork: gross reconstructed (net ÷ 0.9), fee shown explicitly as "Upwork 10% fee"
  - Stripe: gross shown, Stripe processing fee shown separately
  - Effective $/hr for each stream
  - Recommendation comparing the two
AND the comparison is the most prominent element on the screen
```

### SF-AC-002: Proposal Overhead Tracking
```
GIVEN a user creates a time entry
WHEN they tag it as "proposal" or "overhead" 
THEN the entry is categorized as non-billable overhead
AND it is attributed to the associated income stream (e.g., Upwork)
AND the stream's $/hr calculation includes these overhead hours
  (effective $/hr = net income ÷ (billable hours + overhead hours))
AND the dashboard shows: "Your Upwork effective rate including proposal time: $XX/hr"
```

### SF-AC-003: Per-Client Rate Breakdown (Multi-Direct)
```
GIVEN a user has multiple clients within the same payment platform (e.g., multiple Stripe clients)
WHEN they import Stripe CSV
THEN GigAnalytics proposes a client-level breakdown using:
  - customer_email or customer_description fields from Stripe CSV
  - Payment description/memo patterns
AND the user can confirm or merge client groupings
AND each client shows its own $/hr (if time entries are linked to that client)
```

### SF-AC-004: Calendar Auto-Propose on First Connect
```
GIVEN a user connects Google Calendar during onboarding
WHEN GigAnalytics scans the last 30 days
THEN it presents a review screen:
  "We found X calendar events that may be client work. Review:"
  [event] [stream assignment ▼] [Confirm / Skip]
AND the user can confirm all in bulk OR review individually
AND confirmed events create time entries with the event's start/end times
AND the total takes ≤3 minutes for a typical 30-event list
```

### SF-AC-005: Ad Spend ROI
```
GIVEN a user inputs a monthly ad spend amount and the channel
  (e.g., "LinkedIn Ads: $150")
WHEN a new client is attributed to that channel
  (user selects "How did they find you?" → "LinkedIn")
THEN GigAnalytics shows:
  - Clients acquired via LinkedIn this month: N
  - Revenue from those clients: $X
  - Ad spend: $150
  - Acquisition ROI: (X - 150) / 150 × 100 = Y%
  - Cost per acquired client: $150 / N
```

### SF-AC-006: Rate Increase Recommendation
```
GIVEN a user's effective $/hr for a stream is calculable
AND the benchmark layer has ≥50 comparable profiles (post-MVP)
WHEN the user views that stream
THEN they see a rate context block:
  "Your effective rate: $XX/hr"
  "Similar [UX designers / developers / coaches] with your profile: $YY–$ZZ/hr"
  "If you raised your Upwork rate to $ZZ, at current conversion: +$N/month"
OR (pre-benchmark, MVP):
  "Your effective Upwork rate is $XX/hr vs. $YY/hr on direct clients.
   Testing a higher Upwork rate won't affect existing clients."
```

---

## Primary Segment Feature Priority Additions

The following features become **P0 for the primary segment** (elevated from P1/P2 in general list):

| Feature | General Priority | Service Freelancer Priority | Reason |
|---------|-----------------|--------------------------|--------|
| Upwork gross reconstruction | P1 | **P0 for SF** | Upwork is the most common platform for this segment; without gross reconstruction the core $/hr comparison is wrong |
| Google Calendar integration | P1 | **P0 for SF** | 85% of SF have client meetings calendared; this is the lowest-friction time data source for the segment |
| Per-client breakdown within Stripe | P2 | **P1 for SF** | Multi-direct clients are a core sub-segment; client-level $/hr is the product's hero feature for them |
| Proposal/overhead time tagging | P2 | **P1 for SF** | The proposal-overhead cost is the most shocking insight for Upwork freelancers |
| Toggl API integration | P2 | **P1 for SF** | Most SF already use Toggl; importing existing data is the fastest path to full $/hr picture |

---

## Acquisition Strategy for Primary Segment

### Channels (in priority order)
1. **r/freelance** (2.2M members) — post case studies, answer "which platform pays better" questions
2. **Upwork Community** — post in "Tools & Resources"; answer rate-setting threads
3. **IndieHackers** — Build in public posts; "I built a tool that showed me my Upwork was earning $71/hr vs. direct clients' $118/hr"
4. **Twitter/X + LinkedIn** — Designer/developer communities; "freelance income transparency" thread format
5. **Creator newsletters** — "Freelancer Weekly," "The Freelance Informer," etc. — partnership/guest post

### Hook Message (Primary Segment)
> *"You track time in Toggl. You get paid via Stripe and Upwork. But do you know which one actually pays more per hour — after Upwork's 10% fee and all the proposal time you don't bill? GigAnalytics does the math automatically."*

### Conversion Trigger
The product's conversion trigger for Service Freelancers is the **first $/hr comparison moment** — when they see Upwork $71/hr vs. Direct $118/hr (or equivalent) for the first time. This moment needs to occur within the first 5 minutes of using the product.

Everything in the onboarding flow is optimized toward getting to this number as fast as possible:
1. Upload Stripe CSV (1 minute)
2. Upload Upwork CSV (30 seconds)
3. Name streams (30 seconds)
4. Log last week's hours per stream (2 minutes)
5. **See $/hr comparison** — the hero moment

Total target: **≤5 minutes to first insight.**

---

*This document supplements `02-insight-brief.md` and `03-feature-priorities.md` with primary-segment-specific depth. It serves as the brief for the Ideate phase focused on Service Freelancer workflows.*
