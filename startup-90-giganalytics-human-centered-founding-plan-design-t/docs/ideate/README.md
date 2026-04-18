# GigAnalytics — Ideate Phase README
## Solution Directions, Scoring Matrix, IA Map, and User Journeys

**Phase:** Ideate  
**Date:** April 2026  
**Status:** Complete — feeds directly into Prototype phase  

---

## What's in This Directory

| File | Purpose |
|------|---------|
| `01-direction-a-payments-first.md` | Solution brief: CSV/import-led + timer approach |
| `02-direction-b-calendar-first.md` | Solution brief: ICS upload + smart calendar time detection |
| `03-direction-c-pricing-lab.md` | Solution brief: A/B pricing analyzer + price simulator |
| `04-scoring-matrix-decision.md` | Weighted scoring matrix + selected hybrid MVP decision |
| `05-ia-map.md` | Full route tree (20+ routes), permission matrix, data flow |
| `06-user-journeys.md` | 3 user journey blueprints with emotion arcs and decision trees |

---

## Decision Summary

**Selected:** Payments-First Hybrid (Direction A core + Direction B roadmap)

| Phase | Directions | Timeline |
|-------|-----------|----------|
| **MVP (Phase 1)** | Direction A — CSV import + timer + $/hr | Weeks 1–8 |
| **V1.1 (Phase 2)** | + Direction B — Calendar inference + weekly review | Weeks 9–12 |
| **V2.0 (Phase 3)** | + Direction C — Pricing Lab (A/B experiment + simulator) | Weeks 13–20 |

**Direction C (Pricing Lab)** is deferred because: (1) demand is unvalidated, (2) only relevant to high-proposal-volume users, (3) the core $/hr tracking must be proven first.

---

## Scoring Summary

| Direction | Feasibility | Viability | Weighted Total | Rank |
|-----------|:-----------:|:---------:|:--------------:|:----:|
| A — Payments-First | 23/25 | 20/25 | 108 | 1st |
| B — Calendar-First | 18/25 | 22/25 | 105 | 2nd |
| C — Pricing Lab | 18/25 | 20/25 | 87 | 3rd |

Direction A leads on feasibility. Direction B leads on viability (retention). Hybrid captures both.

---

## Key IA Routes (Core 5)

1. `/dashboard` — $/hr per stream, cross-stream comparison, goal, recommendation
2. `/import` — CSV upload hub with auto-detection (Stripe/PayPal/Upwork/Toggl)
3. `/streams/[id]` — Stream detail: transactions, time entries, fee breakdown, $/hr
4. `/timer` — 1-tap timer + quick-log retroactive entry + time history
5. `/onboarding` — 4-step guided setup: import → streams → time → goal

Full route tree in `05-ia-map.md`.

---

## User Journey Heroes

**Journey 1 (First session, ≤10 min):** CSV upload on landing → signup → stream naming → time entry → $/hr comparison → "Acme Corp earns 3.2× more per hour than Upwork" → screenshot + share.

**Journey 2 (Weekly habit):** Monday 9am 1-tap timer start → lunch stop → afternoon quick log → Wednesday overhead entry → Friday weekly email → dashboard re-open → recommendation updated.

**Journey 3 (Upgrade):** Day 12 → PayPal CSV import gate → $9/month Pro prompt → Stripe Checkout → PayPal CSV imported → 5th stream discovered → upgrade justified immediately.

Full blueprints in `06-user-journeys.md`.

---

## Connection to Other Phases

| This phase references... | From phase... |
|--------------------------|---------------|
| Persona: Alex, UX designer, Portland | Empathize: `docs/empathize/empathy-maps/` |
| Hypothesis H1–H7 + Assumptions A1–A10 | Define: `docs/define/insight-brief.md` |
| Feature priorities (P0/P1/P2) | Define: `docs/define/03-feature-priorities.md` |
| Acceptance criteria (all AC-F1 through AC-F8) | Define: `docs/define/07-mvp-acceptance-criteria.md` |
| Tech constraints (Next.js, Supabase, Stripe) | Define: `docs/define/06-tech-constraints-adr.md` |

**Next phase:** Prototype — implement the Hybrid MVP based on the IA map and user journey blueprints in this directory.
