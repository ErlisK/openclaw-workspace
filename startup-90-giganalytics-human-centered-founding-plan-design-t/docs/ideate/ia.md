# GigAnalytics — Information Architecture + Wireframe Index
## Route Map, Page Stubs, and Screenshot Catalog

**Document type:** IA + Wireframe Index  
**Date:** April 2026  
**Phase:** Ideate — Low-fi prototypes  
**Wireframe app:** `wireframes/` (Next.js 14, Tailwind CSS, static)

---

## Route Tree

```
/                     WF-00  Wireframe index (dev navigation)
/onboarding           WF-01  Landing + 4-step onboarding wizard
/dashboard            WF-02  ROI dashboard — $/hr comparison, goal, recommendation
/import               WF-03  CSV import hub — Stripe / PayPal / Upwork / Toggl / ICS
/timer                WF-04  One-tap timer + quick-log retroactive entry
/heatmap              WF-05  Heatmap — 3 states (building / weekly / full grid)
/roi                  WF-06  Acquisition ROI — platform fees + ad spend table
/pricing              WF-07  Pricing Lab C-lite — rate variance + simulator
/benchmark            WF-08  Benchmark opt-in modal + comparison view
```

---

## Wireframe Screenshots

| WF | Route | Screenshot | Key elements |
|----|-------|------------|-------------|
| WF-00 | `/` | [wf-00-index.png](screenshots/wf-00-index.png) | Navigation index, route descriptions |
| WF-01 | `/onboarding` | [wf-01-onboarding.png](screenshots/wf-01-onboarding.png) | Dark landing, CSV drop zone, 3 alt CTAs, value props |
| WF-02 | `/dashboard` | [wf-02-dashboard.png](screenshots/wf-02-dashboard.png) | Goal bar, ranked $/hr streams, AI recommendation, quick actions |
| WF-03 | `/import` | [wf-03-import.png](screenshots/wf-03-import.png) | Source grid, upload zone, detection result, stream assignment |
| WF-04 | `/timer` | [wf-04-timer.png](screenshots/wf-04-timer.png) | Idle widget, running state, stop review panel, quick-log, history |
| WF-05 | `/heatmap` | [wf-05-heatmap.png](screenshots/wf-05-heatmap.png) | All 3 states: building / day-of-week bar chart / full 7×24 grid |
| WF-06 | `/roi` | [wf-06-roi.png](screenshots/wf-06-roi.png) | Revenue/Cost/Net/ROI/$/hr table, cost breakdowns, add ad spend |
| WF-07 | `/pricing` | [wf-07-pricing.png](screenshots/wf-07-pricing.png) | Rate sparkline, variance explanation, live simulator, V2 teaser |
| WF-08 | `/benchmark` | [wf-08-benchmark.png](screenshots/wf-08-benchmark.png) | D7 opt-in modal, benchmark range bar, opt-out settings |

---

## 5 Core Routes — Detailed Specs

*(Full specs in `docs/ideate/05-ia-map.md`)*

### 1. `/dashboard` — ROI Dashboard
**Purpose:** Primary value surface. Shows effective $/hr per stream, ranked comparison, goal progress, AI recommendation.  
**Key components:** Goal progress bar · Stream cards (ranked by $/hr) · AI recommendation block · Quick action bar  
**Data needed:** transactions (aggregated) + time_entries (aggregated) + user goal  
**Auth:** Required · Free tier: 1 stream; Pro: unlimited  

### 2. `/import` — Data Import Hub
**Purpose:** Multi-format CSV ingestion with auto-detection. Stripe, PayPal, Upwork, Toggl, ICS calendar.  
**Key components:** Source grid · Drag-and-drop upload zone · Detection result card · Stream assignment · Import history  
**Data needed:** Uploaded file (multipart) → parse → transactions  
**Auth:** Required + email verified · Stripe free; others Pro  

### 3. `/timer` — One-Tap Timer
**Purpose:** Start/stop time tracking with minimum friction. Persistent running state across all pages.  
**Key components:** Stream selector + Start button · Running state (persistent header) · Stop review panel · Quick-log · Recent entries  
**Data needed:** time_entries (active + recent) · streams list  
**Auth:** Required · Timer on 1 device free; cross-device Pro  

### 4. `/heatmap` — Earnings Heatmap
**Purpose:** Show earnings density by hour-of-week. Progressive: placeholder → day-of-week → full grid.  
**Key components:** Building state (progress bar) · Day-of-week bar chart · 7×24 color grid · Peak time callouts  
**Data needed:** time_entries + transactions (joined, 60+ days)  
**Auth:** Required · Pro only (full heatmap); free: sees building state  

### 5. `/onboarding` — Landing + Setup Wizard
**Purpose:** Zero-friction first session. Value before signup wall. 4-step guided setup to $/hr.  
**Key components:** Hero headline · CSV drop zone (pre-signup) · Google OAuth · Stream naming · Time path choice (ICS / manual / timer) · Goal  
**Data needed:** None at entry; session stores CSV pre-signup  
**Auth:** Public entry → signup after CSV preview  

---

## Running the Wireframes Locally

```bash
cd wireframes
npm install
npm run dev
# Open http://localhost:3000
```

Build (static export):
```bash
npm run build
```

---

## Wireframe → Production Traceability

| WF stub | Production route | Key AC | Sprint |
|---------|-----------------|--------|--------|
| WF-01 Onboarding | `/` + `/onboarding/*` | AC-F1.1–F1.6 | Week 1 |
| WF-02 Dashboard | `/dashboard` | AC-F5.1–F5.7 | Week 5 |
| WF-03 Import | `/import/*` | AC-F3.1–F3.7 | Week 2–3 |
| WF-04 Timer | `/timer` | AC-F4.1–F4.9 | Week 4 |
| WF-05 Heatmap | `/heatmap` | AC-F6.1–F6.4 | Week 7 |
| WF-06 ROI | `/roi` | AC from `05-product-requirements.md` | Week 7 |
| WF-07 Pricing | `/streams/[id]` | AC-RATE-1–6 | Week 5 |
| WF-08 Benchmark | `/benchmark` + D7 modal | AC-F7 benchmark | Week 7 |
