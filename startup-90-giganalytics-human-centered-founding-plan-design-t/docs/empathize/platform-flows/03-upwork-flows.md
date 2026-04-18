# Platform Flow Archive: Upwork
## Payout Cadence, CSV Export Schema, Fees, and Integration Patterns

**Source:** Upwork Help Center, Upwork Pricing page, Upwork Community forums, public freelancer documentation — verified April 2026  
**Relevance to GigAnalytics:** Upwork is the largest platform-mediated freelance marketplace. Service Freelancer proto-persona (persona 2) uses Upwork as primary or secondary income channel. Upwork has the most complex fee structure among freelance platforms.

---

## 1. Fee Structure

### Freelancer Service Fees (Current as of 2024-2025)

Upwork moved from a tiered model to a **flat 10% service fee** in 2023-2024:

| Earnings with Client | Previous Model (pre-2024) | Current Model |
|---------------------|--------------------------|---------------|
| All earnings | 20% (first $500), 10% ($500-$10K), 5% (>$10K) | **Flat 10%** |

**How it appears:**
- Client pays $1,000 for a contract
- Upwork deducts 10% service fee = $100
- Freelancer receives $900 (before withdrawal fees)
- Client also pays Upwork a ~3% marketplace fee on top of the contract price

**Connects (Proposal credits):**
- Freelancers buy "Connects" to submit proposals
- Default: 6 Connects per proposal (can be 2-6)
- Cost: $0.15 per Connect (Connects Bundle pricing)
- A heavy proposal writer might spend $15-40/month on Connects — a real cost of doing business rarely counted in $/hr calculations

**Freelancer Plus subscription:**
- $14.99/month
- Includes 80 Connects/month + profile visibility boost + competitor rate insights (anonymized)
- This "competitor rate insights" feature is the only public benchmark data on Upwork — limited scope

---

## 2. Payout Cadence

