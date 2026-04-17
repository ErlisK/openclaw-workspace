# Jobs-to-be-Done (JTBD) Analysis — GigAnalytics

**Synthesized from:** 14 competitor analyses, 10 forum/community sources, 3 empathy maps, StackExchange API data  
**Date:** April 2026  
**Framework:** JTBD (When I… I want to… So I can…)

---

## What is a JTBD?

A Job-to-be-Done is the underlying progress a person is trying to make in a given circumstance. It is NOT a feature request — it is the motivational force that causes someone to "hire" a product. Understanding the job allows us to design GigAnalytics around real human progress, not assumed product features.

---

## Core JTBD Clusters

### Cluster 1: Financial Clarity

---

**JTBD 1.1 — True Hourly Rate Discovery**
> *When I finish a month of work across multiple platforms, I want to know my actual net earnings per hour on each income stream, so I can stop guessing and make confident decisions about where to invest my time next month.*

**Frequency signal:** Mentioned in 8/10 forum sources; most upvoted StackExchange time-tracking questions; dominant theme in r/freelance  
**Current "hired" solution:** Manual spreadsheet (common) OR mental estimation (most common) OR nothing (very common)  
**Why current solutions fail:** Manual entry gets abandoned in 3-4 weeks; mental estimation is consistently wrong; "nothing" = flying blind  
**GigAnalytics fit:** Automatic stream-level $/hr = the core product metric. Must be in the first screen post-onboarding.

---

**JTBD 1.2 — Unified Income View**
> *When I open my phone or laptop to check how my finances are doing, I want to see all income from all platforms in one place, so I can stop opening 4 separate apps and doing mental math.*

**Frequency signal:** "I wish there was a Mint for gig income" — organic phrasing across multiple Reddit communities  
**Current "hired" solution:** Multiple browser tabs + spreadsheet OR bank statement (shows deposits but not source breakdown)  
**Why current solutions fail:** Platform dashboards show gross only; bank account shows deposits but loses source attribution; spreadsheets require manual entry  
**GigAnalytics fit:** The unified dashboard IS the product. Every other feature sits on top of this.

---

**JTBD 1.3 — True Net Earnings After Platform Fees**
> *When I see my "earnings" in Fiverr, Upwork, or Etsy, I want to know what I actually take home after fees, so I can compare real income across platforms fairly.*

**Frequency signal:** YouTube "After Fees Reality Check" videos get 100K+ views; Fiverr 20% + Upwork 10% consistently misunderstood by new users  
**Current "hired" solution:** Manual subtraction in head or spreadsheet; most users simply don't calculate it  
**Why current solutions fail:** Platform dashboards show gross; fee deductions are buried in separate reports  
**GigAnalytics fit:** Platform-aware fee modeling (configurable rates: Fiverr 20%, Upwork 10%, Etsy 6.5%, etc.) applied automatically.

---

### Cluster 2: Rate Intelligence

---

**JTBD 2.1 — Rate Benchmarking**
> *When I'm considering raising my rates, I want to know what comparable freelancers in my field are actually charging, so I can make the decision with data instead of fear.*

**Frequency signal:** Most-discussed topic on r/freelance; StackExchange "hourly rate estimation" questions have 11K+ views; Indie Hackers founding teams discuss constantly  
**Current "hired" solution:** Asking in Reddit/Discord threads (anecdotal), looking at competitor Upwork profiles (visible but not filterable), or making a guess  
**Why current solutions fail:** Anecdotal = small sample size, subject to survivorship bias; Upwork profiles show top-line rates, not effective rates  
**GigAnalytics fit:** Anonymized aggregate benchmark layer — "Freelance developers with your skill mix in your market earn a median of $X/hr effective rate."

---

**JTBD 2.2 — Pricing Experiment Safety**
> *When I want to test a higher rate, I want a way to experiment without risking all my current clients, so I can raise my income without the fear of destroying what I've built.*

**Frequency signal:** r/freelance rate-increase threads; Upwork community pricing discussions; Product Hunt reviews of Toggl/Harvest asking "why doesn't it help me optimize pricing?"  
**Current "hired" solution:** Raise rates for new clients only (common but untracked); just try it and hope (risky); don't try (most common)  
**Why current solutions fail:** No structured experiment tracking; no statistical confidence; no before/after comparison  
**GigAnalytics fit:** A/B pricing experiments — assign new proposals/gigs to control (current rate) vs. treatment (test rate); track conversion and revenue outcomes.

---

