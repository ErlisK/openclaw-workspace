# QuickBooks Self-Employed — Competitor Analysis

**URL:** https://quickbooks.intuit.com/self-employed/  
**Analyzed:** April 2026  
**Category:** Accounting / Tax Automation

## Overview
- **Target User:** Sole proprietors, freelancers, gig workers (Uber, DoorDash) needing Schedule C tax prep
- **Pricing:** ~$15/month (Lite), $25/month (Plus with TurboTax bundle)
- **Core Value Prop:** Auto-separate business/personal expenses, mileage tracking, quarterly tax estimates

## Key Features
- Bank/credit card sync with automatic ML categorization
- GPS-based mileage auto-tracking
- Quarterly estimated tax calculator (Schedule C-ready)
- Invoice creation and sending
- TurboTax 1-click integration
- Receipt photo capture and OCR
- Profit & Loss report
- 1099 contractor income tracking

## UX Patterns
- **Onboarding:** 3-step wizard → connect bank → set tax profile → review categories
- **Data Input:** Swipe left/right to categorize transactions (Tinder-style approval UX)
- **Visualization:** Monthly P&L, expense category pie chart, estimated tax gauge
- **Mobile-first:** Primary UX is mobile; desktop is read-only summary
- **Smart defaults:** ML pre-categorizes transactions; user confirms or corrects

## Strengths
- Frictionless GPS mileage (background tracking, no taps required)
- TurboTax integration removes tax-season panic
- Bank sync via Plaid is reliable and broad
- Strong Intuit brand trust; many accountants already familiar

## Weaknesses / Gaps
- **No multi-income stream view** — all income lumped into one bucket
- **No time tracking** — zero concept of hourly rate or per-client ROI
- **No marketplace integrations** — no Fiverr, Upwork, Etsy API connections
- **No "true hourly rate"** — never computes effective $/hr per gig type
- **Single-job assumption** — designed for 1 job + 1 side hustle, not 2-5 streams
- **No pricing intelligence** — no rate increase suggestions, no A/B pricing
- **No scheduling** — no calendar/availability awareness
- Tax-focused = backward-looking; no forward-planning capabilities

## UX Flows (Annotated)
1. **Expense categorization:** Transaction list → swipe right (business) / left (personal) → suggested category → confirm. Fast but repetitive for high-volume users.
2. **Mileage tracking:** Enable background GPS → drive → auto-trip appears → tap business/personal → add purpose. Near-zero friction.
3. **Tax estimate:** Dashboard gauge "You owe ~$X this quarter" → breakdown → link to pay IRS. Clear but anxiety-inducing without context.

## Relevance to GigAnalytics
- **Key Opportunity:** QBO SE ignores multi-stream operators. Someone running Upwork + Etsy + local consulting has no stream-level P&L comparison. This is GigAnalytics' core advantage.
- **Borrow:** Mobile-first design, swipe-to-confirm UX pattern, passive data collection (we can do same for time).
- **Differentiate:** True hourly rate per stream, cross-stream ROI, forward-looking income projections, pricing experiments.
