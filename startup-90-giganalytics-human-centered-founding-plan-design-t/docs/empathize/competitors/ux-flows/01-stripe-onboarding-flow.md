# Annotated UX Flow 01: Stripe — First Payout Setup
## Source: https://docs.stripe.com/payouts · https://docs.stripe.com/reports/balance | Friction Score: 2/5

---

## Context
A freelancer receives their first client payment of $1,200 via Stripe invoice. This flow documents the full path from payment notification to bank deposit arrival.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Payment Received Email                          ║
╠══════════════════════════════════════════════════════════╣
║  From: Stripe <no-reply@stripe.com>                      ║
║  Subject: Payment of $1,200.00 from [Client Name]        ║
║  Body: "Your payment has been received."                  ║
║  CTA: [View payment in Dashboard →]                      ║
║                                                          ║
║  ✓ GOOD: Clear, actionable. Correct amount shown.        ║
║  ✗ MISSING: Fee amount not shown in email.               ║
║    User sees $1,200 here → $1,165.30 in Dashboard        ║
║    → confusion about where $34.70 went                   ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: Stripe Dashboard — Balance View                 ║
╠══════════════════════════════════════════════════════════╣
║  Pending balance:    $1,165.30                           ║
║  Available balance:  $0.00                               ║
║  Expected payout:    $1,165.30  arriving Wed Mar 20      ║
║                                                          ║
║  ✓ GOOD: Arrival date shown. Net amount correct.         ║
║  ✗ MISSING: No explicit fee line on this screen.         ║
║    Must navigate to Activity → click transaction         ║
║    → see fee as separate line item buried in detail view ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Bank Account Setup (if none linked)             ║
╠══════════════════════════════════════════════════════════╣
║  Banner: "Add bank account to receive payouts"           ║
║  [Add bank account →]                                    ║
║                                                          ║
║  Form: Routing number / Account number / Type            ║
║                                                          ║
║  Verify via:                                             ║
║  Option A: Plaid instant (~30 seconds) ← preferred       ║
║  Option B: Micro-deposits (1-2 days delay)               ║
║                                                          ║
║  ✓ GOOD: Plaid path is frictionless.                     ║
║  ✗ BAD: Micro-deposit path delays first payout 2-3 days  ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Payout Confirmation                             ║
╠══════════════════════════════════════════════════════════╣
║  "Payouts set to automatic (daily)"                      ║
║  "First payout $1,165.30 arrives Wed Mar 20"             ║
║  [Change payout schedule] [View payout details]          ║
║                                                          ║
║  ✓ BEST IN CLASS: Clear timeline. Correct expectations.  ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 5: Bank Deposit Arrives                            ║
╠══════════════════════════════════════════════════════════╣
║  Bank statement:                                         ║
║  "STRIPE PAYOUT    $1,165.30    Mar 20"                  ║
║                                                          ║
║  ✗ BAD: No client name in bank memo.                     ║
║  ✗ BAD: No fee breakdown. No project reference.          ║
║  ✗ BAD: Lump sum — if 3 clients paid this week, all      ║
║    combined into one deposit with no breakdown.          ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Show fee explicitly at payment receipt step: "$34.70 Stripe fee (2.9% + $0.30)"
2. Bank deposit reconciliation: "This $1,165.30 Stripe payout settled from Invoice #47 (Acme Corp)"
3. Per-payout transaction list: Show which charges contribute to each daily sweep
