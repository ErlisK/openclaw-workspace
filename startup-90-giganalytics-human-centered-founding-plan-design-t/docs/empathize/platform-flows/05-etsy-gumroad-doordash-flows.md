# Platform Flow Archive: Etsy, Gumroad, and DoorDash
## Payout Cadence, CSV Export Schema, Fee Structures

**Source:** Platform help centers, public developer documentation, community documentation — verified April 2026  
**Relevance:** These three platforms represent the Creator-Seller (Etsy, Gumroad) and Platform Gig Worker (DoorDash) proto-personas respectively. They have distinct fee structures, payout cadences, and export capabilities.

---

# Part A: Etsy

## A1. Fee Structure (2024–2025)

Etsy's fee stack is notoriously complex and a major pain point in community forums.

### Per-Listing Fees
| Fee | Amount |
|-----|--------|
| Listing fee | $0.20 per active listing per 4 months |
| Renewal fee | $0.20 when item sells and auto-renews |
| Multi-quantity | $0.20 additional for each unit after first in multi-quantity listing |

### Per-Transaction Fees (on each sale)
| Fee | Rate | Applied To |
|-----|------|-----------|
| Transaction fee | 6.5% | Item price + shipping + gift wrap |
| Etsy Payments processing | 3% + $0.25 | Order total (US) |
| Offsite Ads (if applicable) | 12% or 15% | Sales from Etsy-placed ads |
| Regulatory operating fee | 0.25% | Certain countries (UK, France, Spain, Italy, Turkey) |

**Total fee on a typical US sale:**
- Transaction: 6.5%
- Payments processing: 3% + $0.25
- **Effective total: ~9.5% + $0.25 per sale** (without Offsite Ads)

**With Offsite Ads (mandatory for sellers >$10K/year):**
- Additional 12% of sale price for any order originating from an Etsy-placed ad
- Sellers under $10K/year can opt out of Offsite Ads
- **With Offsite Ads: ~21.5% + $0.25 total on affected orders**

### Offsite Ads: The Hidden Fee
- Etsy places your listings on Google, Facebook, Instagram, Pinterest, Bing
- You pay 12-15% of any resulting sale (15% if under $10K/year; 12% if over $10K/year)
- You **cannot opt out if you earned >$10K from Etsy in the last 365 days**
- Fee applies for 30 days after the customer first clicked the ad
- Community forum pain point: "A customer saved my item and bought it 28 days later — Offsite Ads took 15%"

---

## A2. Payout Cadence

### Etsy Payments Schedule
- Etsy holds funds for a **rolling processing period** (typically 3 days after order completion date)
- Order completion = marked shipped by seller + buyer receives (or set number of days after ship date)
- After processing period: funds added to seller's "Available" balance
- **Weekly automatic deposit:** Etsy deposits available balance to bank account every Monday (for most sellers)
- First-time sellers: may wait up to 5 business days for first deposit while bank account is verified

### Payout Timeline Example
```
Monday:    Order placed
Wednesday: Seller ships
Wednesday+3 days = Saturday: Order "completes" (system estimate)
Saturday+3 days = Tuesday: Funds enter Available balance
Following Monday: Weekly deposit sent to bank
~Thursday: Bank account receives funds
```

**Total time from sale to bank: 7–14 days**

### Statement Reserve
Etsy may hold a percentage of sales as a "Statement Reserve" if account is in negative balance (e.g., fees exceeded payments in a period). This is a significant pain point for high-fee months.

---

## A3. CSV Export Schema

### Etsy Payments CSV (Download: Finances → Etsy Payments)

| Column | Description |
|--------|-------------|
| `Date` | Payment date |
| `Type` | Transaction type |
| `Title` | Item title |
| `Info` | Additional description |
| `Currency` | Transaction currency |
| `Amount` | Gross amount |
| `Fees & Taxes` | Total fees and taxes deducted |
| `Net` | Amount after fees |
| `Order ID` | Etsy order ID |
| `Item ID` | Etsy listing ID |

