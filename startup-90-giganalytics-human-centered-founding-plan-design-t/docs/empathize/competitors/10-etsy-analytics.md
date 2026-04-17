# Etsy Shop Analytics — Competitor Analysis

**URL:** https://www.etsy.com/ (Seller Dashboard)  
**Analyzed:** April 2026  
**Category:** Marketplace Built-in Analytics

## Overview
- **Target User:** Etsy sellers — handmade goods, digital downloads, vintage items; primarily hobbyists and side-hustlers
- **Pricing:** Free analytics; listing fee $0.20, 6.5% transaction fee, 3% + $0.25 payment processing, 15% Offsite Ads
- **Core Value Prop:** Understand your shop's performance within the Etsy marketplace

## Key Features
- Shop stats: visits, orders, revenue by day/week/month/year
- Traffic sources breakdown (Etsy search, direct, social, Google)
- Listing performance (views per listing, conversion rate)
- Search keyword analytics (what buyers searched to find you)
- Star Seller badge system (tracks ship time, response rate, reviews)
- Offsite Ads performance (impressions, clicks, orders, fees paid)
- Revenue by listing type
- Buyer demographics (country)
- CSV export for orders and finances

## UX Patterns
- **Dashboard:** Stats tab shows visits and revenue graphs; prominently featured
- **Listing Analytics:** Click any listing → see views, favorites, purchases, conversion rate
- **Traffic Sources:** Pie chart of where visits come from — very useful for marketing decisions
- **Keyword Insights:** "Top keywords that led to views" — powerful for SEO/listing optimization
- **Star Seller:** Badge criteria visible with progress bars (very Cushion-like)

## Strengths
- Search keyword data is uniquely valuable (SEO intelligence)
- Traffic source breakdown helps sellers understand where to market
- Listing-level conversion rates enable product optimization
- Star Seller system creates clear quality improvement incentives
- Finance CSV export is comprehensive

## Weaknesses / Gaps (Critical for GigAnalytics)
- **No time tracking** — no concept of production time vs. revenue
- **No true hourly rate** — a seller making $1,000/month may spend 80 hours → $12.50/hr after fees
- **Total fee opacity** — transaction + processing + offsite ads fees are shown separately; total take-home unclear
- **No cross-platform view** — Etsy is siloed from Shopify, Fiverr, etc.
- **No pricing optimization** — no "raise this listing's price" suggestion
- **No income goal tracking**
- **Analytics end at the listing level** — no product-line or category aggregation
- **No time-of-day or seasonality heatmap**

## UX Flows (Annotated)
1. **Shop stats flow:** Stats → date range selector → visits/revenue chart → click date → see order detail. Clean but siloed.
2. **Listing optimization flow:** Listings → click listing → Stats panel shows views/conversions → compare to similar listings manually. No automated benchmarking.
3. **Finance report flow:** Finances → Monthly Statement → download CSV. Comprehensive but requires spreadsheet work to interpret.

## Relevance to GigAnalytics
- **Key user segment:** Etsy sellers who also sell on Shopify, do Fiverr design gigs, or work other side hustles are a prime GigAnalytics user.
- **Integration target:** Etsy CSV export; potential OAuth API for real-time sync.
- **Solve:** Etsy sellers need to know their true hourly rate (production time + listing management + customer service) to understand if their shop is worth running vs. freelance alternatives.
