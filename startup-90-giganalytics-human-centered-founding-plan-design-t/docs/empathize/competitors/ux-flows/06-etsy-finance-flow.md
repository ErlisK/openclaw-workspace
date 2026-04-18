# Annotated UX Flow 06: Etsy — Finance CSV Download + Reconcile
## Source: https://help.etsy.com/hc/en-us/ · Etsy Seller Handbook | Friction Score: 5/5 (WORST IN CLASS)

---

## Context
An Etsy seller wants to understand true Q1 profit across 120 orders. This documents the multi-step manual process required.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Discover There Are TWO Separate CSVs            ║
╠══════════════════════════════════════════════════════════╣
║  Finances → Payment Account → [Download CSV]             ║
║    → Has: fees, net amounts, order IDs                   ║
║    → Missing: product names, quantities                  ║
║                                                          ║
║  Orders → [Export Orders CSV]                            ║
║    → Has: product names, quantities, order totals        ║
║    → Missing: fee breakdown, actual deposits             ║
║                                                          ║
║  ✗✗ CRITICAL: Neither file alone is sufficient.         ║
║    To get profit-per-product: must merge both files      ║
║    on Order ID using Excel VLOOKUP or Google Sheets.     ║
║    This is a non-trivial technical operation for         ║
║    the typical Etsy seller (artist, crafter).            ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: Payment Account CSV Contents                    ║
╠══════════════════════════════════════════════════════════╣
║  Date    Type       Amount   Fees     Net       OrderID  ║
║  03/15   Payment    $28.00   $3.89    $24.11    #123456  ║
║  03/14   Payment    $28.00   $2.25    $25.75    #123455  ║
║  03/10   Deposit    $0.00    $0.00    -$180.44           ║
║                                                          ║
║  ✗ BAD: "Fees" column = ALL fees combined (transaction   ║
║    fee 6.5% + payment processing 3% + Offsite Ads 15%).  ║
║    Cannot tell WHICH orders had Offsite Ads applied.     ║
║    Cannot tell why two identical $28 items have          ║
║    different fees ($3.89 vs $2.25).                      ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Orders CSV Contents                             ║
╠══════════════════════════════════════════════════════════╣
║  OrderID   Item Name           Price   Qty   Total      ║
║  #123456   Ceramic mug         $28.00  1     $28.00     ║
║  #123455   Ceramic mug         $28.00  1     $28.00     ║
║                                                          ║
║  ✗ BAD: No fee data in this file.                       ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Manual Reconciliation in Google Sheets          ║
╠══════════════════════════════════════════════════════════╣
║  =VLOOKUP(OrderID, payments_sheet, fee_column, FALSE)    ║
║                                                          ║
║  Must join 120 orders × 2 files = intermediate skill    ║
║  required. Most Etsy sellers have never used VLOOKUP.   ║
║                                                          ║
║  ✗✗✗ WORST IN CLASS: Platform designed for creative     ║
║    non-technical sellers requires Excel skills to get    ║
║    basic profit data.                                    ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 5: Still Missing After All That Work               ║
╠══════════════════════════════════════════════════════════╣
║  Even after successful VLOOKUP:                          ║
║  • Material costs: NOT in any Etsy data                  ║
║  • Production time: NOT tracked anywhere                 ║
║  • True $/hr: impossible without additional logging      ║
║                                                          ║
║  ✗ Complete picture requires 2 CSVs + manual cost        ║
║    tracking + time tracking = separate tool needed.      ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Accept both Etsy CSVs → auto-merge on Order ID → no VLOOKUP required
2. Apply Etsy fee formula automatically: detect Offsite Ads orders (fee% > 9.5%)
3. Flag: "3 of your 120 orders had Offsite Ads fee (15%). These reduced your net by $X."
4. Add material cost input per product type → true profit per product
5. This is the highest-friction competitor scenario → maximum GigAnalytics value vs. current state
