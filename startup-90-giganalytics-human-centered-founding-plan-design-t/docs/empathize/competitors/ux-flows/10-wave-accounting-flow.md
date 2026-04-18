# Annotated UX Flow 10: Wave — Bank Connect + Categorize Income
## Source: https://www.waveapps.com/ · Wave Help Center | Friction Score: 4/5

---

## Context
A multi-source freelancer tries Wave (free) to get a unified income view across DoorDash + Upwork + Stripe.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Connect Bank via Plaid                          ║
╠══════════════════════════════════════════════════════════╣
║  Banking → + Connect Account → Plaid                     ║
║  Login to Chase → select accounts → connected            ║
║                                                          ║
║  ✓ GOOD: Plaid integration works well.                   ║
║  ✗ FUNDAMENTAL LIMIT: Bank sees deposits, not sources.   ║
║    "STRIPE PAYOUT $1,165.30" = 1 row.                    ║
║    Which of 3 Stripe clients contributed? Unknown.       ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: 45 Transactions Imported — All Uncategorized    ║
╠══════════════════════════════════════════════════════════╣
║  Mar 26  UPWORK INC          $3,060.00  [Uncategorized]  ║
║  Mar 22  STRIPE PAYOUT       $1,165.30  [Uncategorized]  ║
║  Mar 19  DOORDASH INC          $312.50  [Uncategorized]  ║
║  Mar 18  SHELL GAS STATION     -$62.14  [Uncategorized]  ║
║  Mar 15  AMAZON PRIME          -$14.99  [Uncategorized]  ║
║                                                          ║
║  ✗ BAD: Wave doesn't know:                               ║
║    UPWORK INC = contract income                          ║
║    STRIPE PAYOUT = design services                       ║
║    DOORDASH INC = gig delivery income                    ║
║    Everything starts as [Uncategorized].                 ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Categorize Each Transaction (45×)               ║
╠══════════════════════════════════════════════════════════╣
║  Click → Side panel:                                     ║
║  [Business / Personal] toggle                            ║
║  Category: [Select ▼] → Freelance / Contract Income     ║
║  [Save Rule: "UPWORK INC → always = Contract Income"]    ║
║                                                          ║
║  ✓ GOOD: Rules save future auto-categorization.          ║
║  ✗ BAD: First-time = 45 manual categorizations.          ║
║  ✗ BAD: Category is platform-level (not project-level).  ║
║    Cannot see which Upwork client contributed.           ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Profit & Loss Report                            ║
╠══════════════════════════════════════════════════════════╣
║  Income:                                                 ║
║    Contract Income      $3,060.00  (Upwork)              ║
║    Design Services      $1,165.30  (Stripe)              ║
║    Gig / Delivery         $312.50  (DoorDash)            ║
║  Total Income:          $4,537.80                        ║
║                                                          ║
║  ✓ ACHIEVES: Unified income view — the baseline.         ║
║  ✗ FAILS ON:                                             ║
║    • Amounts = NET bank deposits (fees invisible)        ║
║    • Upwork $340 fee never appears anywhere              ║
║    • No $/hr calculation possible                        ║
║    • No stream-level breakdown within platforms          ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Wave achieves basic unified view — GigAnalytics must go 3 layers deeper:
   - Gross + fee breakdown (not just net bank deposits)
   - Project/client level (not just platform level)
   - $/hr calculation (connects money to time)
2. Target segment: "I use Wave but it doesn't show me my Upwork fees or which project earned what"
3. GigAnalytics = Wave + platform API depth + time tracking = the product Wave can't build without platform partnerships
