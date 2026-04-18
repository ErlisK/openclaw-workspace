# Annotated UX Flow 08: DoorDash Dasher App — Weekly Earnings View
## Source: https://help.doordash.com/dashers/ · Dasher App UX from public screenshots/docs | Friction Score: 4/5

---

## Context
A Dasher completed 28 deliveries last week (approx. 22 active hours). They want to know their true $/hr vs. TaskRabbit.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Active Dash — Live Earnings Screen              ║
╠══════════════════════════════════════════════════════════╣
║  [Live earnings: $147.50  ↑]                             ║
║  Deliveries: 12   Active time: 4h 23m                    ║
║  Acceptance rate: 89%                                    ║
║                                                          ║
║  ✓ GOOD: Real-time counter is motivating.                ║
║  ✗ BAD: "Active time" excludes wait time and zone        ║
║    driving. Overstates effective $/hr.                   ║
║    True elapsed time >> active time.                     ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: Weekly Summary                                  ║
╠══════════════════════════════════════════════════════════╣
║  Earnings → This Week                                    ║
║  Total earnings:    $312.50                              ║
║  Base pay:          $168.00                              ║
║  Tips:              $114.50                              ║
║  Promotions:         $30.00                              ║
║  Deliveries:         28                                  ║
║                                                          ║
║  ✓ GOOD: Pay component breakdown (base/tips/promo).      ║
║  ✗ BAD: No "total hours" in this view.                   ║
║    $/hr is NOT shown. User must know hours themselves.   ║
║  ✗ BAD: No expense deduction.                            ║
║    $312.50 gross; ~$228 net after gas/vehicle wear.      ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Per-Delivery Detail                             ║
╠══════════════════════════════════════════════════════════╣
║  Tap delivery → Order detail:                            ║
║  Base pay: $4.50  Tips: $3.00  Total: $7.50              ║
║  Estimated distance: 3.2 miles                           ║
║                                                          ║
║  ✓ GOOD: Per-delivery breakdown exists.                  ║
║  ✗ BAD: No export. Data locked in app.                   ║
║  ✗ INVISIBLE: 3.2 mi × $0.67 IRS = $2.14 vehicle cost.  ║
║    True net: $7.50 - $2.14 = $5.36 per delivery.         ║
║    DoorDash never shows this.                            ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Payout                                          ║
╠══════════════════════════════════════════════════════════╣
║  Weekly (free):   Arrives Monday                         ║
║  Fast Pay $1.99:  Available now (~30 min)                ║
║                                                          ║
║  ✓ GOOD: Fast Pay clearly priced.                        ║
║  ✗ NOTE: $1.99/week × 52 = $103/year for heavy users.    ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Emulate real-time earnings counter during active work session (core motivator)
2. Show total time (elapsed) not just "active" time → true $/hr
3. One-tap expense logging (gas fill-up) → auto-deduct from earnings → show net $/hr
4. Cross-platform comparison: "DoorDash $14.25/hr net vs. TaskRabbit $26/hr net → you're leaving money on the table"