### Etsy Orders CSV (Download: Orders)

| Column | Description |
|--------|-------------|
| `Order ID` | Unique order identifier |
| `Sale Date` | Date of order |
| `Last Modified` | Last status update |
| `Item Name` | Product name |
| `Variations` | Item variation details |
| `Quantity` | Units ordered |
| `Price Per Item` | Listed price |
| `Discount Amount` | Applied discount |
| `Coupon Code` | Coupon used |
| `Order Value` | Total order value |
| `Discounts` | Total discounts |
| `Coupon Discounts` | Coupon value |
| `Shipping` | Shipping charged |
| `Sales Tax` | Tax collected |
| `Order Total` | Final order total |
| `Listing ID` | Link to listing |
| `Order Type` | Digital or physical |
| `Payment Type` | Etsy Payments |
| `Country` | Buyer country |
| `Ship Name` | Shipping recipient |
| `Ship Address 1-2` | Address lines |
| `Ship City/State/Zip` | Location |

**Key gap:** Etsy Orders CSV does not include fee breakdowns (transaction fee, processing fee, Offsite Ads fee) at order level. To calculate true net per order, fees from the Payments CSV must be cross-referenced by Order ID.

---

## A4. GigAnalytics Import Notes

```
Etsy total fees per order = 
  $0.20 listing fee
  + 6.5% × item price
  + (3% + $0.25) × order total
  + (12% or 15%) × order total IF Offsite Ads

True net per order = Order Total - All of above

But Etsy CSV doesn't pre-calculate this per order!
GigAnalytics must compute it using Etsy's fee formula.
```

---

# Part B: Gumroad

## B1. Fee Structure (2024–2025)

Gumroad simplified to a **flat 10% fee** in 2021, replacing previous tier structure.

| Fee Component | Rate |
|---------------|------|
| Gumroad platform fee | 10% of each sale |
| Payment processing | Included in the 10% |
| Payout fee (to PayPal) | $0 additional |
| Payout fee (to bank ACH) | $0 additional |
| Currency conversion | 1.5% above base rate |

**Example:**
```
Product sold for $29
Gumroad takes: $2.90 (10%)
Seller receives: $26.10
Payment processing: included in Gumroad's 10%
```

**Comparison to Stripe direct:**
- Stripe direct: 2.9% + $0.30 = $1.14 on $29 sale
- Gumroad: $2.90 on same sale
- Gumroad premium for simplicity: $1.76 per $29 sale (~6% difference)

---

## B2. Payout Cadence

- **Weekly payouts:** Every Friday, for earnings from the previous week
- **Minimum payout:** $10 (earnings below threshold accumulate to next payout)
- **Payout methods:** Stripe (instant to bank), PayPal, bank transfer (US/international)
- **Hold period:** None for established accounts (new accounts may have 30-day initial hold)
- **Tax form threshold:** Gumroad issues 1099-K for US sellers earning >$600/year

### Gumroad Payout Timeline
```
Monday:    Sale completed
Friday:    Weekly payout processed (includes Monday's sale)
Friday+2-3 days: Bank account receives funds (ACH)
Total: ~7-10 days from sale to bank
```

---

## B3. CSV Export Schema

### Gumroad Sales CSV (Dashboard → Analytics → Download CSV)

