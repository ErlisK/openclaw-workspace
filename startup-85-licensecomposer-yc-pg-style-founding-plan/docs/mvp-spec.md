# LicenseComposer — MVP Spec

**Version:** 1.0 | **Date:** 2026-04-12  
**Evidence base:** `apps/licensecomposer/research/evidence.json` (58 pain quotes, 7 sources)  
**Scope constraints:** 3 license types · US + UK · Itch.io + Gumroad + OpenSea

---

## Problem (one sentence)

Indie digital creators work without contracts because every template they find is either half-baked,
lawyer-priced, or generic — so scope creep, IP disputes, and non-payment keep happening to the same
people, week after week, in the same communities.

> *"All the commission contract templates I find online seem half-baked and I don't have the know-how
> to alter them myself!"* — r/ArtistLounge (evidence.json Q004)

---

## Target User

Freelance digital artist selling commissions or digital assets via Itch.io or Gumroad.
Earns $500–$5,000/year from creative work. Has never used a lawyer. Knows she needs a contract.
Doesn't have one.

---

## V1 Scope (razor-narrow)

| Dimension | In v1 | Deferred |
|-----------|-------|----------|
| Templates | Commissioned Work Agreement · Commercial Asset License · Collaborator Split Agreement | Beat, NFT-native, publisher |
| Jurisdictions | 🇺🇸 United States · 🇬🇧 United Kingdom | EU, CA, AU |
| Platforms | Itch.io · Gumroad · OpenSea | Etsy, Steam, Patreon |

---

## Wizard A — Commissioned Work Agreement (7 questions)

| # | Question | Pain it solves | Cited evidence |
|---|----------|---------------|----------------|
| A1 | **Work type** — what are you creating? (character art / logo / concept / etc.) | Deliverable category ambiguity lets clients expand scope without a paper trail | Q001: *"The client keeps adding more and more work without paying extra"* — r/ArtistLounge |
| A2 | **Deliverable spec** — exact pieces, file formats, resolution, background, characters | Scope creep root cause: no written list of what's included | Q019: *"My client keeps sending new reference images… We never agreed on a final deliverable list"* — r/ArtistLounge |
| A3 | **Revision policy** — rounds included; overage fee per extra round | Unlimited revision abuse when nothing is written down | Q003: *"I agreed to three revisions. They've now asked for nine. I have nothing in writing that limits them"* — r/ArtistLounge |
| A4 | **IP rights grant** — personal / commercial / exclusive commercial / full transfer | Buyers assume a commission includes commercial rights; it doesn't by default | Q015: *"A commission does not include the price of a commercial license unless explicitly stated"* — r/ArtistLounge |
| A5 | **Payment terms** — total price, deposit %, when final payment is due, refund policy | Client ghosting after work has begun; no deposit = no recourse | Q018: *"Clients ghosting mid-project after I've already put in 20+ hours. No contract means no recourse"* — r/ArtistLounge |
| A6 | **Jurisdiction** — US (+ state) or UK | Cross-border legal exposure when buyer and seller are in different countries | Q048: *"Your buyers might be in the EU… as such they are subjected to EU laws"* — itch.io forum |
| A7 | **Platform** — Itch.io / Gumroad / direct | Platform-specific refund and payment terms need matching contract language | Q023: *"Think how much business you lose daily. Take a lawyer to clarify obligations and rights of customers"* — itch.io forum |

---

## Wizard B — Commercial Asset License (6 questions)

| # | Question | Pain it solves | Cited evidence |
|---|----------|---------------|----------------|
| B1 | **Asset type** — sprites / fonts / brushes / audio / 3D / UI / NFT | Asset type determines which platform carve-outs apply | Q020: *"Can I use an asset I purchased for commercial use as part of UI in my mobile game? I read the entire T&C and couldn't find an answer"* — itch.io forum |
| B2 | **License tier** — personal / small commercial / unlimited commercial / extended resale | "Commercial use" is undefined on most asset listings; buyers go elsewhere | Q022: *"Even the term 'commercial use' must be specified — a verbal 'Yes' from a creator has no legal meaning"* — itch.io forum |
| B3 | **Attribution** — required / tier-dependent / not required | Attribution disputes cause community friction; unclear requirements lose sales | Q050: *"The same asset costs $5 here but $11 on gamedevmarket because of unclear terms"* — itch.io forum |
| B4 | **Redistribution** — none / compiled product only / extended (standalone resale) | Unauthorized redistribution and asset theft after purchase | Q024: *"Assets are frequently taken down from asset stores and licenses voided due to the publisher not having the rights to sell them"* — r/gamedev |
| B5 | **Platform clause** — Itch.io / Gumroad / OpenSea specific addendum | Each platform has different intermediary, refund, and royalty behavior | Q051: *"Major NFT marketplaces eliminated creator royalties… allowing buyers to pay zero regardless of the creator's stated expectations"* — mclaw.io |
| B6 | **Jurisdiction** — US or UK | Cross-border IP enforcement uncertainty | Q049: *"Most intellectual property laws are similar in all countries, so if I misuse a property I can be sued almost anywhere"* — itch.io forum |

