# Platform Flow Archive: TaskRabbit, Rover, and Fiverr
## Payout Cadence, Fee Structures, and Time Tracking Patterns

**Source:** Platform help centers, community documentation, public developer docs — verified April 2026  
**Relevance:** TaskRabbit and Rover serve the Platform Gig Worker persona (Persona 3). Fiverr is relevant to both Creator-Sellers and Service Freelancers who use it as a secondary income channel.

---

# Part A: TaskRabbit

## A1. Fee Structure (Tasker Side)

TaskRabbit charges Taskers (service providers) a **platform fee** on each completed task.

| Fee | Rate |
|-----|------|
| TaskRabbit platform fee | 15% of task earnings |
| Trust & Support fee | $7.46/month subscription (or $0 if >$1,000/month earnings) |
| Background check | One-time $35 (varies by country) |

**Example:**
```
Task quoted at: $200 for furniture assembly
TaskRabbit fee: -$30 (15%)
Tasker receives: $170
Monthly subscription: -$7.46 (if <$1K/month earnings)
Net before expenses: ~$162.54
```

**Tasker Premium subscription ($34.99/month):**
- Waived service fee days (promotional)
- Highlighted profile placement
- Priority customer support
- Mainly useful for high-volume Taskers

---

## A2. Payout Cadence

- **Payment method:** ACH direct deposit or bank transfer
- **Release timing:** Funds released **24 hours after task is marked complete** (by client or auto-complete)
- **Transfer to bank:** 1–3 business days after release
- **Minimum payout:** No minimum

### Fast Task Payout Timeline
```
Task completed: Monday 3 PM
Auto-completion: Tuesday 3 PM (24-hour release)
ACH initiated: Tuesday (business hours)
Bank deposit: Wednesday or Thursday
```

**Total time: 2-4 business days from task completion**

This is **faster than DoorDash** (weekly) and significantly faster than Upwork (7-12 days), making TaskRabbit more cash-flow friendly for workers with immediate expenses.

---

## A3. Data Export

TaskRabbit has **no CSV export** for Tasker earnings.

**What is available in the app:**
- Task history (client, task type, date, earnings per task)
- Monthly earnings summary
- Ratings history
- 1099-K issued if earnings >$600/year

**What Taskers actually do:**
- Screenshot earnings screen periodically
- Mental tracking ("I did 4 tasks this week at about $150 average")
- Bank deposit monitoring as primary income signal

**GigAnalytics import approach:**
- Manual entry: user logs weekly TaskRabbit earnings total
- Bank detection: TaskRabbit ACH shows as "TASKRABBIT INC" in bank statement
- Manual per-task logging: user enters task earnings + hours (most accurate for $/hr)

---

## A4. Time Tracking (TaskRabbit)

TaskRabbit has a **built-in task timer** in the Tasker app:
- Tasker presses "Start Task" when arriving at client
- Timer runs while task is active
- Tasker presses "End Task" when finished
- Earnings calculated: agreed rate × logged time (hourly tasks)

**For hourly tasks:** Time is tracked in-app and billing is automatic  
**For fixed-price tasks:** No time tracking (client agreed to flat rate)

**Key observation:** TaskRabbit is the only gig platform with actual in-app time tracking for workers. This data is not exported anywhere, but it represents a significant potential integration point — Tasker earnings per hour are knowable from within the app.

---

# Part B: Rover (Pet Care)

## B1. Fee Structure (Sitter/Walker Side)

Rover charges a service fee that varies by account history:

| Account Status | Rover Service Fee |
|---------------|------------------|
| New sitter | 20% of each booking |
| Standard sitter | 20% of each booking |
| Rover guarantee program | Included in fee |

**Example:**
```
Dog boarding booking: $50/night × 3 nights = $150
Rover fee (20%): -$30
Sitter receives: $120
```

