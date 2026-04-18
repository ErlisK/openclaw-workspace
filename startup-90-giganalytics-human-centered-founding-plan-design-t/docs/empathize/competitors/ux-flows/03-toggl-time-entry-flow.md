# Annotated UX Flow 03: Toggl Track — Timer Start/Stop + Weekly Export
## Source: https://toggl.com/track/ · https://engineering.toggl.com/docs/ | Friction Score: 2/5

---

## Context
A freelance designer tracks time on a client project and exports the week's hours for invoicing.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Start Timer (Web / Desktop)                     ║
╠══════════════════════════════════════════════════════════╣
║  [What are you working on?       ] [Acme Corp ▼] [▶]    ║
║                                                          ║
║  User types: "Homepage redesign"                         ║
║  Selects project: "Acme Corp"                            ║
║  Clicks ▶ → timer starts: 0:00:01, 0:00:02...           ║
║                                                          ║
║  ✓ BEST IN CLASS: 2-3 seconds to start tracking.        ║
║  ✓ No required fields — description optional.            ║
║  ✓ Menu bar icon shows running time persistently.        ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: Timer Running                                   ║
╠══════════════════════════════════════════════════════════╣
║  Menu bar: "AC 2:34:12"                                  ║
║  Browser tab: "2:34:12 - Toggl Track"                    ║
║                                                          ║
║  ✓ GOOD: Always visible without opening full app.        ║
║  ✗ COMMON FAIL: User forgets to stop timer.              ║
║    Wakes up next morning to 14-hour "entry".             ║
║    Must manually edit. Happens weekly.                   ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Stop + View Entry                               ║
╠══════════════════════════════════════════════════════════╣
║  Click ■ → entry created:                                ║
║  "Homepage redesign" · Acme Corp · 2h 34m · ✓ Billable  ║
║                                                          ║
║  ✓ GOOD: Entry immediately visible and editable.         ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Weekly Report View                              ║
╠══════════════════════════════════════════════════════════╣
║  Total: 34h 12m  Billable: 28h 45m  Non-bill: 5h 27m    ║
║                                                          ║
║  Acme Corp    18h 20m ████████████  $2,200 est.          ║
║  NEFF Brand    8h 15m ████████       $990 est.           ║
║  Admin         5h 27m █████           --                 ║
║                                                          ║
║  ✓ GOOD: Clean breakdown by project.                     ║
║  ✗ "est." = estimated billing based on hourly rate set   ║
║    in Toggl. Not actual received payment.                ║
║  ✗ THE GAP: Toggl knows hours. Stripe knows money.       ║
║    Nothing connects them. This is GigAnalytics' gap.     ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 5: Export CSV                                      ║
╠══════════════════════════════════════════════════════════╣
║  Reports → Detailed → Export → [CSV]                     ║
║  File: "Toggl_time_entries_2024-03-10_to_03-16.csv"     ║
║                                                          ║
║  User opens CSV → manually copies hours to invoice.      ║
║                                                          ║
║  ✗ BROKEN CHAIN: Toggl → CSV → manual copy → invoice     ║
║    tool (FreshBooks/Wave/Word). No automation.           ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Import Toggl entries via API → overlay with actual Stripe payments → show true $/hr
2. Emulate Toggl's 2-tap timer start for mobile quick-log
3. Emulate always-visible running timer in mobile UI
4. The "estimated billing ≠ actual income" gap is precisely GigAnalytics' value prop