| Column | Description |
|--------|-------------|
| `sale_id` | Unique Gumroad sale ID |
| `created_at` | Sale timestamp (UTC) |
| `product_id` | Product identifier |
| `product_name` | Product name |
| `permalink` | Product URL slug |
| `product_type` | digital, physical, subscription, etc. |
| `quantity` | Units sold |
| `price` | Listed price |
| `amount` | Gross revenue from this sale |
| `gumroad_fee` | 10% fee amount |
| `net_amount` | Amount after fee |
| `payment_method` | paypal, card, etc. |
| `currency` | Currency code |
| `buyer_email` | Buyer email (may be partial for privacy) |
| `country` | Buyer country |
| `ip_country` | IP-detected country |
| `referrer` | Where the sale came from (URL) |
| `custom_fields` | Any custom checkout fields |
| `is_recurring` | Whether it's a subscription |
| `recurrence` | monthly, annual, etc. |
| `subscription_duration` | How long subscriber has been active |
| `offer_code` | Discount code used |
| `utm_source` | Marketing attribution UTM |
| `utm_medium` | Marketing attribution UTM |
| `utm_campaign` | Marketing attribution UTM |

**Notable strengths vs. Etsy:**
- `gumroad_fee` is explicit per-sale — no manual calculation needed
- `net_amount` directly usable
- `referrer` + `utm_*` fields enable marketing attribution analysis
- `recurrence` enables subscription income modeling

**GigAnalytics opportunity:** Gumroad's `referrer` column tells you whether a sale came from Twitter, a blog post, YouTube, or direct. This is acquisition channel data that could power "which marketing channel drives your best ROI?" analysis.

---

## B4. Time Tracking Note (Gumroad)

Gumroad is a passive income platform by design — sales happen without seller involvement.

**But creation time is real:**
- Writing/designing a product: 10-40 hours upfront
- Product updates/maintenance: 2-5 hours/year per product
- Customer support: 0.5-2 hours/month per product
- Marketing: variable

None of this is tracked by Gumroad. A creator who spent 40 hours making a $15 eBook that sells 100 times ($1,350 net) earned $33.75/hr on creation time — but without tracking, it "feels passive."

**GigAnalytics implication:** For digital product creators, offer a "product creation log" where they record creation hours once. GigAnalytics then calculates:
- $/hr on creation investment: total net earnings / creation hours
- Payback period: when cumulative earnings exceeded creation time × hourly rate
- Ongoing "passive" rate: post-creation earnings / maintenance hours

---

# Part C: DoorDash / Gig Delivery Platforms

## C1. Fee Structure (Dasher/Driver Side)

DoorDash drivers ("Dashers") do not pay fees to DoorDash. Their earnings model is:

| Component | Description |
|-----------|-------------|
| Base pay | $2.00–$10.00 per delivery (varies by estimated time, distance, desirability) |
| Promotions | Peak Pay (+$X per delivery during busy periods), Challenges (bonuses for completing N deliveries) |
| Tips | Customer tips passed 100% to Dasher (since 2019 policy change) |
| DashDirect bonus | Additional earnings if using DashDirect bank account |

**Typical gross earnings range:**
- High utilization (peak hours): $18-26/hr gross
- Off-peak: $10-15/hr gross
- Including tip income: adds 20-40% to base

---

## C2. Payout Cadence

| Payout Option | Timing | Cost |
|--------------|--------|------|
| Weekly direct deposit (standard) | Every Monday for prior week | Free |
| Fast Pay (instant) | Any time, within 24 hours | $1.99 per transfer |
| DashDirect Visa card | Real-time after each delivery | Free (but requires DashDirect account) |

### Fast Pay vs. Weekly
- **Fast Pay:** Pay $1.99 to get earnings immediately; heavy users of Fast Pay may spend $15-20/month on fees
- **Weekly:** Free but 1-week delay; many Dashers use this as default
- **DashDirect:** Best financially (free + real-time) but requires opening a new bank account product

---

## C3. CSV/Data Export

DoorDash **does NOT offer a CSV export** of Dasher earnings to end users.