---

## Wizard C — Collaborator Split Agreement (6 questions)

| # | Question | Pain it solves | Cited evidence |
|---|----------|---------------|----------------|
| C1 | **Project type** — game / art collection / music / app / other | Defines asset types and revenue sources the agreement covers | Q035: *"I am close to finishing a game with 3 friends. We agreed to split revenue 40/40/10/10. However we have no contract"* — gamedev.stackexchange |
| C2 | **Contributors & splits** — names, roles, percentages (must total 100%) | No written split = post-launch dispute when real money arrives | Q038: *"How is the revenue that is supposed to be split calculated? Gross or net? When is it paid? Who gets the money first?"* — argolawyer.com |
| C3 | **Revenue definition** — gross / net after fees / net after expenses; DLC + merch inclusion | The most-contested undefined term in every rev-share dispute | Q044: *"What about sales of DLC, sequels, or merchandise? How is any of that going to be taxed?"* — argolawyer.com |
| C4 | **Vesting & exit** — full share / pro-rated / milestone vesting; IP on departure | Early walkaway claiming full share while others finish the project | Q036: *"If one of you walks away after one month and gets their full share, this person gets the fruits of all your effort without doing a thing"* — gamedev.stackexchange |
| C5 | **IP ownership** — joint / lead owns / entity owns | Contributor retains copyright by default without written IP assignment; can block publication | Q027: *"A dispute over IP rights can kill a project or result in lengthy litigation"* — legalmoveslawfirm.com |
| C6 | **Jurisdiction** — US or UK | Enforcement jurisdiction for revenue disputes | Q042: *"The cost of pursuing litigation often exceeds the potential recovery for a small indie title"* — legalmoveslawfirm.com |

---

## Output per Export

- Plain-English PDF (A4 + Letter), server-side generated
- Versioned document ID: `LC-YYYY-XXXX` (embedded in footer)
- Embeddable storefront badge: `<img src="https://licensecomposer.app/badge/LC-YYYY-XXXX.svg">`
- Optional email delivery link → client clicks to acknowledge → timestamp logged

---

## Monetization

- **Free tier:** 1 export / month (conversion funnel)
- **Pro:** $9 / year — unlimited exports, all 3 templates, badge system
- **Future:** $5 per premium template, paid lawyer review referral

---

## MVP Features (launch)

✅ All three wizards (A, B, C)  
✅ PDF generation (server-side, `pdf-lib`)  
✅ Document ID + badge system  
✅ Email delivery link (acknowledgment + timestamp)  
✅ Stripe subscription ($9/year)  
✅ "Templates only / not legal advice" disclaimer on every screen and PDF  

**Out of scope (v1):** EU/CA/AU jurisdictions · Etsy/Steam/Patreon · legally-binding e-signature ·
real-time lawyer chat · template marketplace · NFT-native licenses

---

## Stack

Next.js App Router · TypeScript · Tailwind · Supabase · Stripe · pdf-lib · Vercel

---

## 90-Day Targets

| Metric | Goal |
|--------|------|
| Wizard completions | 500 |
| Paid subscribers | 50 ($450 ARR) |
| Storefront badge embeds | 100 |
| Organic community mentions | 10 |
| NPS (first 20 users) | > 40 |

---

*Full evidence: `apps/licensecomposer/research/evidence.json` — 58 pain quotes, 7 community sources*  
*Scope rationale: `apps/licensecomposer/research/v1-scope-decision.md`*  
*Wizard detail: `apps/licensecomposer/research/wizard-questions.md`*
