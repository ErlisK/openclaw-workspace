# Upwork Freelancer Analytics — Competitor Analysis

**URL:** https://www.upwork.com/  
**Analyzed:** April 2026  
**Category:** Marketplace Built-in Analytics

## Overview
- **Target User:** Freelancers earning on Upwork marketplace (hourly and fixed-price contracts)
- **Pricing:** Free dashboard; Upwork charges 10% on earnings over $10K lifetime per client (was 20% until 2023), plus $14.99/month Freelancer Plus (optional)
- **Core Value Prop:** Track earnings, manage contracts, monitor profile performance on Upwork

## Key Features
- Earnings report (weekly/monthly/yearly, by contract)
- Hourly contract: automatic time tracking via Upwork Desktop App (screenshots required for payment protection)
- Active and completed contract list
- Proposal success metrics (proposals sent vs. hired rate)
- Job Success Score (JSS) — composite metric of client satisfaction
- Top Rated / Expert-Vetted badge system
- Profile views and search ranking indicators
- Available Connects balance (bidding currency)
- Tax forms (1099-NEC for US freelancers)
- Wallet with USD/local currency options

## UX Patterns
- **Dashboard:** Active contracts list, pending milestones, earnings widget, JSS display
- **Reports:** Weekly earnings summary email; Reports tab with contract-level breakdown
- **Time Tracker:** Desktop app runs during hourly work, takes screenshots every 10 min for dispute protection
- **Profile Analytics:** Views this week/month, search appearances (limited data)
- **Mobile:** Messaging-focused; limited contract management

## Strengths
- Automatic time tracking for hourly contracts (integrated with payment)
- JSS is a useful reputation metric that drives client decisions
- Clear weekly payment cycle (reliable cash flow)
- 1099-NEC generation saves tax work
- Milestone tracking for fixed-price projects

## Weaknesses / Gaps (Critical for GigAnalytics)
- **Upwork-only view** — zero visibility into other income sources
- **No effective hourly rate across projects** — can compare contract rates but not time-weighted across all work
- **Screenshots for hourly tracking are invasive** — many freelancers avoid hourly contracts due to surveillance
- **No platform fee impact analysis** — 10% cut is not shown clearly in earnings reports
- **No "should I raise my rate?" intelligence**
- **No scheduling heatmap** — when to be online for best response rate
- **JSS is opaque** — algorithm is black-box, causing anxiety without actionable fix
- **No cross-platform aggregation**
- **Limited export capabilities**

## UX Flows (Annotated)
1. **Earnings report:** Reports → Earnings → Select period → See by contract → Download CSV. Functional, not beautiful.
2. **Hourly time tracking:** Start Upwork app → Work → App screenshots every 10 min → End session → Billed automatically → Weekly payment. Effective but surveillance-heavy.
3. **Proposal analytics:** Proposals sent this month: X, Hired: Y (Z%). Limited insight, no A/B testing.

## Relevance to GigAnalytics
- **Integration target:** Upwork CSV export is a key import. Many freelancers earn on Upwork + other platforms.
- **Pain to solve:** Upwork freelancers have no idea if they earn more $/hr on Upwork vs. Fiverr vs. direct clients — after fees, admin time, and proposal effort. GigAnalytics makes this comparison instant.
- **Anti-surveillance opportunity:** GigAnalytics' calendar-inference and one-tap timer respects privacy in a way Upwork's screenshot tool doesn't.
