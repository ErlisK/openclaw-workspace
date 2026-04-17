# Workflow Maps — GigAnalytics Core User Workflows

**Synthesized from:** Competitor UX analysis, forum mining, empathy maps, journey maps  
**Date:** April 2026  
**Format:** Mermaid flowcharts (render in GitHub, VS Code, Notion) + annotated step descriptions

---

## How to Read These Diagrams

Each workflow shows:
- **Current State (AS-IS):** How users do this today, with all friction points marked 🔴
- **Target State (TO-BE):** How GigAnalytics should handle the same workflow
- **Friction annotations:** Where users drop off, make errors, or experience pain

---

## Workflow 1: Capture Time Against Income Stream

### AS-IS: Current User Workflow (Painful)

```mermaid
flowchart TD
    A[Work session begins] --> B{Remember to open time tracker?}
    B -- No 65% of the time --> C[🔴 Work without tracking]
    B -- Yes --> D[Open Toggl / timer app]
    D --> E[Select correct project/client]
    E --> F{Correct project selected?}
    F -- Wrong project --> G[🔴 Wrong data in system]
    F -- Correct --> H[Start timer]
    H --> I[Work session]
    I --> J{Remember to stop timer?}
    J -- Forgot 40% of the time --> K[🔴 Timer runs for hours/overnight]
    J -- Yes --> L[Stop timer]
    L --> M[Add notes/tags]
    M --> N{Overhead time counted?}
    N -- No usually --> O[🔴 Email/revision time lost]
    N -- Yes --> P[Manual log for overhead]
    P --> Q[Time entry saved]
    O --> Q
    K --> R[Manual correction required]
    R --> Q
    Q --> S{Match to payment?}
    S -- No integration --> T[🔴 Open separate payment platform]
    T --> U[Manual math: hours x rate = expected]
    U --> V[Compare to actual payment manually]
    V --> W[🔴 Discrepancies discovered too late]
```

**Friction Points Identified:**
1. 🔴 **Forgetting to start timer** — 65% of sessions start untimed (estimated from forum patterns)
2. 🔴 **Wrong project selected** — Especially when switching rapidly between clients
3. 🔴 **Forgetting to stop timer** — Creates phantom hours that must be manually corrected
4. 🔴 **Overhead time excluded** — Email, revisions, proposals never make it into any system
5. 🔴 **No payment linkage** — Time tool and payment tool are completely separate
6. 🔴 **Late reconciliation** — Discrepancy discovered weeks later during monthly review

---

### TO-BE: GigAnalytics Workflow (Target)

```mermaid
flowchart TD
    A[Calendar event or app usage detected] --> B{Matches known income stream?}
    B -- Yes --> C[GigAnalytics proposes time entry]
    B -- Uncertain --> D[Push notification: 'Was this work for Client X?']
    D --> E[One tap: Yes / No / Edit]
    C --> F[Pre-tagged with stream, rate, project]
    E --> F
    F --> G{User active on mobile?}
    G -- Yes --> H[Mobile widget: tap to confirm]
    G -- No --> I[Auto-confirmed with smart defaults]
    H --> J[Time attributed to stream]
    I --> J
    J --> K[Platform payment auto-imported]
    K --> L[Net $/hr calculated automatically]
    L --> M{Overhead time detected?}
    M -- Proposal/email detected --> N[Prompt: 'Overhead for Stream X?']
    M -- No overhead --> O[Skip]
    N --> P[Overhead tagged to stream]
    O --> Q[Stream $/hr updated in real-time]
    P --> Q
    Q --> R[Dashboard reflects current true hourly rate]
```

**GigAnalytics Improvements:**
1. ✅ **Calendar inference** eliminates 65% of "forgot to start" failures
2. ✅ **One-tap confirmation** reduces logging to < 5 seconds
3. ✅ **Smart defaults** (previous stream assignment) reduce wrong-project selections
4. ✅ **Overhead prompting** surfaces invisible time costs
5. ✅ **Auto-payment import** connects time to revenue automatically
6. ✅ **Real-time $/hr** visible immediately — no manual reconciliation

---

## Workflow 2: Monthly Income Reconciliation

### AS-IS: Current User Workflow (Painful)

```mermaid
flowchart TD
    A[End of month arrives] --> B[Open Fiverr dashboard]
    B --> C[Note: $847 earned]
    C --> D[Open Upwork dashboard]
    D --> E[Note: $1,240 earned]
    E --> F[Open Etsy dashboard]
    F --> G[Note: $312 earned]
    G --> H[Open PayPal]
    H --> I[Note: $200 direct client payment]
    I --> J[Open spreadsheet]
    J --> K[🔴 Type in all 4 numbers manually]
    K --> L{Are fees deducted?}
    L -- Usually not --> M[🔴 Gross income, not net]
    L -- Sometimes --> N[Manual fee calculation]
    N --> O[Net income approximated]
    M --> O
    O --> P{Hours tracked?}
    P -- Often incomplete --> Q[🔴 Partial hours only]
    P -- Complete --> R[Full hours available]
    Q --> S[🔴 Estimated hours only]
    R --> T[Divide income by hours]
    S --> T
    T --> U[🔴 Approximate $/hr, not accurate]
    U --> V[Monthly 'review' complete — 2+ hours spent]
    V --> W{Action taken?}
    W -- Rarely --> X[🔴 Insights not actioned]
    W -- Sometimes --> Y[Mental note to change behavior]
    Y --> Z[🔴 Forgotten within 1 week]
```