**JTBD 2.3 — Income Goal Reverse Engineering**
> *When I set an income target (for rent, savings, a vacation, going full-time), I want to know exactly what rates and hours I need on each platform to hit it, so I can work toward a concrete plan instead of hoping it works out.*

**Frequency signal:** Cushion's core feature received highest praise in Product Hunt reviews; r/sidehustle income goal tracking discussions  
**Current "hired" solution:** Cushion (manual), spreadsheet projection, mental math  
**Why current solutions fail:** Cushion is manual-only; spreadsheets require financial modeling skills; mental math ignores fees  
**GigAnalytics fit:** "To hit your $5,000 target this month, at your current Fiverr rate of $47/hr effective, you need 14 more booked hours. You have 8 available based on your calendar."

---

### Cluster 3: Time Intelligence

---

**JTBD 3.1 — Frictionless Time Attribution**
> *When I finish a work session (or am about to start one), I want to log my time with minimal effort, so my time data is actually complete and reflects reality rather than my best guess.*

**Frequency signal:** #1 complaint about Toggl, Harvest, every time tracker; "I always forget to start/stop the timer" — universal  
**Current "hired" solution:** Toggl (low friction but still requires manual start/stop), calendar spreadsheet, memory + estimation, or nothing  
**Why current solutions fail:** Even Toggl requires discipline; interruptions cause forgotten entries; mobile logins add friction  
**GigAnalytics fit:** Calendar inference ("You had a 2-hour Zoom with Client A — add to time log?") + one-tap mobile widget + idle detection.

---

**JTBD 3.2 — Overhead Time Visibility**
> *When I calculate how much I "earn" from a platform or client, I want all my time counted — including proposals, revisions, communications, and admin — so I understand the true cost of each income stream.*

**Frequency signal:** StackExchange: "Should I bill for proposal time?" "Should I bill for bathroom breaks?" (9,497 views); Upwork community: "I spend 5 hrs/week on proposals that don't convert"  
**Current "hired" solution:** Bill for "core work" only; overhead is unpaid and untracked  
**Why current solutions fail:** Nobody tracks overhead time systematically; it never enters any analysis  
**GigAnalytics fit:** "Overhead time" category (proposals, revisions, communications) attributed per stream; included in true $/hr calculation.

---

**JTBD 3.3 — Availability Scheduling**
> *When I'm deciding whether to take on a new gig or client, I want to see my actual availability for the coming weeks, so I don't overcommit and burn out or undercommit and miss income.*

**Frequency signal:** Cushion's "year-at-a-glance" feature highest-praised in reviews; r/freelance overbooking stories regular; r/sidehustle "which app should I open right now?" scheduling questions  
**Current "hired" solution:** Cushion (manual), Google Calendar (time but not income-aware), mental tracking  
**Why current solutions fail:** Calendar doesn't connect to income; Cushion is manual  
**GigAnalytics fit:** Calendar-synced availability view with income density overlay; "You have 12 available hours next week. At your Fiverr effective rate, that's $564 potential income."

---

### Cluster 4: Stream Optimization

---

**JTBD 4.1 — Identify Which Income Streams to Grow or Quit**
> *When I'm deciding where to invest my limited time and energy, I want to know which of my income streams has the best ROI, so I can double down on what works and stop wasting time on what doesn't.*

**Frequency signal:** r/sidehustle "which hustle to cut" threads; r/Entrepreneur "ROI per stream" discussions; empathy map research (all 3 personas)  
**Current "hired" solution:** Gut feeling + emotional attachment to certain streams; conversations with friends  
**Why current solutions fail:** Emotional attachment to creative streams (like Etsy) masks financial reality; no data-driven framework exists  
**GigAnalytics fit:** Stream ROI ranking dashboard — "Your Gumroad products: $45/hr | Your Fiverr gigs: $24/hr | Your Etsy shop: $7/hr. Recommendation: Reduce Etsy, grow Gumroad."

---

**JTBD 4.2 — Platform Timing Optimization**
> *When I have 2 free hours and want to maximize income, I want to know which platform and time slot historically yields the best results, so I can work smarter instead of just harder.*

**Frequency signal:** r/sidehustle "when to drive DoorDash" threads; "when are buyers most active on Fiverr" searches; r/sidehustle timing optimization is a recurring question  
**Current "hired" solution:** Platform surge notifications (reactive, not strategic); anecdotal advice from communities  
**Why current solutions fail:** Platform surge alerts are real-time but not personalized; community advice is general, not based on individual data  
**GigAnalytics fit:** Personal heatmap — "Based on your history, your best Fiverr booking hours are Tuesday-Thursday 2-6pm. TaskRabbit peaks for you on Saturday mornings."