### Payment Release Schedule
- **Hourly contracts:** Client billed weekly (Monday); Upwork holds funds in escrow; released to freelancer after **5-day security period** (typically Saturday)
- **Fixed-price contracts:** Client pays milestone upfront into escrow; released when client approves (or after 14 days if client doesn't act); then **5-day security period** before available to freelancer
- **Bonus payments:** Released after **5-day security period**

### Weekly Payment Cycle (Hourly)
```
Monday:    Upwork bills client for previous week's hours (via Work Diary)
Tuesday:   Client has until Tuesday to dispute hours
Saturday:  Funds released to freelancer (if no dispute)
+1-3 days: Transfer to withdrawal method
```

### Transfer Methods and Timing
| Method | Timing | Fee |
|--------|--------|-----|
| Direct to US Bank (ACH) | 3–5 business days | Free |
| PayPal | 1–3 business days | Free (Upwork side; PayPal instant transfer fee if applicable) |
| Wire Transfer | 3–7 business days | $30 per transfer |
| Payoneer | 2–3 business days | 2% (capped at $5/transfer per Payoneer) |
| Direct to Local Bank (International) | 5–10 business days | Varies by country |

---

## 3. Earnings CSV Export Schema

### Upwork Transaction History CSV
Access: Profile → Reports → Transaction History → Export

| Column | Description |
|--------|-------------|
| `Date` | Transaction date (MM/DD/YYYY) |
| `Type` | Transaction type (see types below) |
| `Description` | Human-readable description |
| `Agency` | Agency name (if freelancer is agency-affiliated) |
| `Freelancer` | Freelancer name |
| `Team` | Team/contract team |
| `Account Name` | Client account name |
| `PO` | Purchase Order number |
| `Reference` | Upwork reference ID |
| `Amount` | Net amount (after Upwork fee deduction) |
| `Amount in USD` | Normalized USD amount |
| `Balance` | Running Upwork account balance |

### Key Transaction Types
| Type | Meaning |
|------|---------|
| `Fixed-Price Milestone` | Milestone payment released from escrow |
| `Hourly` | Weekly hourly payment (post billing cycle) |
| `Bonus` | Client-initiated bonus payment |
| `Refund` | Refund issued |
| `Withdrawal` | Transfer out to payment method |
| `Withdrawal Fee` | Wire transfer or applicable fee |
| `Connect Purchase` | Connects bundle purchase |
| `Membership Fee` | Freelancer Plus subscription |

### Key Issues with Upwork CSV (GigAnalytics must handle)
1. **Amount is already net of Upwork fee** — the 10% service fee has already been deducted; gross contract value is NOT in the export
2. **No hourly rate breakdown** — hourly contracts show total weekly amount, not hours × rate breakdown; need Upwork Work Diary for that
3. **Client name (Account Name) is the billing account** — may differ from contract name; client matching requires cross-reference
4. **Withdrawal appears as separate row** — need to separate income events from withdrawal events for analysis
5. **Date is UTC** — need to clarify timezone for local reporting

---

## 4. Upwork Work Diary (Time Tracking)

The Work Diary is Upwork's built-in time tracking system for hourly contracts.

### How it Works
- Freelancer installs **Upwork Desktop App** (required for hourly contracts)
- App takes a screenshot every 10 minutes during active work (6 screenshots/hour)
- Mouse/keyboard activity tracked as "activity level" (0-10 scale)
- Hours are recorded in 10-minute slots: "activity slot" = valid billed time

### Work Diary Data Available
- Screenshots (stored for 12 months)
- Activity level per slot
- Memo field (freelancer describes what they worked on per slot)
- Hours logged per week per contract
- Client can delete specific time slots if deemed invalid

### Work Diary Export
- Not directly exportable as CSV from standard interface
- **Upwork API** provides work diary data via `GET /teams/{team_id}/workdiaries/{user_id}/{date}`
- Returns: `entries[]` with `cell` (10-min slot), `memo`, `activity`, `screenshot_img`
- Requires OAuth authentication with `read:workdiary` scope

### Key Limitation for GigAnalytics
- **Only works for hourly Upwork contracts** — no time tracking for fixed-price
- **Desktop app required** — mobile workers or those on fixed-price contracts have no Upwork time data
- The hourly Work Diary does NOT connect to time spent on proposals, communication, or revisions

---

## 5. Job Success Score (JSS)

The Job Success Score is Upwork's 0-100% rating metric. It affects platform visibility and ability to win new contracts.

### What Affects JSS (Publicly Known Factors)
- Client feedback ratings (1-5 stars per contract)
- Completion rate (started vs. completed contracts)
- Long-term client retention (clients who rehire = positive signal)
- Client-side contract close (client closing = neutral; client ending without feedback = negative signal)
- Response time and communication patterns

### What Is NOT Publicly Disclosed
- Exact weighting of each factor
- How recency is weighted vs. historical
- Whether proposal-to-hire ratio affects JSS
- Whether non-contract interactions (messages, offers declined) affect JSS

### JSS Update Cadence
- Updated approximately every 2 weeks
- Changes of 0.1-0.3% are normal variance; changes of 1%+ typically indicate a meaningful event
- No API access to JSS — only visible in profile UI

**GigAnalytics implication:** JSS is a key anxiety driver for Upwork freelancers. If GigAnalytics can contextualize JSS changes ("this 0.2% drop is within normal variance range — no action needed"), it removes a significant source of distraction/anxiety.

---

## 6. Calendar Integration (Upwork)

Upwork has **no native calendar or scheduling feature** for clients or freelancers.

**Common workarounds observed in community:**
- Freelancers use Calendly embedded in Upwork profile bio link (technically against ToS but common)
- Meeting times arranged via Upwork messages → added manually to Google Calendar
- Fixed-price milestone deadlines set in contract but not linked to any calendar

**GigAnalytics opportunity:** If a user connects Google Calendar, appointments with client names that match Upwork clients could be auto-tagged as Upwork work time — a cross-platform time inference feature.

---

## 7. UX Flow: Upwork Earnings to Bank Account

```
Contract work performed (e.g., Mon–Fri)
  ↓
Monday: Upwork bills client (hourly contract) for previous week
  ↓
Client has 24 hours to dispute screenshots
  ↓
Tuesday: Dispute window closes
  ↓
Saturday: Funds released to freelancer's Upwork balance
  ↓
Freelancer initiates withdrawal (manual or scheduled)
  ↓
ACH transfer: 3-5 business days → bank account
OR PayPal: 1-3 business days → PayPal balance
  ↓
Bank account deposit (no Upwork reference in bank memo — generic)
```

**Total time from work → bank:** ~8-12 business days for ACH  
**User experience:** "I worked last week and my money arrives next-next week" — the delay is a common complaint

### What Shows in Bank
- ACH memo: "UPWORK INC" + reference code
- No client name, no project name, no hours breakdown
- Just a dollar amount every 1-4 weeks (whenever freelancer withdraws)

---

## 8. Annotated Fee Example

A freelancer completes a $3,000 project on Upwork:

```
Contract value:        $3,000.00
Upwork service fee:   -$  300.00  (10% flat)
Freelancer receives:   $2,700.00  (visible in Upwork balance)

Withdrawal to ACH:     $2,700.00  (no ACH fee)
Bank receives:         $2,700.00

But also hidden costs:
- 8 proposals sent at 6 Connects each = 48 Connects = $7.20 in Connect purchases
- 1 hour of proposal writing time = $X at freelancer's effective rate
- True project revenue: $2,692.80 cash + uncompensated proposal time
```

**GigAnalytics implication:** True effective rate calculation must include:
- Net of Upwork service fee (10%)
- Net of Connect costs amortized across won contracts
- Net of proposal time (if tracked) distributed across won contracts

---

*Sources: Upwork Help Center, Upwork Pricing page (upwork.com/i/pricing), Upwork Community forums, Upwork API documentation — April 2026*