**Key Pain:** This workflow takes 2+ hours monthly. The output (approximate $/hr) is inaccurate. Even when insights are generated, they're not actioned because they're buried in a spreadsheet nobody revisits.

---

### TO-BE: GigAnalytics Workflow (Target)

```mermaid
flowchart TD
    A[Auto-sync runs nightly] --> B[Fiverr earnings imported via API]
    A --> C[Upwork CSV processed]
    A --> D[Etsy OAuth sync]
    A --> E[PayPal transactions imported]
    B --> F[Platform fees auto-deducted: Fiverr 20%]
    C --> G[Platform fees auto-deducted: Upwork 10%]
    D --> H[Platform fees auto-deducted: Etsy 6.5%+]
    E --> I[PayPal fee modeled if applicable]
    F --> J[Net income per stream calculated]
    G --> J
    H --> J
    I --> J
    J --> K[Time entries merged from calendar/timer]
    K --> L[True $/hr per stream calculated]
    L --> M[Monthly summary auto-generated]
    M --> N{User opens GigAnalytics}
    N --> O[Dashboard: stream comparison view]
    O --> P{Any anomalies?}
    P -- Yes --> Q[Alert: 'Your Etsy $/hr dropped 40% this month']
    P -- No --> R[No alert needed]
    Q --> S[One-tap: view details]
    S --> T[Root cause shown: 3 rush orders took 6hr each]
    T --> U[Recommendation: 'Raise Etsy rush order surcharge']
    R --> V[Green: all streams within normal range]
    U --> W[User takes action — or saves for later review]
    V --> W
    W --> X[Monthly reconciliation: 2 minutes, not 2 hours]
```

---

## Workflow 3: Payout Reconciliation & Fee Tracking

### AS-IS: Current State

```mermaid
flowchart TD
    A[Payment received in platform] --> B{Which platform?}
    B -- Fiverr --> C[Fiverr shows gross earned]
    B -- Upwork --> D[Upwork shows gross earned]
    B -- Etsy --> E[Etsy shows gross earned]
    C --> F[20% fee buried in monthly statement]
    D --> G[10% fee shown in separate report]
    E --> H[6.5%+3%+$0.25 fees split across 3 line items]
    F --> I[🔴 User doesn't know true take-home until payout]
    G --> I
    H --> I
    I --> J[Payout hits bank account]
    J --> K[🔴 Amount differs from expected — confusion]
    K --> L{User investigates}
    L -- Too busy --> M[🔴 Discrepancy unresolved]
    L -- Investigates --> N[Open 3 platform statements]
    N --> O[Manual math to reconcile]
    O --> P[Finally understand net vs gross]
    P --> Q[🔴 Understanding expires; cycle repeats next month]
```

### TO-BE: GigAnalytics Workflow

```mermaid
flowchart TD
    A[Earning event on any platform] --> B[GigAnalytics imports transaction]
    B --> C[Fee model applied automatically]
    C --> D[Net amount shown immediately]
    D --> E[Running month total updated]
    E --> F[Cumulative fee cost shown: 'You've paid $127 in fees this month']
    F --> G{Payout received in bank?}
    G -- Yes --> H[Bank import matches platform record]
    H --> I{Match?}
    I -- Yes --> J[✅ Reconciled automatically]
    I -- Discrepancy --> K[Alert: 'Fiverr payout differs from expected by $12']
    K --> L[One-tap: mark as resolved or investigate]
    J --> M[Payout history maintained permanently]
    L --> M
```

---

## Workflow 4: Price-Setting Decision

### AS-IS: Current State (No Data)

```mermaid
flowchart TD
    A[Freelancer considers raising rates] --> B{Has data?}
    B -- Rarely --> C[Search Reddit: 'Am I charging enough?']
    C --> D[Read 40 conflicting opinions]
    D --> E[Pick a number based on vibes]
    B -- Sometimes --> F[Look at competitor Upwork profiles]
    F --> G[See top-line rates, not effective rates]
    G --> E
    E --> H{Raise rate?}
    H -- Often too scared --> I[🔴 Keep same rate — miss income]
    H -- Sometimes --> J[Raise rate]
    J --> K{What happens?}
    K -- Lost clients --> L[🔴 Panic, lower rate again]
    K -- Nothing bad --> M[Relief — but was it optimal?]
    K -- More clients --> N[Lucky, but still no data]
    L --> O[🔴 Rate-setting anxiety persists]
    M --> O
    N --> O
```

