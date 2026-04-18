# Annotated UX Flow 05: Upwork — Weekly Earnings View + Withdrawal
## Source: https://support.upwork.com/hc/en-us/ · Upwork Help Center | Friction Score: 3/5

---

## Context
A developer completed a 40-hour week on an hourly contract ($85/hr). This traces the path from Monday billing to bank deposit.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Monday — Dashboard Earnings View                ║
╠══════════════════════════════════════════════════════════╣
║  "Your earnings for week of Mar 11–17"                   ║
║  Hours billed: 40.0 hrs                                  ║
║  Earnings: $3,060.00                                     ║
║                                                          ║
║  ✗ CRITICAL: $3,060 is NET but not labeled as net.      ║
║    Contract was $85 × 40 = $3,400.                       ║
║    Upwork took $340 (10%). $3,060 shown without context. ║
║    Fee only appears in: Reports → Transaction History.   ║
║    Most freelancers never find this view.                ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: 5-Day Security Period                           ║
╠══════════════════════════════════════════════════════════╣
║  "Earnings in review — available Sat Mar 22"             ║
║  [i] What is the security period?                        ║
║                                                          ║
║  ✗ FRUSTRATING: 5-day hold is a major weekly complaint   ║
║    in r/freelance and Upwork Community forums.           ║
║  ✓ OK: Explanation is available via tooltip.             ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Saturday — Initiate Withdrawal                  ║
╠══════════════════════════════════════════════════════════╣
║  Get Paid → Withdraw                                     ║
║  Available: $3,060.00                                    ║
║  To: [Bank of America ****1234 ▼] (ACH)                  ║
║  [Get Paid Now]  ← misleading label (takes 3-5 days)    ║
║                                                          ║
║  Estimated arrival: Tue Mar 26                           ║
║                                                          ║
║  ✓ GOOD: 2-click withdrawal. Arrival date shown.         ║
║  ✗ BAD: "Get Paid Now" misleading — takes 3-5 more days. ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Bank Deposit Arrives (Tue Mar 26)               ║
╠══════════════════════════════════════════════════════════╣
║  Bank statement:                                         ║
║  "UPWORK INC    $3,060.00    Mar 26"                     ║
║                                                          ║
║  Total time from work → bank: ~12 business days          ║
║                                                          ║
║  ✗ BAD: No client name. No project. No fee breakdown.   ║
║  ✗ BAD: If multiple contracts, single lump sum —         ║
║    impossible to attribute to individual projects.       ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 5: Fee Lookup (Reports → Transaction History)      ║
╠══════════════════════════════════════════════════════════╣
║  The only place the $340 fee appears:                    ║
║  "Service Fee   -$340.00"  as a separate line item       ║
║                                                          ║
║  ✓ Fee IS visible — but deeply buried.                   ║
║  ✗ Most freelancers never see this screen.               ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Parse Upwork CSV → calculate gross = net ÷ 0.9 → show explicit fee
2. Show: "Upwork week of Mar 11: $3,400 gross → $340 fee → $3,060 net = $76.50/hr effective"
3. Cross-reference with time data for proposal overhead → true $/hr
