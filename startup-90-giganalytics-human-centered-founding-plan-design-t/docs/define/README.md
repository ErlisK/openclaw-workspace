# GigAnalytics — Define Phase Index
## POV, Insight Brief, and Feature Priorities

**Phase:** Define (Design Thinking Step 2)  
**Date:** April 2026  
**Inputs:** 62 Empathize phase artifacts (14 competitors, 10 forums, 12 platform flows, 6 empathy maps, 3 journey maps)

---

## Files in This Directory

| File | Contents |
|------|---------|
| `01-pov-statement.md` | Point of View statement, 3 persona sub-POVs, competitive white space validation, validation plan |
| `02-insight-brief.md` | Segment definition + sizing, 3 sub-segments, core insight, technical/business/design constraints, 10 MVP acceptance criteria (AC-001 to AC-010), quantified success metrics |
| `03-feature-priorities.md` | Full feature list with P0/P1/P2/P3/P4 tiers, rationale for each, explicit scope exclusions, 6-sprint MVP build sequence |

---

## One-Page Summary

### The POV
> For multi-stream solopreneurs juggling 2–5 gig income sources who struggle to know their true hourly ROI across platforms — because every platform is a silo, fees are hidden, and time data lives nowhere near payment data — GigAnalytics transforms raw payment imports and minimal time inputs into clear, actionable ROI decisions via frictionless multi-platform import, smart defaults, and privacy-first anonymous benchmarks.

### The Primary Segment
Multi-stream solopreneurs earning $500+/month from 2+ digital platforms, currently tracking income via spreadsheet or mental accounting.

**MVP priority order:**
1. Service Freelancer (Upwork + direct Stripe clients + Toggl)
2. Creator-Seller (Etsy + Gumroad)
3. Platform Gig Worker (DoorDash + TaskRabbit + Rover) — post-MVP

### The Core Insight
Every gig platform shows gross earnings. Every time tracker shows hours. No platform shows earnings ÷ hours per income stream. This number — effective hourly rate per stream — is the decision-making lever that determines where a multi-stream worker should invest their finite time. It is universally wanted and universally unavailable.

### MVP Must-Haves (P0+P1)
- Multi-platform CSV import (Stripe, PayPal, Upwork, Etsy, Gumroad) with auto-format detection
- Fee extraction: Gross → Fee → Net, platform-specific formula, no user math required
- Income stream organization + pending vs. cleared separation
- Manual time entry (≤30 sec) + Google Calendar inference
- Effective $/hr per stream + cross-stream ranked comparison
- Income goal tracker with progress bar + pace projection
- Tax export (one CSV, CPA-ready)
- Mobile PWA + guided onboarding to first $/hr in ≤5 min

### Key Constraints
- No API for DoorDash/TaskRabbit/Rover → manual entry required for Tier 3
- Upwork CSV shows NET only → must reconstruct gross (net ÷ 0.9)
- Etsy requires 2-file merge → auto-join on Order ID
- Stripe OAuth requires Connect approval → CSV fallback for MVP
- Privacy bar is high → zero-sell policy, data deletion, transparent storage

### Success at 30 Days Post-Launch
- 200 signups, 50% activation (see $/hr in first session), 30% D7 retention, 8% paid conversion, NPS >40

---

## Connection to Other Phases

| Phase | Status | Key Output |
|-------|--------|-----------|
| **Empathize** | ✅ Complete | 62 research artifacts in `/docs/empathize/` |
| **Define** | ✅ Complete | 3 documents in `/docs/define/` (this directory) |
| **Ideate** | 🔜 Next | How Might We prompts, feature sketches, UX concepts |
| **Prototype** | 🔜 Future | Low-fi wireframes → Next.js MVP |
| **Test** | 🔜 Future | User interviews, prototype testing, PMF validation |