---

**JTBD 4.3 — Acquisition Cost ROI**
> *When I spend money on ads (Fiverr Promoted Gigs, Etsy Ads, Google Ads) or invest in certifications and tools, I want to know whether those investments are paying off, so I can stop wasting money on things that don't convert.*

**Frequency signal:** Etsy Ad ROI confusion in Etsy seller forums; Upwork Connects spend vs. hire rate; Fiverr Promoted Gigs spend visibility  
**Current "hired" solution:** Manual tracking of ad spend vs. orders received; guessing  
**Why current solutions fail:** Platform ad dashboards show impressions/clicks but don't connect to net income per dollar spent  
**GigAnalytics fit:** Acquisition ROI calculator — "Your Fiverr Promoted Gigs cost $40 last month and generated $320 in revenue. ROAS: 8x. Your Etsy Ads cost $25 and generated $60 in revenue. ROAS: 2.4x."

---

### Cluster 5: Administrative Relief

---

**JTBD 5.1 — Tax-Ready Record Keeping**
> *When tax season arrives, I want a single, complete record of all income from all sources, so I can file accurately without spending days reconstructing what happened throughout the year.*

**Frequency signal:** r/beermoney, r/sidehustle, StackExchange invoice questions; YouTube "multi-source income taxes" videos; universal across all personas  
**Current "hired" solution:** Export CSVs from each platform + QuickBooks SE for mileage + manual checking account review  
**Why current solutions fail:** Platform exports don't match; one platform's categories don't map to another's; CPA charges extra for complexity  
**GigAnalytics fit:** Unified annual income export — categorized by platform, net of fees, with expense deductions, IRS-schedule-ready.

---

**JTBD 5.2 — Payment Chase Reduction**
> *When a client owes me money, I want to know early (before it becomes a large outstanding balance) and have an easy way to follow up, so I don't lose income to silent non-payment.*

**Frequency signal:** StackExchange: "Client owes me $10K after 6 years of $500 invoices" (score 9); FreshBooks late payment automation is highest-praised feature  
**Current "hired" solution:** FreshBooks automated reminders (client work only); manual email follow-up; no system  
**Why current solutions fail:** No early warning for creeping non-payment; most multi-platform workers don't use invoicing tools  
**GigAnalytics fit:** Payment status tracking per client/platform with aging report and automated follow-up prompts.

---

## JTBD Priority Matrix

| JTBD | Frequency | Severity | GigAnalytics Fit | MVP Priority |
|------|-----------|----------|-----------------|--------------|
| 1.1 True hourly rate | 🔴 Highest | 🔴 Critical | Perfect | ✅ MVP |
| 1.2 Unified income view | 🔴 Highest | 🔴 Critical | Perfect | ✅ MVP |
| 1.3 Net after fees | 🔴 High | 🔴 High | Strong | ✅ MVP |
| 3.1 Frictionless time log | 🔴 High | 🔴 High | Strong | ✅ MVP |
| 4.1 Stream ROI ranking | 🔴 High | 🔴 High | Strong | ✅ MVP |
| 5.1 Tax-ready records | 🟡 High | 🟡 Medium | Good | ✅ MVP |
| 2.1 Rate benchmarking | 🟡 High | 🔴 High | Perfect | 🔄 V1.1 |
| 2.3 Goal reverse-engineering | 🟡 Medium | 🟡 Medium | Strong | 🔄 V1.1 |
| 3.3 Availability scheduling | 🟡 Medium | 🟡 Medium | Good | 🔄 V1.1 |
| 4.2 Platform timing heatmap | 🟡 Medium | 🟡 Medium | Unique | 🔄 V1.1 |
| 2.2 A/B pricing experiments | 🟡 Medium | 🟡 Medium | Unique | 🔄 V2 |
| 4.3 Acquisition ROI | 🟡 Low | 🟡 Medium | Good | 🔄 V2 |
| 3.2 Overhead time | 🟡 Low | 🟡 Medium | Unique | 🔄 V2 |
| 5.2 Payment chase | 🟡 Low | 🟡 Medium | Good | 🔄 V2 |

---

## The Single Most Important JTBD

If GigAnalytics could solve only one job, it is:

> **"When I finish a month of work across 2-5 income streams, show me my true net hourly rate per stream — automatically, without manual entry — so I can make one clear decision: where to invest my time next month."**

This single JTBD encompasses: unified data, fee modeling, time attribution, and actionable output. Everything else is an enhancement to this core.
