# Annotated UX Flow 09: Bonsai — Proposal → Contract → Invoice
## Source: https://www.hellobonsai.com/features | Friction Score: 3/5

---

## Context
A web developer uses Bonsai to send a $5,000 fixed-price proposal, get it signed, and invoice in two milestones.

## Annotated Flow

```
╔══════════════════════════════════════════════════════════╗
║  STEP 1: Create Proposal from Template                   ║
╠══════════════════════════════════════════════════════════╣
║  Proposals → + New → [Web Development ▼]                 ║
║                                                          ║
║  UX Research & Wireframes ············ $800              ║
║  Visual Design ······················ $1,200             ║
║  Development ························ $2,500             ║
║  Testing & QA ······················   $500             ║
║  Total: $5,000                                           ║
║                                                          ║
║  ✓ GOOD: Templated line items. Professional output.      ║
║  ✗ MISSING: No hour estimates per line item.             ║
║    If project runs over, no data to analyze why.         ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 2: Client Signs Electronically                     ║
╠══════════════════════════════════════════════════════════╣
║  [Send Proposal] → Client receives link → [Sign]         ║
║  Legally timestamped, no DocuSign needed                 ║
║                                                          ║
║  ✓ EXCELLENT: e-signature in same tool. Real value.      ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 3: Convert to Contract                             ║
╠══════════════════════════════════════════════════════════╣
║  [Convert to Contract]                                   ║
║  Payment schedule: [50% upfront / 50% on completion ▼]  ║
║  Late fees: [Yes]  Termination: [Yes]                    ║
║                                                          ║
║  ✓ GOOD: Smooth proposal → contract conversion.          ║
║  ✗ MISSING: No time tracking within milestones.          ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 4: Invoice Milestone + Receive Payment             ║
╠══════════════════════════════════════════════════════════╣
║  Invoice auto-populates: "Acme Corp · $2,500 · M1 of 2"  ║
║  Client pays via card/ACH through Bonsai Payments        ║
║  → marked "Paid" automatically ✓                         ║
║                                                          ║
║  ✓ EXCELLENT: Proposal → Invoice → Payment in one tool.  ║
║  ✗ BAD: If client pays outside Bonsai → manual mark paid ║
║  ✗ BAD: Income shows in Bonsai only.                     ║
║    No bridge to Upwork income / other streams.           ║
╚══════════════════════════════════════════════════════════╝
                         ↓
╔══════════════════════════════════════════════════════════╗
║  STEP 5: Earnings View                                   ║
╠══════════════════════════════════════════════════════════╣
║  Income this month: $5,000                               ║
║  Outstanding: $2,500  Cash received: $2,500              ║
║                                                          ║
║  ✓ GOOD: Outstanding vs. received split.                 ║
║  ✗ BAD: No $/hr (no time tracking connected).            ║
║  ✗ BAD: Bonsai-only view — Upwork income invisible.      ║
╚══════════════════════════════════════════════════════════╝
```

## GigAnalytics Opportunities Identified
1. Bonsai is best-in-class for single-platform service freelancers
2. Target: "I use Bonsai but I also have Upwork/Stripe income that isn't in there"
3. Import Bonsai invoice data → combine with other streams → complete picture
4. Add time tracking against Bonsai projects → calculate $/hr on fixed-price work
