# Competitor Overview Matrix

**Analysis Date:** April 2026  
**Purpose:** Compare 14 competitors across dimensions relevant to GigAnalytics

## Quick Reference Matrix

| Competitor | Category | Time Tracking | Multi-Platform | True Hourly Rate | Income Goals | Pricing Intel | Mobile-First | Pricing |
|------------|----------|:---:|:---:|:---:|:---:|:---:|:---:|---------|
| QuickBooks Self-Employed | Accounting | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | $15-25/mo |
| Toggl Track | Time Tracking | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | Free-$18/user |
| Harvest | Time+Invoice | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | $12/user |
| Cushion | Income Planning | ❌ | ❌ | ❌ | ✅ | ❌ | ⚠️ | $16/mo |
| Wave | Accounting | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | Free |
| PayPal Dashboard | Payments | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Free |
| Stripe Dashboard | Payments | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | Free |
| Fiverr Analytics | Marketplace | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Free |
| Upwork Analytics | Marketplace | ⚠️* | ❌ | ❌ | ❌ | ❌ | ⚠️ | Free |
| Etsy Analytics | Marketplace | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Free |
| Shopify Analytics | E-commerce | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | $29-299/mo |
| Notion Templates | DIY | ⚠️** | ❌ | ⚠️** | ⚠️** | ❌ | ❌ | Free-$15/mo |
| FreshBooks | Accounting | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | $19-60/mo |
| Bonsai (AND.CO) | All-in-One | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ | $17-52/mo |
| **GigAnalytics** | **Multi-Gig Analytics** | **✅** | **✅** | **✅** | **✅** | **✅** | **✅** | **TBD** |

*Upwork time tracking only for hourly contracts within Upwork  
**Notion: manual formulas possible but no automation  
⚠️ = partial/limited  

## Key Finding: The Multi-Platform Gap

**Zero competitors offer cross-platform income aggregation.** Every tool is either:
1. A single-marketplace dashboard (Fiverr, Upwork, Etsy, Shopify) — siloed
2. A general freelance tool (Toggl, Harvest, FreshBooks, Bonsai) — assumes client-billing model only
3. An accounting tool (QBO, Wave) — backward-looking tax focus

**The multi-gig worker with 2-5 income streams has no purpose-built analytics tool.** They must use 2-5 separate dashboards + a spreadsheet.

## Key Finding: True Hourly Rate is Universally Missing

Not a single competitor computes:
> Net hourly earnings = (Platform payment - platform fees) ÷ hours actually worked

This is the #1 metric GigAnalytics must own.

## Key Finding: Pricing Intelligence is Completely Absent

No competitor offers:
- "Your pricing is 23% below peers at your skill level"
- "Raising your Fiverr rate from $50 to $65 is likely to maintain conversion based on your stats"
- A/B pricing experiments across platforms

## Integration Landscape

| Platform | Import Method | API Available |
|----------|--------------|---------------|
| QuickBooks | CSV export | OAuth API |
| Stripe | CSV / API | Yes (extensive) |
| PayPal | CSV export | Yes |
| Fiverr | CSV export | Limited |
| Upwork | CSV export | Yes (REST) |
| Etsy | CSV export | Yes (OAuth) |
| Shopify | CSV / API | Yes (extensive) |
| Wave | CSV export | API (basic) |
| FreshBooks | CSV export | OAuth API |

**GigAnalytics onboarding strategy:** CSV upload first (works for all), then OAuth integrations for real-time sync (Stripe, Etsy, Upwork priority).

## Competitive White Space

GigAnalytics can own the following uncontested territory:
1. **True hourly rate** per income stream, after platform fees
2. **Cross-platform income aggregation** in one dashboard
3. **Benchmark intelligence** — how do you compare to similar multi-gig workers?
4. **Pricing experiments** — A/B test rates across platforms with statistical confidence
5. **Scheduling heatmap** — when to be available for maximum income
6. **Friction-minimized logging** — calendar inference + one-tap timer (Toggl's UX + revenue context)
7. **Forward-looking projections** — "At your current pace, you'll hit $X by end of year"
