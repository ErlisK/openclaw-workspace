# LicenseComposer — MVP Scope Document

**Version:** 1.0  
**Date:** 2026-04-12  
**Status:** Approved for build

---

## Problem Statement

Indie digital artists take commissions without contracts because good ones are too hard to find and too expensive to customize. The result is scope creep, IP disputes, non-payment, and lost income. The same pattern repeats weekly across r/ArtistLounge, r/gamedev, and every creator marketplace — communities can diagnose the problem ("you should have had a contract") but can't solve it cheaply or quickly.

---

## Target User

**Primary:** Freelance digital artist / illustrator who sells commissions (character art, logos, concept art) via Twitter/X, DeviantArt, Etsy, Gumroad, or direct DMs. Works alone. Makes $500–$5,000/year from commissions. Has never had a lawyer review anything.

**Secondary (v1.1):** Indie game developer commissioning art from contractors; two-person creative collaboration starting a project.

---

## Initial Template Set (v1)

| # | Template | Pages | Complexity |
|---|----------|-------|------------|
| 1 | **Commission Agreement** — scope, revisions, payment, IP | 2–3 pages | Core wizard, 7 questions |
| 2 | **Commercial License Add-on** — upgrades personal-use commission to commercial | 1 page | Toggle on Q4 of wizard |
| 3 | **Collaborator Revenue Split** — two creators, % split, vesting milestones | 3 pages | Separate 5-question wizard |
| 4 | **Asset License (Personal / Commercial)** — for creators selling digital assets, brushes, presets | 2 pages | Separate 5-question wizard |

*All templates include: plain-English summary, jurisdiction selector, version metadata, changelog.*

---

## Wizard Flow (Commission Agreement)

```
Q1 → Work Type (character art / logo / concept / etc.)
Q2 → Deliverable Spec (pieces, format, resolution, background)
Q3 → Revision Policy (number of rounds + overage fee)
Q4 → IP Rights (personal / commercial / exclusive / full transfer)
Q5 → Payment Terms (price, deposit %, refund policy)
Q6 → Platform Use (merch / game / NFT / social)  [optional]
Q7 → Jurisdiction (US / UK / EU / CA / AU)
```

Time to complete: ~90 seconds  
Output: Plain-English PDF + copy/paste text + embeddable badge

---

## MVP Features

### Must Have (Launch)
- [ ] 7-question wizard for Commission Agreement
- [ ] PDF generation (commission agreement, A4 and Letter)
- [ ] Versioned document ID (SHA-based, human-readable: LC-2026-XXXX)
- [ ] "Protected by LicenseComposer" badge (SVG, embeddable via `<img>` tag)
- [ ] Email delivery link (send agreement to client, log timestamp)
- [ ] $9/year subscription (unlimited exports via Stripe)
- [ ] Explicit "templates only / not legal advice" disclaimer on every page + output

### Should Have (Launch or Week 2)
- [ ] Commercial License Add-on (toggle in Q4)
- [ ] Jurisdiction filter (US / UK / EU / CA / AU)
- [ ] Mobile-friendly wizard UI
- [ ] Copy-to-clipboard for agreement text

### Nice to Have (v1.1)
- [ ] Collaborator Revenue Split wizard (5 questions)
- [ ] Asset License wizard (5 questions)
- [ ] PDF signing via email (DocuSign-lite, client clicks link to acknowledge)
- [ ] Template marketplace (premium templates at $5 each)
- [ ] Paid lawyer review referral ($75–$150 per review)

---

## Out of Scope (v1)

- Real-time lawyer chat
- Multi-party negotiation
- Contract storage / vault (link to Google Drive is sufficient)
- E-signature with legal enforceability (acknowledge-only is fine for v1)
- Any non-English templates
- NFT-specific contract flows (deferred: market cooling, complexity)
- Publisher / developer agreements (too complex, needs lawyer)
- Automated DMCA takedown filing

---

## Technical Architecture (Minimal)

- **Frontend:** Next.js App Router, TypeScript, Tailwind
- **Wizard:** Multi-step form (client-side, no DB needed for generation)
- **PDF:** `@react-pdf/renderer` or `pdf-lib` server-side generation
- **Payments:** Stripe Checkout ($9/year subscription)
- **Auth:** Clerk or NextAuth (email + Google)
- **DB:** Supabase (store: user, generated doc metadata, badge ID)
- **Hosting:** Vercel

---

## Success Metrics (90 Days Post-Launch)

| Metric | Target |
|--------|--------|
| Wizard completions | 500 |
| Paid subscribers | 50 ($450 ARR) |
| Badge embeds on creator storefronts | 100 |
| Community mentions / organic posts | 10+ |
| NPS from first 20 users | > 40 |
| Support tickets about "wrong template" | < 5% |

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| "Not real legal advice" complaints | Prominent disclaimer on every screen and output |
| Templates wrong for user's jurisdiction | Jurisdiction selector + geofenced warnings |
| Low conversion on $9/year | Free tier (1 export/month), paid = unlimited |
| Creators don't know they need this | SEO content targeting "commission contract template" queries (proven search volume) |
| Larger player copies the idea | Speed + community trust + template marketplace moat |

---

## Why This Wins

1. **Demand is proven** — communities actively ask for this exact thing (r/ArtistLounge: "Does anybody have a commission contract template?")
2. **CAC is near-zero** — creator communities share tools that solve chronic pains; one viral post = 1,000 users
3. **Lawyer economics flip** — $9/year vs. $300–$500 for a lawyer; obvious ROI for anyone making >$100/year in commissions
4. **Compounding moat** — every badge embed is a marketing impression; every template sold adds to the marketplace
