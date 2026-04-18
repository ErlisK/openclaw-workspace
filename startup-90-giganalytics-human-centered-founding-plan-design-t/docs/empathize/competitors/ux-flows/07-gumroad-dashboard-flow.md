# Annotated UX Flow 07: Gumroad — Sales Dashboard + Export
## Source: https://help.gumroad.com/ · Gumroad product documentation | Friction Score: 2/5

---

## Context
A creator checks their Gumroad dashboard after a product launch. They sold a $97 course and a $15 ebook.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Dashboard — Real-Time Earnings                  ║
╠══════════════════════════════════════════════════════════╣
║  Today:         $194.00  (2 sales)                       ║
║  This week:     $891.00  (12 sales)                      ║
║  Last 30 days: $3,240.00  (41 sales)                     ║
║  All time:    $18,420.00                                  ║
║                                                          ║
║  Recent sales (live feed):                               ║
║  $87.30  Freelance Course  · 10 min ago · Austin TX      ║
║  $13.50  Remote Work Ebook · 2 hrs ago · London UK       ║
║                                                          ║
║  ✓ BEST IN CLASS: Real-time earnings. Geographic data.   ║
║  ✓ Amounts shown are NET (after 10% Gumroad fee).        ║
║  ✓ "Earned while you were away" framing feels passive.   ║
║  ✗ No time-invested dimension (creation hours unknown).  ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: Per-Product Analytics                           ║
╠══════════════════════════════════════════════════════════╣
║  [Complete Freelance Course]                             ║
║  Views: 1,240  Conversions: 3.8%  Revenue: $12,400       ║
║  Top referrers: Twitter 40% · Direct 35% · Google 25%    ║
║                                                          ║
║  ✓ GOOD: Conversion rate per product.                    ║
║  ✓ GOOD: Referrer source = acquisition channel data.     ║
║  ✗ MISSING: No "hours to create" → no $/hr on creation.  ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: CSV Export                                      ║
╠══════════════════════════════════════════════════════════╣
║  Analytics → Sales → [Download CSV]                      ║
║                                                          ║
║  Columns include:                                        ║
║  sale_id, created_at, product_name, amount,              ║
║  gumroad_fee, net_amount, buyer_email,                   ║
║  referrer, utm_source, utm_medium, utm_campaign          ║
║                                                          ║
║  ✓✓ BEST IN CLASS CSV:                                   ║
║    • Explicit fee column (gumroad_fee)                   ║
║    • Explicit net column (net_amount)                    ║
║    • UTM attribution for marketing ROI                   ║
║    • Referrer for acquisition channel analysis           ║
║  Compare to Etsy's 2-file mess → night and day.          ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Emulate real-time earnings counter on dashboard
2. Emulate "earned while away" framing for passive income
3. Import utm_source → show "which marketing channel drives highest revenue per hour of marketing effort"
4. Add "product creation time" input → calculate payback period and true $/hr on creation investment