**Repeat client discount (passed to sitter's earnings):**
- Clients who rebook get a discount
- This discount is split: client gets price reduction, sitter's effective rate is lower
- Sitters often don't realize repeat clients earn them less per night

---

## B2. Payout Cadence

- **Release timing:** 48 hours after the end of the service (pet boarding, sitting, walking)
- **Transfer:** Direct deposit (2-3 business days) or PayPal (1-2 business days)
- **Rover Pay (Stripe-based):** Stripe debit card option — near-instant

**Timeline example:**
```
Dog boarding ends: Sunday 5 PM
48-hour hold: Monday 5 PM → Tuesday 5 PM (release)
ACH initiated: Tuesday
Bank deposit: Thursday or Friday
```

---

## B3. Data Export

Rover has **no CSV export** for sitter earnings.

**Available in app:**
- Transaction history (each booking, payout amount, date)
- Upcoming bookings calendar (the only calendar integration in gig apps — Rover shows your booked dates)
- Annual earnings statement (downloadable PDF for tax purposes)
- 1099-K if over threshold

**Notable:** Rover's booking calendar is the closest any gig app comes to calendar integration — sitters can see their schedule in a calendar view, showing which dates have bookings.

**GigAnalytics opportunity:** Rover's iCal export (if available) could feed booking data → automatically log hours from Rover calendar blocks → correlate with Rover payouts.

---

## B4. Rover Earnings Patterns (Community Data)

From r/Rover and Rover Community forums:
- Most sitters work 10-25 hours/week
- Dog boarding earns most per hour (you're home anyway — passive while dog sleeps)
- Dog walking earns $15-25/hr effective (30-minute walks at $20-30 each)
- House sitting has complex economics (24-hour presence for $50-80/day)
- Top complaint: "I don't know if I'm making enough per hour to justify boarding over walks"

**GigAnalytics angle:** Rover sitters who offer multiple service types (boarding + walking + drop-ins) have exactly the multi-stream $/hr analysis problem GigAnalytics solves.

---

# Part C: Fiverr

## C1. Fee Structure (Seller Side)

Fiverr charges sellers a **flat 20% commission** on all orders.

| Order Type | Fiverr Fee |
|-----------|-----------|
| Standard gig order | 20% of gig price |
| Gig Extra | 20% of extra price |
| Custom offer | 20% of offer amount |
| Tip | 20% of tip |

**Example:**
```
Gig price: $100
Fiverr fee: -$20 (20%)
Seller receives: $80
```

**Fiverr Pro sellers** get no fee reduction — the 20% fee applies uniformly regardless of seller level.

**Comparison context:** Fiverr's 20% is the highest fee rate among major freelance platforms (Upwork is 10%, TaskRabbit is 15%, Gumroad is 10%). Despite this, Fiverr is used as a secondary income channel because buyer demand is high for low-ticket services.

---

## C2. Payout Cadence

- **Revenue clearing period:** 14 days after order is marked complete (7 days for Top Rated sellers)
- **Withdrawal methods:** PayPal, Fiverr Revenue Card (Payoneer), bank transfer, Fiverr direct deposit
- **Minimum withdrawal:** $30 (or $100 for wire transfer)
- **Bank wire fee:** $30 per transfer

### Timeline
```
Order completed: Monday
14-day clearing: (+2 weeks)
Funds available in Fiverr Revenue Balance: Monday +14 days
User initiates withdrawal
PayPal: 1-2 business days
Bank ACH: 3-5 business days
```

**Total time from completed order to bank: 17-21 days** — the **slowest** of all platforms analyzed.

---

## C3. CSV Export Schema

Fiverr provides an earnings CSV via Dashboard → Analytics → Revenue Report

| Column | Description |
|--------|-------------|
| `Date` | Transaction date |
| `Order ID` | Fiverr order identifier |
| `Description` | Order description or gig title |
| `Order Amount` | Gross amount paid by buyer |
| `Fee` | Fiverr's 20% fee (negative) |
| `Net Revenue` | Amount credited to seller |
| `Status` | Cleared, Pending, Cancelled |
| `Currency` | USD (Fiverr settles in USD) |

**Strengths:** Clean schema, explicit fee column, net amount pre-calculated  
**Limitation:** No buyer contact information (anonymized as "buyer123")

---

## C4. GigAnalytics Import Notes (Fiverr)

```
fiverr.net_revenue → income_net (already deducted 20%)
fiverr.order_amount → income_gross
fiverr.fee → platform_fee (verify = 20% of order_amount)
fiverr.date → transaction_date
fiverr.description → stream_label or task_type
```

**Key challenge:** Fiverr buyers are anonymous (no email/name). Cannot link to time entries by client name. Must rely on gig description matching.

**14-day clearing delay implication:** When user uploads Fiverr CSV, many "completed" orders will show as `Pending` clearing. GigAnalytics must show these as "expected income" separately from "cleared income" to avoid overstating available funds.

---

# Summary Comparison: All Gig Platforms

## Fee Structure Comparison

| Platform | Base Fee | Notes |
|----------|---------|-------|
| Stripe (direct) | 2.9% + $0.30 | Lowest rate; no platform fee |
| Gumroad | 10% flat | Processing included |
| Upwork | 10% flat | Was tiered until 2024 |
| Etsy | ~9.5% + $0.25 | Without Offsite Ads; up to 21.5% with |
| TaskRabbit | 15% | + $7.46/month subscription |
| Rover | 20% flat | All service types |
| Fiverr | 20% flat | All orders including tips |
| PayPal (G&S) | 3.49% + $0.49 | No platform layer |
| DoorDash | 0% driver fee | Expenses are the hidden cost |

## Payout Speed Comparison

| Platform | Fastest Payout | Cost of Fast | Default Cadence |
|----------|---------------|-------------|-----------------|
| DashDirect (DoorDash) | Immediate | Free | Weekly |
| TaskRabbit | 2-4 days | Free | ~2 days after task |
| Gumroad | 2-4 days | Free | Weekly Friday |
| Stripe | Same-day (instant) | 1% | Daily (standard) |
| PayPal | 30 minutes | 1.75% | On-demand |
| Rover | 4-6 days | Free | ~48h after service |
| Upwork | 4-7 days | Free | Weekly Tuesday |
| Etsy | 5-14 days | Free | Weekly Monday |
| Fiverr | 17-21 days | Free | After 14-day hold |

## Export Quality for GigAnalytics Integration

| Platform | CSV Available? | Fee Explicit? | Time Data? | API Available? |
|----------|--------------|--------------|-----------|----------------|
| Stripe | ✓ Excellent | ✓ Yes | ✗ No | ✓ Full REST API |
| Gumroad | ✓ Excellent | ✓ Yes | ✗ No | ✓ REST API |
| PayPal | ✓ Good | ✓ Yes | ✗ No | ✓ Reports API |
| Upwork | ✓ Basic | ✗ Net only | Limited (Work Diary) | ✓ REST API |
| Fiverr | ✓ Good | ✓ Yes | ✗ No | Limited |
| Etsy | ✓ Complex (2 files) | Partial | ✗ No | ✓ REST API |
| TaskRabbit | ✗ None | N/A | Limited (app only) | ✗ None |
| Rover | ✗ None (PDF only) | N/A | ✗ No | ✗ None |
| DoorDash | ✗ None | N/A | ✗ No | ✗ None |

**Integration priority for GigAnalytics MVP:**
1. Stripe (OAuth — automated, best data)
2. Gumroad (CSV upload — clean schema)
3. PayPal (CSV upload — well-structured)
4. Upwork (CSV upload — but fee calculation needed)
5. Etsy (CSV upload — multi-file reconciliation required)
6. Others (manual entry fallback)

---

*Sources: TaskRabbit Help Center, Rover Help Center (rover.com/about/sitters/), Fiverr Revenue Report documentation, platform community forums — April 2026*
