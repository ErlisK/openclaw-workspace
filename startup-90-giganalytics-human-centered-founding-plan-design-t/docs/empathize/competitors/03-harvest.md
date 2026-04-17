# Harvest — Competitor Analysis

**URL:** https://www.getharvest.com/  
**Analyzed:** April 2026  
**Category:** Time Tracking + Invoicing

## Overview
- **Target User:** Professional services teams (agencies, consultants, developers); solo freelancers who bill clients
- **Pricing:** Free (1 user, 2 projects), $12/user/month (Pro unlimited) — since 2006, very established
- **Core Value Prop:** Track time → invoice clients → measure project profitability in one platform

## Key Features
- 1-click timers from desktop, web, mobile, browser extension
- Automatic invoice generation from tracked billable hours
- Online payment acceptance (Stripe/PayPal integration)
- Project budget tracking with overage alerts
- Capacity and utilization reports
- Team workload visualization
- Expense tracking with receipt upload
- QuickBooks and Xero integration
- 50+ third-party integrations
- Client-facing time reports

## UX Patterns
- **Onboarding:** Create project → assign team → start tracking; guided setup wizard
- **Data Input:** Timesheet-style week view plus running timer; bulk entry for multiple days
- **Project View:** Budget gauge (% used) always visible; color changes as budget depletes
- **Invoicing Flow:** Select project → "Invoice for billable time" → review line items → send; 2-click invoicing
- **Reporting:** Visual charts for hours per project, client revenue, team capacity

## Strengths
- Best-in-class project budget tracking with real-time alerts
- Seamless time → invoice → payment workflow (end-to-end for client work)
- 4.5 billion hours tracked; proven at scale
- Strong agency/team adoption means clients expect it
- Clean, professional UI inspires billing confidence

## Weaknesses / Gaps
- **Not designed for multi-platform gig workers** — assumes client-project model, not platforms
- **No platform fee modeling** — doesn't account for Upwork 10% or Fiverr 20% cut
- **No true hourly rate across platforms** — each "project" is siloed
- **Expensive per-user pricing** for solo freelancers
- **No A/B pricing experiments**
- **No availability/scheduling heatmap**
- **No income benchmark** — no comparison to peers

## UX Flows (Annotated)
1. **Time → Invoice:** Timer runs on project → week ends → "Create Invoice" button on project page → line items pre-filled → adjust → send. Elegant.
2. **Budget alert:** Set project budget → gauge fills as hours logged → email alert at 75% + 100% → visual red state. Great proactive UX.
3. **Team capacity:** Resource view shows who has open hours next week → drag to re-assign. Overkill for solos.

## Relevance to GigAnalytics
- **Opportunity:** Harvest excels at client billing but fails multi-platform gig workers. Its time→invoice flow is a model worth learning from, but adapted to "time on Fiverr → net earnings after fees."
- **Borrow:** Budget gauge UX pattern for income goal tracking; 2-click invoice flow; capacity visualization adapted for gig scheduling.
- **Differentiate:** Platform-aware (account for fees), stream comparison, no per-project billing model needed.