**What is available in the Dasher app:**
- Weekly earnings summary (gross, base pay, promotions, tips)
- Per-delivery details (order #, payout, time, distance) — visible in app, not exportable
- Annual earnings summary (for tax purposes, visible in January)
- 1099-NEC form (if earnings >$600/year) — downloadable PDF

**Tax document access:** `dasher.doordash.com/tax` → download annual 1099-NEC

**What Dashers actually do:**
- Screenshot weekly earnings screens for records
- Some use Stride Tax app (free mileage + expense tracker for gig workers) which integrates with DoorDash indirectly
- Many rely purely on bank deposits for income tracking

### GigAnalytics Import Options for DoorDash
Since no CSV export exists, GigAnalytics must use one of:
1. **Manual entry:** User inputs weekly earnings total + hours worked (most common for this persona)
2. **Bank transaction detection:** DoorDash ACH deposits appear as "DOORDASH INC" — can detect from bank CSV
3. **Stride/Gridwise integration:** Third-party apps that aggregate gig earnings (Gridwise has an API)
4. **Estimated calculation:** Hours × stated $/hr with expense deductions applied

---

## C4. DoorDash Expense Reality

The major hidden cost for Dashers is **vehicle expenses**:

### IRS Mileage Rate (2024): $0.67 per mile
A Dasher driving 200 miles/week incurs:
- Deductible mileage cost: $0.67 × 200 = $134/week → $6,968/year
- Actual fuel cost (separate from deductible): ~$50-70/week at $3.50/gal, 30MPG

**Real $/hr calculation:**
```
Gross earnings: $800/week ($20/hr × 40 hrs)
Fuel cost:      -$65/week
Vehicle wear:   -$134/week (IRS mileage)
Net earnings:   $601/week ($15.03/hr net)
Effective rate: $15.03/hr (vs. stated $20/hr)
```

**Community data:** Reddit r/doordash_drivers threads frequently discuss this. Consensus: "Take your gross $/hr and subtract about 25-30% for real expenses."

**GigAnalytics implication:** For the Platform Gig Worker persona, the **expense quick-log** feature (log gas fill-up in one tap) with automatic IRS mileage rate calculation is a **must-have** feature, not a nice-to-have. Without it, the $/hr figure is misleading.

---

## C5. Calendar and Time Tracking for Dashers

DoorDash has no calendar integration. Dashers manage their schedule in the Dasher app:
- "Dash Now" (start immediately when market is active)
- Pre-scheduled dashes (book time slots in advance for guaranteed access)
- No external calendar integration

**Community pattern:** Heavy Dashers may have a mental schedule ("I dash Tuesday/Thursday evenings and Saturday morning") but nothing is formally tracked outside the Dasher app.

**GigAnalytics opportunity:** If a user marks "DoorDash session" manually (start/stop), GigAnalytics can correlate with earnings logged for that window. Over time, build a personalization layer: "Your best $/hr DoorDash sessions are Tuesday 5-8pm ($22.40/hr) vs. Sunday 12-3pm ($14.80/hr)."

---

## Summary: Comparative Platform Data

| Platform | Fee % | Export Capability | Payout Cadence | Time Tracking |
|----------|-------|------------------|----------------|---------------|
| Etsy | 9.5%–21.5% | CSV (complex, multi-file) | Weekly (Monday) | None |
| Gumroad | 10% flat | CSV (clean, per-sale net) | Weekly (Friday) | None |
| Stripe | 2.9% + $0.30 | CSV (excellent, per-tx) | Daily (automatic) | None |
| PayPal | 3.49% + $0.49 | CSV (good, multi-column) | On-demand | None |
| Upwork | 10% flat | CSV (net only, no gross) | Weekly (Tuesday) | Work Diary (hourly only) |
| DoorDash | 0% (driver) | None (app only) | Weekly or instant | None |
| Toggl | N/A (time only) | CSV (excellent) | N/A | ✓ Full |

**Key observation:** Not a single platform bridges time data and income data. Every platform is siloed. GigAnalytics' entire value proposition is this cross-platform connection.

---

*Sources: Etsy Seller Handbook, Gumroad Help Center, DoorDash Dasher Help, Toggl Track Help Center, community documentation — April 2026*