### TO-BE: GigAnalytics Workflow

```mermaid
flowchart TD
    A[User opens Rate Intelligence tab] --> B[Current effective rate shown: $47/hr on Fiverr]
    B --> C[Benchmark overlay: 'Similar designers in your market: $55-72/hr']
    C --> D[Gap highlighted: 'You are 15% below median']
    D --> E{User ready to experiment?}
    E -- Yes --> F[Set up A/B test]
    F --> G[Assign new proposals to control $47 vs treatment $60]
    G --> H[GigAnalytics tracks outcomes for both groups]
    H --> I{4 weeks later: results}
    I --> J[Control group: 8 conversions at $47 = $376]
    I --> K[Treatment group: 5 conversions at $60 = $300]
    J --> L[Statistical analysis: not enough data yet]
    K --> L
    L --> M[8 weeks: treatment group 6 conversions at $60 = $360 — near parity]
    M --> N[Recommendation: 'Raise to $60 — no meaningful conversion drop']
    N --> O[User raises rate with confidence]
    O --> P[New benchmark recorded for future comparisons]
    E -- Not ready --> Q[View income projection at current rate]
    Q --> R['At $47/hr you need 106 hours/month to hit $5K target']
    R --> S['At $60/hr you only need 83 hours/month']
    S --> T[Data changes emotional calculus]
    T --> E
```

---

## Workflow 5: Platform Scheduling & Time Allocation

### AS-IS: Current State

```mermaid
flowchart TD
    A[Freelancer has 2 free hours] --> B{Which platform to work?}
    B -- No data --> C[Open whichever app feels right]
    C --> D[Check if there are notifications]
    D --> E[Work on whatever is most urgent]
    E --> F[🔴 Suboptimal allocation — not income-maximizing]
    B -- Has surge data --> G[Check Uber/DoorDash surge map]
    G --> H[Work surge area]
    H --> I[Better than random but still single-platform]
    I --> J[🔴 No cross-platform comparison]
```

### TO-BE: GigAnalytics Workflow

```mermaid
flowchart TD
    A[2 hours available — GigAnalytics notified via calendar] --> B[Platform heatmap loads]
    B --> C[Tuesday 3-5pm historical data analyzed]
    C --> D[Your platform comparison shown]
    D --> E{Highest $/hr opportunity?}
    E --> F[TaskRabbit: $27/hr avg on Tuesday afternoons]
    E --> G[Uber: $14/hr avg on Tuesday afternoons after gas]
    E --> H[Fiverr: passive — no active work needed]
    F --> I[Recommendation: 'Open TaskRabbit — your best $/hr right now']
    I --> J[User opens TaskRabbit]
    J --> K[Session tracked automatically]
    K --> L[Actual outcome recorded]
    L --> M[Heatmap updated with new data point]
    M --> N[Personalization improves over time]
```

---

## Workflow Summary: Friction Points Eliminated

| Workflow | Current Friction | GigAnalytics Solution | Time Saved |
|---------|-----------------|----------------------|------------|
| Time capture | Forgetting to log; manual entry | Calendar inference + one-tap | ~45 min/week |
| Monthly reconciliation | 2+ hours of manual spreadsheet work | Automatic sync + dashboard | ~2 hours/month |
| Fee tracking | Fees buried; surprises at payout | Real-time fee modeling | ~30 min/month |
| Price-setting | No data; gut feel; fear-driven | Benchmark + A/B experiment | Priceless (enables rate increases) |
| Platform scheduling | Random or single-platform | Cross-platform heatmap | Better $/hr on every session |

**Total estimated time saved per month:** 3-4 hours of manual reconciliation + more efficient working hours
**Total estimated income impact:** 15-30% increase from rate optimization and better platform allocation

---

## Data Flow Architecture (Simplified)

```mermaid
flowchart LR
    subgraph Inputs
        A[Stripe API]
        B[PayPal CSV]
        C[Upwork CSV]
        D[Fiverr CSV]
        E[Etsy OAuth]
        F[Calendar OAuth]
        G[Manual entries]
    end

    subgraph GigAnalytics Core
        H[Income normalizer & fee model]
        I[Time attribution engine]
        J[Stream classifier]
        K[$/hr calculator]
        L[Benchmark engine]
    end

    subgraph Outputs
        M[Unified dashboard]
        N[Stream ROI comparison]
        O[Rate recommendations]
        P[Tax export]
        Q[Schedule heatmap]
    end

    A --> H
    B --> H
    C --> H
    D --> H
    E --> H
    F --> I
    G --> I
    H --> J
    I --> J
    J --> K
    K --> L
    K --> M
    K --> N
    L --> O
    H --> P
    I --> Q
```
