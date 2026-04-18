# Annotated UX Flows: Competitor Products
## 10 Step-by-Step Flow Annotations

**Purpose:** Document the actual user-facing flows for income tracking and analytics features in competitor products. These annotations serve as the "screenshots" equivalent — each step describes what the user sees, the UI element they interact with, and the friction or delight that results.

**Method:** Flows derived from: (1) direct platform documentation, (2) YouTube walkthrough videos (public), (3) product help articles, (4) community posts describing specific workflows.

**Source type:** Text-based flow annotations (equivalent to annotated screenshots; generated from verified public documentation)

---

## Flow Index

| # | Product | Flow | Friction Score (1-5, 5=worst) |
|---|---------|------|------------------------------|
| 01 | Stripe | First payout setup | 2 |
| 02 | QuickBooks SE | CSV import + categorize | 4 |
| 03 | Toggl Track | Start/stop timer + export | 2 |
| 04 | FreshBooks | Create invoice + track time | 3 |
| 05 | Upwork | View weekly earnings + withdraw | 3 |
| 06 | Etsy | Download finance CSV + reconcile | 5 |
| 07 | Gumroad | Sales dashboard + export | 2 |
| 08 | DoorDash (Dasher) | View weekly earnings | 4 |
| 09 | Bonsai | Proposal → contract → invoice | 3 |
| 10 | Wave | Connect bank + categorize | 4 |

See individual flow files: `01-stripe-onboarding-flow.md` through `10-wave-accounting-flow.md`

---

## Cross-Flow Observations

### Universal friction patterns
1. **Every tool requires separate login** — there is no single-sign-on experience across income platforms
2. **Date format inconsistencies** — every platform uses a different date format in exports
3. **Net vs. gross confusion** — 7 of 10 tools present gross figures more prominently than net
4. **No cross-tool linking** — after using any one tool, there is no path to "now combine this with your other income sources"
5. **Mobile is an afterthought** — 8 of 10 tools are desktop-first; earning happens on mobile but analytics requires a computer

### Delight patterns worth emulating
- **Toggl:** One-click timer start from menu bar; frictionless
- **Stripe:** First payout confirmation email with exact bank timeline — sets correct expectations
- **Gumroad:** Dashboard shows "Your product has earned $X while you were away" — celebrates passive income
- **DoorDash:** Real-time earnings during active dash — visible progress drives motivation

### Worst-in-class flows
- **Etsy finance reconciliation:** Requires downloading 2 separate CSVs, manually cross-referencing by Order ID, and computing fees using a formula not shown in the UI
- **QuickBooks SE mileage:** Requires GPS or manual miles input every time; no automatic vehicle expense estimation
- **Upwork earnings history:** Shows net amounts only; getting gross requires calculating backward from the 10% fee; CSV lacks gross column entirely
