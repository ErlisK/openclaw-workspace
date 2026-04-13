# LicenseComposer — MVP Scope (v1 Final)

**Version:** 1.1 (razor-narrow) | **Date:** 2026-04-12 | **Status:** FINAL

---

## Problem
Indie digital creators work without contracts because good templates don't exist in plain English,
generic ones are unusable, and lawyers cost $300+/hr. The result: scope creep, IP disputes, and
lost income — documented weekly across r/ArtistLounge, r/gamedev, and itch.io forums.

## Target User (Beachhead)
Freelance digital artist selling commissions or digital assets via Itch.io or Gumroad.
Earns $500–$5,000/year from creator work. Has never used a lawyer. Knows she needs a contract.

## V1 Constraints (razor-narrow)

| Dimension | V1 Only |
|-----------|---------|
| License types | Commissioned Work Agreement · Commercial Asset License · Collaborator Split Agreement |
| Jurisdictions | United States (+ state) · United Kingdom (England & Wales) |
| Platforms | Itch.io · Gumroad · OpenSea |

## Wizard Flow

### Template A — Commissioned Work Agreement (7 questions)
```
A1 Work type → A2 Deliverable spec → A3 Revision policy →
A4 IP rights → A5 Payment terms → A6 Jurisdiction → A7 Platform
```

### Template B — Commercial Asset License (6 questions)
```
B1 Asset type → B2 License tier → B3 Attribution →
B4 Redistribution → B5 Platform clause → B6 Jurisdiction
```

### Template C — Collaborator Split Agreement (6 questions)
```
C1 Project type → C2 Contributors & splits → C3 Revenue definition →
C4 Vesting & exit → C5 IP ownership → C6 Jurisdiction
```

## Output Per Export
- Plain-English PDF (A4 / Letter)
- Versioned document ID: `LC-YYYY-XXXX`
- Embeddable storefront badge (SVG)
- Optional email delivery link (client acknowledgment + timestamp)

## Features

**Launch (must-have):**
- All three wizards
- PDF generation (server-side, pdf-lib)
- Document ID + badge system
- Email delivery link
- $9/year unlimited-export subscription (Stripe)
- 1 free export/month (conversion funnel)
- "Templates only / not legal advice" disclaimer on every screen + PDF

**Week 2 (should-have):**
- Mobile-optimized wizard
- Copy-to-clipboard contract text
- Jurisdiction warning banner for unsupported regions

## Out of Scope (v1)
EU/CA/AU jurisdictions · Etsy/Steam/Patreon · NFT-native licenses · legally-binding
e-signature · real-time lawyer chat · template marketplace · beat licenses

## Stack
Next.js App Router · TypeScript · Tailwind · Supabase · Stripe · pdf-lib · Vercel

## 90-Day Targets
| Metric | Goal |
|--------|------|
| Wizard completions | 500 |
| Paid subscribers ($9/yr) | 50 → $450 ARR |
| Storefront badge embeds | 100 |
| Organic community mentions | 10 |
| NPS (first 20 users) | > 40 |

## Evidence Base
58 pain quotes across 7 sources → full data at `apps/licensecomposer/research/evidence.json`  
Top signal: r/ArtistLounge (19 quotes), r/gamedev + stackexchange (12), itch.io forums (7)
