# Annotated UX Flow 02: QuickBooks Self-Employed — CSV Import + Categorize
## Source: https://quickbooks.intuit.com/self-employed/ · Help Center walkthroughs | Friction Score: 4/5

---

## Context
A multi-source freelancer tries to import a PayPal CSV (90 days, ~45 transactions) into QuickBooks Self-Employed to categorize income and expenses.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Finding the Import Feature                      ║
╠══════════════════════════════════════════════════════════╣
║  Navigation path:                                        ║
║  Transactions → Banking → Upload transactions            ║
║                                                          ║
║  ✗ BAD: "Banking" label implies bank accounts,           ║
║    not PayPal/CSV imports. Non-obvious.                  ║
║    Community reports: 3-5 min to find this feature       ║
║    even for experienced QBSE users.                      ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: Upload CSV                                      ║
╠══════════════════════════════════════════════════════════╣
║  [Select file] — accepts .csv, .qbo, .ofx               ║
║                                                          ║
║  ✓ OK: Standard CSV accepted.                            ║
║  ✗ NO drag-and-drop. ✗ NO preview before processing.    ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Column Mapping  ← PRIMARY PAIN POINT            ║
╠══════════════════════════════════════════════════════════╣
║  "Map your CSV columns to QuickBooks fields"             ║
║                                                          ║
║  CSV column          QBSE field                          ║
║  [Date]           →  [Date ▼]                            ║
║  [Name]           →  [Description ▼]                     ║
║  [Gross]          →  [Amount ▼]   ← ambiguous choice!   ║
║  [Fee]            →  [None ▼]     ← no fee field exists! ║
║  [Net]            →  [Amount ▼]   ← or use this?        ║
║  [Status]         →  [None ▼]                            ║
║                                                          ║
║  ✗✗ CRITICAL FAIL: QBSE has ONE amount field.           ║
║    PayPal has THREE (Gross, Fee, Net).                   ║
║    No guidance on which to use.                          ║
║    → Use Gross: fees not deducted from income            ║
║    → Use Net: fees invisible (not counted as expense)    ║
║    Most users pick wrong. r/freelance has 10+ posts      ║
║    about this exact problem.                             ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Categorize (45× for 90 days)                    ║
╠══════════════════════════════════════════════════════════╣
║  All 45 transactions: [Uncategorized]                    ║
║                                                          ║
║  Click each → side panel → assign category:             ║
║  [Business / Personal] toggle                            ║
║  Category: [Select ▼] → Freelance income / expense      ║
║  [Save] → next transaction                               ║
║                                                          ║
║  ✗ BAD: No bulk categorization by merchant keyword.     ║
║  ✗ BAD: No memory of past assignments.                  ║
║    "John Smith" classified today won't auto-classify     ║
║    next month's "John Smith" transaction.                ║
║    (Rule-based auto-classify = QuickBooks Online only)   ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Auto-detect PayPal CSV format — no column mapping needed
2. Show Gross AND Fee AND Net explicitly for every transaction
3. Auto-classify by merchant name from day 1 (UPWORK INC = income, etc.)
4. Never make users categorize 45 transactions manually
