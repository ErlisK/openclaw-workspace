# Platform Flow Archive: Stripe
## Payout Cadence, CSV Export Schema, Fees, and Integration Patterns

**Source:** Official Stripe documentation (docs.stripe.com), verified April 2026  
**Relevance to GigAnalytics:** Stripe is the primary payment processor for direct-client freelancers, digital product sellers (Gumroad uses Stripe), and creator-economy platforms. It is also the cleanest API target for income import.

---

## 1. Payout Cadence

### Initial Payout Window
- **First payout:** 7–14 days after first successful payment (varies by country and industry risk level)
- **Higher-risk industries** (e.g., legal services, adult content, high-ticket coaching) may face extended holds of 14–30 days
- **Rolling reserve:** Some accounts require a percentage held in reserve for 90–120 days

### Automatic Payout Schedule (Standard)
| Region | Default Cadence | Minimum Payout | Typical Bank Arrival |
|--------|----------------|----------------|---------------------|
| US (ACH) | Daily (after 2-day settling) | No minimum | T+2 business days |
| UK (Bacs) | Daily | No minimum | T+3 business days |
| EU (SEPA) | Daily | No minimum | T+3 business days |
| Australia | Daily | No minimum | T+3 business days |
| Canada | Daily | No minimum | T+3 business days |

**Key behavior:** Stripe "batches" daily payouts — all transactions that have cleared their rolling window (typically 2 business days for US cards) are swept into a single daily payout.

### Manual Payout Option
- Users can override to weekly or monthly schedules
- Can trigger instant payouts (Instant Payout feature) for 1% fee (min $0.50) — funds arrive in 30 minutes
- Instant payouts require eligible Visa/Mastercard debit card; not available for all countries

### Payout Failure Modes
- Incorrect bank details: payout returns to Stripe balance within 5-10 business days
- Closed account: same return window; may require re-entry of banking details
- Stripe can place account holds for suspicious activity — funds frozen, no payout until resolved

---

## 2. CSV Export Schema

### Balance Summary Report (`balance.summary.2`)
Downloaded from Dashboard → Reports → Balance

| Column | Default | Description |
|--------|---------|-------------|
| `category` | ✓ | One of: `starting_balance`, `ending_balance`, `activity`, `payouts` |
| `currency` | ✓ | ISO 3-letter currency code (USD, EUR, GBP...) |
| `description` | ✓ | Human-readable period description |
| `net_amount` | ✓ | Net amount in major currency units (dollars, not cents) |

### Balance Change from Activity — Itemized (`balance_change_from_activity.itemized.3`)
The richest export — one row per transaction. Key columns:

| Column | Description |
|--------|-------------|
| `id` | Stripe BalanceTransaction ID (`txn_...`) |
| `created` | UTC timestamp of transaction creation |
| `available_on` | UTC date funds became available |
| `currency` | ISO currency code |
| `amount` | Gross amount (major units) |
| `fee` | Stripe fee amount |
| `net` | Net amount after Stripe fees |
| `reporting_category` | Grouped category (see categories below) |
| `type` | Raw transaction type (`charge`, `refund`, `payout`...) |
| `description` | Merchant-assigned description or customer name |
| `customer_id` | Stripe Customer ID (`cus_...`) |
| `customer_email` | Customer email address |
| `customer_description` | Customer-assigned description |
| `charge_id` | Stripe Charge ID (`ch_...`) |
| `payment_intent_id` | Payment Intent ID (`pi_...`) |
| `invoice_id` | Invoice ID (`in_...`) if applicable |
| `subscription_id` | Subscription ID (`sub_...`) if recurring |
| `metadata[key]` | Any custom metadata attached to the transaction |

### Payout Reconciliation Report — Itemized
Adds additional columns for reconciling bank deposits:

| Column | Description |
|--------|-------------|
| `payout_id` | Stripe Payout ID (`po_...`) |
| `payout_description` | Payout description (often "STRIPE PAYOUT") |
| `payout_expected_arrival_date` | Expected date of bank deposit |
| `payout_status` | `paid`, `failed`, `canceled`, `pending` |
| `automatic_payout_effective_at` | Timestamp of payout initiation |

### Reporting Categories (key subset relevant to freelancers)
| Category | Meaning |
|----------|---------|
| `charge` | Incoming payment from customer |
| `refund` | Payment reversed to customer |
| `payout` | Transfer out to bank account |
| `payout_reversal` | Failed payout returned to Stripe balance |
| `fee` | Stripe processing fee (stripe_fee type) |
| `platform_earning` | Platform fee (for Stripe Connect) |
| `dispute` | Chargeback deduction |
| `dispute_reversal` | Chargeback won — funds returned |

---

## 3. Fee Structure

