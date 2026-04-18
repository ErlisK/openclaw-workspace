# Annotated UX Flow 04: FreshBooks — Create Invoice + Track Time
## Source: https://www.freshbooks.com/features/time-tracking | Friction Score: 3/5

---

## Context
A consultant uses FreshBooks to invoice a client for hourly work. Flow covers time logging → invoice creation → sending → payment receipt.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Log Time in FreshBooks                          ║
╠══════════════════════════════════════════════════════════╣
║  Time Tracking → Start Timer                             ║
║  Project: [Select ▼] → "Acme Consulting" (must exist)   ║
║  [Start]                                                 ║
║                                                          ║
║  ✗ BAD: Cannot start timer without a pre-existing        ║
║    project. Ad hoc work requires project creation first. ║
║  ✓ GOOD: Time logging is project-linked by design.       ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: Create Invoice                                  ║
╠══════════════════════════════════════════════════════════╣
║  Invoices → + New Invoice                                ║
║  Client: [Acme Corp ▼]                                   ║
║  Line items:                                             ║
║  [+ Add Line] [+ Add Time] [+ Add Expense]               ║
║                                                          ║
║  ✓ GOOD: "+ Add Time" button pulls logged time entries   ║
║    for this client automatically.                        ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Import Time Entries → Invoice Lines             ║
╠══════════════════════════════════════════════════════════╣
║  [+ Add Time] popup:                                     ║
║  ✓ UX Research     3.0h × $150 = $450.00                ║
║  ✓ Strategy call   1.5h × $150 = $225.00                ║
║  ✓ Revision r1     2.0h × $150 = $300.00                ║
║  [Import selected]  → Invoice subtotal: $975.00          ║
║                                                          ║
║  ✓ GOOD: Best time→invoice integration in this analysis.║
║  ✗ BAD: Only works for time logged in FreshBooks.        ║
║    No import from Toggl, Clockify, or other trackers.   ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Send + Track Payment                            ║
╠══════════════════════════════════════════════════════════╣
║  [Send] → Client receives email with "View Invoice" link ║
║  Client pays via card/ACH/PayPal through FreshBooks      ║
║  → Invoice auto-marks "Paid" ✓                           ║
║                                                          ║
║  OR client pays outside FreshBooks (wire, direct PayPal) ║
║  → Must manually mark: [Record Payment] → $975.00        ║
║                                                          ║
║  ✗ BAD: FreshBooks income ≠ Stripe/PayPal income.       ║
║    FreshBooks is a silo. No reconciliation with          ║
║    payment processor. Manual "mark paid" required.       ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Receive payment data from Stripe/PayPal directly → eliminate "mark as paid"
2. Import time from any tracker (Toggl, Clockify, manual) — not just FreshBooks native timer
3. FreshBooks target user ("I use FreshBooks but it doesn't show my Upwork income") = GigAnalytics prospect