### Standard Processing Fees (US)
| Payment Method | Fee |
|---------------|-----|
| Cards (domestic) | 2.9% + $0.30 per successful charge |
| Cards (international) | +1.5% surcharge (4.4% + $0.30 total) |
| ACH Direct Debit | 0.8% (capped at $5.00) |
| Instant Payout | 1% of payout amount (min $0.50) |
| Stripe Billing (invoicing) | 0.4% per transaction if using Stripe-hosted invoices |

### Refund and Dispute Fees
- **Refund:** Stripe does NOT return the 2.9% + $0.30 on refunded transactions
- **Dispute/Chargeback:** $15 fee per dispute; reversed if merchant wins

### Tax (Stripe Tax)
- Optional add-on: 0.5% per transaction for automatic tax calculation
- Relevant for US freelancers with nexus in multiple states or EU VAT obligations

---

## 4. Data Availability and Update Cadence

- **Reports compute:** Daily, at 12:00 AM UTC
- **Available in Dashboard:** By 12:00 PM UTC the following day (12-hour SLA)
- **Webhook events:** Stripe fires `reporting.report_run.succeeded` twice daily (0:00 UTC and 12:00 UTC)
- **API access:** Reporting API (`GET /v1/reporting/report_runs`) allows programmatic CSV generation

---

## 5. GigAnalytics Import Design Notes

### What to Pull
- Primary: `balance_change_from_activity.itemized.3` — richest transaction-level data
- Secondary: `payouts.itemized.3` — for bank reconciliation view
- Do NOT use `balance.summary.2` alone — it aggregates too much for per-transaction analysis

### Key Mapping
```
stripe.net → income_amount (what the user actually received)
stripe.fee → platform_fee (2.9% + $0.30 automatically extracted)
stripe.created → transaction_date
stripe.customer_email → client_identifier
stripe.reporting_category == "charge" → income event
stripe.reporting_category == "refund" → income reversal
```

### OAuth vs. CSV
- **OAuth (preferred):** Stripe Connect allows GigAnalytics to pull reports programmatically with user consent; no CSV download needed
- **CSV fallback:** User exports `balance_change_from_activity.itemized.3` from Dashboard → Reports → Balance; GigAnalytics parses on upload
- **Webhook (real-time):** `payment_intent.succeeded` webhook can stream income events in real-time; most powerful for live dashboard

### Scheduling Complexity
A freelancer on Stripe may have multiple income streams all processed through Stripe:
- Direct client invoices (Stripe Invoicing)
- Digital product sales (through Gumroad, which uses Stripe under the hood)
- Coaching/consulting via calendar booking tools (Calendly + Stripe integration)
All arrive in the same Stripe account under different `description` and `metadata` values → GigAnalytics needs metadata-based stream tagging.

---

## 6. UX Flow: User Connecting Stripe to GigAnalytics

```
Step 1: User clicks "Connect Stripe" in onboarding
Step 2: Redirect to Stripe OAuth → user authorizes read-only access
Step 3: GigAnalytics receives access_token + account_id
Step 4: Pull last 90 days of balance_change_from_activity.itemized
Step 5: Parse, categorize by stream (client tag / metadata / description pattern)
Step 6: Show: "We found 4 income sources in your Stripe history. Label them:"
  - [Stripe Invoice] → Client Work
  - [gumroad.com] → Digital Products
  - [calendly.com] → Coaching Sessions
  - [direct charge] → Other
Step 7: Calculate per-stream $/hr (requires time data — link to time entry flow)
Step 8: Surface: "Your coaching sessions on Stripe earn $112/hr gross ($107/hr net after fees)"
```

**Friction point identified:** Stripe fees are deducted silently — users see bank deposit, not gross+fee breakdown. GigAnalytics must surface the fee automatically to show true net.

---

## 7. Annotated Sample Flow: Stripe Payout Timeline

A US freelancer charges $2,000 to a direct client on Monday:

```
Monday 2:00 PM     → Charge captured: $2,000
Monday 2:00 PM     → Stripe fee deducted: $2,000 × 2.9% + $0.30 = $58.30
Monday 2:00 PM     → Net balance: $1,941.70 (pending, not yet available)
Wednesday 12:00 AM → Funds become "available" (T+2 for US cards)
Wednesday (daily   → Included in automatic daily payout batch
  payout batch)
Thursday/Friday    → Hits bank account (T+1 ACH)
```

**Net timeline:** Charge on Monday → bank account on Thursday or Friday (3-4 business days)  
**What the user sees:** A bank deposit for $1,941.70 on Friday with memo "STRIPE PAYOUT"  
**What they don't see:** The $58.30 fee, when exactly it was taken, or which client payment it came from  
**GigAnalytics opportunity:** Reconcile the bank deposit back to the original charge(s), show gross + fee breakdown, link to project/client

---

*Sources: docs.stripe.com/payouts, docs.stripe.com/reports/balance, docs.stripe.com/reports/payout-reconciliation, docs.stripe.com/reports/reporting-categories — verified April 2026*
