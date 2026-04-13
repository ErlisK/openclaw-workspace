# LicenseComposer — Wizard Question Draft (All Three Templates)

**Version:** 1.0 | **Date:** 2026-04-12  
**Scope:** US + UK jurisdictions | Itch.io + Gumroad + OpenSea platforms

Each wizard is independent. Users pick their template type first, then answer 5–7 questions.
All wizards share Q_JUR (jurisdiction) and Q_PLAT (platform) as the final two questions.

---

## WIZARD A: Commissioned Work Agreement

*Target user: digital artist taking a commission for character art, logo, concept art, illustrations*

---

### A1 — Work Type
**Question:** What are you creating?

**Options:**
- Character illustration / portrait
- Logo or brand identity
- Concept art (game, film, book cover)
- Comic pages / sequential panels
- Graphic design (social media, merch, UI)
- Other digital artwork

**Template field populated:** `work_description`  
**Pain addressed:** Defines the deliverable category so "one more small change" can't expand into
a different type of work entirely.  
**Evidence:** Q001 (r/ArtistLounge tegp98) — *"What I'm running into right now is the client keeps adding more and more work without paying extra."*

---

### A2 — Deliverable Specification
**Question:** What exactly will be delivered?

**Sub-fields (auto-suggested by A1 answer):**
| Sub-field | Example |
|-----------|---------|
| Number of final pieces | 1 full illustration |
| File formats | PNG (3000×3000px), layered PSD |
| Background | Transparent / simple / detailed |
| Number of characters / elements | Up to 2 characters |
| Color / black-and-white | Full color |
| Additional deliverables | Print-ready PDF |

**Template field populated:** `deliverables_list`  
**Pain addressed:** Locks scope to a specific list before work starts — the single root cause of all scope creep.  
**Evidence:** Q019 — *"My client keeps sending new reference images and saying 'can we incorporate this element too?' We never agreed on a final deliverable list."*

---

### A3 — Revision Policy
**Question:** How many rounds of revisions are included in the agreed price?

**Primary options:**
- 1 round of revisions
- 2 rounds of revisions
- 3 rounds of revisions
- No revisions (artist presents final; client approves or cancels)
- Custom: ___ rounds

**Follow-up:** What happens if the client requests additional rounds beyond the included amount?
- Each additional round costs $___
- Additional rounds are not available (original scope only)
- At the artist's sole discretion

**Template field populated:** `revision_rounds`, `revision_overage_fee`  
**Pain addressed:** Ends unlimited revision abuse. Creates a written limit enforceable by pointing to the signed document.  
**Evidence:** Q003 — *"I agreed to three revisions. They've now asked for nine. I have nothing in writing that limits them."*

---

### A4 — IP Rights Grant
**Question:** What rights does the client receive when the work is delivered?

**Options (plain-English labels with legal effect shown on hover):**

| Option | What it means |
|--------|---------------|
| **Personal use only** | Display it, print it for yourself. Cannot use in any commercial context. |
| **Commercial license** | Use in your business (merch, ads, social media brand). Artist retains copyright. |
| **Exclusive commercial license** | Commercial use + artist won't sell this design to anyone else. Higher fee typical. |
| **Full copyright transfer** | Artist gives up all rights entirely. You own the work. *(Add-on fee — not recommended without legal advice.)* |

**Inline banner shown:**  
> *"A commission does not include commercial rights unless explicitly stated here. By default, the artist retains all copyright."*

**Template field populated:** `ip_rights_type`, `exclusivity_flag`  
**Pain addressed:** Eliminates the most common IP confusion — buyers assuming they can resell or commercialize work they paid for.  
**Evidence:** Q015 — *"A commission does not include the price of a commercial license unless explicitly stated."* Q016 — *"The person who ordered the commission has zero rights to sell the work or prints of it unless agreed upon in the contract."*

---

### A5 — Payment Terms
**Question:** What are the payment details?

**Sub-fields:**
| Field | Default suggested |
|-------|-----------------|
| Total agreed price | $___ |
| Deposit required upfront | 50% (non-refundable) |
| Final payment due | Before file delivery |
| Refund policy | Deposit non-refundable; full refund if cancelled before sketch stage |

**Template field populated:** `total_price`, `deposit_pct`, `payment_due_trigger`, `refund_policy`  
**Pain addressed:** Prevents client ghosting and non-payment after work has begun.  
**Evidence:** Q014 — *"Write up a contract and have them sign it before starting any job, and ask for half the payment upfront."* Q018 — *"Clients ghosting mid-project after I've already put in 20+ hours. No contract means no recourse."*

---

### A6 — Jurisdiction *(shared)*
**Question:** Which country's laws govern this agreement?

**Options:**
- 🇺🇸 United States → sub-select state (default: California)
- 🇬🇧 United Kingdom (England and Wales)
- Other *(exports with international fallback terms + warning banner)*

**Template field populated:** `governing_law`, `state_or_region`  
**Pain addressed:** Cross-border disputes; EU buyers of US creators and vice versa.  
**Evidence:** Q047–Q049 (itch.io forum) — *"Your business may not be in the EU but your buyers might."*

---

### A7 — Platform *(shared)*
**Question:** Which platform will you use to deliver or sell this commission? *(optional — tailors platform-specific clauses)*

**Options:**
- Itch.io
- Gumroad
- Direct (no platform)
- Other

**Template field populated:** `platform_clause_variant`  
**Pain addressed:** Platform-specific payment and refund terms need matching contract language.  
**Evidence:** Q023 (itch.io forum) — *"Think how much business you lose daily. Take a lawyer to clarify obligations and rights of customers."*

**Total questions: 7**

---

## WIZARD B: Commercial Asset License

*Target user: creator selling digital assets (sprites, fonts, brushes, presets, audio, UI packs) on Itch.io, Gumroad, or OpenSea*

---

### B1 — Asset Type
**Question:** What type of digital asset are you licensing?

**Options:**
- Game art (sprites, tilesets, character sheets)
- Fonts / typefaces
- Brushes / Photoshop / Procreate presets
- Audio (SFX, music loops, voice)
- 3D models / textures
- UI / icon packs
- NFT / digital collectible
- Other digital file

**Template field populated:** `asset_type`  
**Pain addressed:** Asset type determines which platform carve-outs and restrictions apply.  
**Evidence:** Q020 (itch.io forum) — *"Can I use an asset I purchased for commercial use as part of UI in my mobile game? I read the entire terms and couldn't find an answer."*

---

### B2 — License Tier
**Question:** What level of commercial use do you want to allow?

**Options:**
| Tier | What buyers can do |
|------|-------------------|
| **Personal use only** | Use in non-monetized personal projects. No resale, no revenue-generating use. |
| **Small commercial** | Use in projects earning under $10,000/year. One end-product. No redistribution. |
| **Unlimited commercial** | Use in any commercial project. Unlimited end-products. No redistribution of the asset itself. |
| **Extended / resale** | Can include asset in products sold to end-users (e.g., game sold on Steam using this tileset). |

*Note: Separate tiers can be sold at different prices — the wizard generates a license for each tier.*

**Template field populated:** `license_tier`, `revenue_cap`  
**Pain addressed:** The most-cited pain on itch.io — buyers don't know what "commercial use" means.  
**Evidence:** Q022 — *"Even the term 'commercial use' must be specified."*

---

### B3 — Attribution
**Question:** Do you require attribution (credit) when buyers use this asset?

**Options:**
- Yes — buyer must credit "[Creator Name]" in credits / README
- Yes — credit required only for free/personal use tier
- No — attribution not required (credit appreciated but optional)

**Template field populated:** `attribution_required`, `attribution_format`  
**Pain addressed:** Attribution disputes are common on itch.io; unclear requirements lead to community friction.

---

### B4 — Redistribution & Resale
**Question:** Can buyers redistribute or resell the asset files themselves?

**Options:**
- No — buyers cannot share or resell the asset files under any circumstance
- Limited — buyers can include the asset in a larger compiled product (e.g., a game) but not sell the files standalone
- Yes (Extended license only) — buyers can include in items sold to end-users

**Template field populated:** `redistribution_allowed`, `standalone_resale_allowed`  
**Pain addressed:** Prevents asset theft / unauthorized redistribution.  
**Evidence:** Q024 (r/gamedev) — *"Assets are frequently taken down from asset stores and the licenses voided due to the publisher not having the rights to sell the assets in the first place."*

---

### B5 — Platform-Specific Clause
**Question:** Where are you selling this asset?

**Options (multi-select):**
- Itch.io → adds: *"License version and terms are visible on the itch.io product page. Itch.io is a marketplace intermediary and is not a party to this license."*
- Gumroad → adds: *"Buyer's Gumroad receipt serves as proof of license purchase. Refund requests handled per Gumroad's 30-day policy do not void license if download occurred."*
- OpenSea → adds: *"Purchase of an NFT token does not transfer copyright. Creator retains all copyright in the underlying artwork. Secondary sales do not grant additional rights beyond this license."*
- Direct / own website → generic terms

**Template field populated:** `platform_addendum`  
**Pain addressed:** Platform-specific confusion documented across all three target platforms.  
**Evidence:** Q051–Q053 (OpenSea royalty elimination), Q020–Q023 (itch.io commercial confusion)

---

### B6 — Jurisdiction *(shared — same as A6)*

### B7 — (optional) AI-Generation Disclosure
**Question:** Was this asset created with AI tools (Midjourney, Stable Diffusion, etc.)?

**Options:**
- No — fully human-created
- Partially — AI-assisted, human-edited
- Yes — AI-generated, human-curated/selected

**Template field populated:** `ai_generation_disclosure`  
**Pain addressed:** Emerging legal exposure; some platforms (Etsy, Adobe Stock) require disclosure.
Proactively including this protects sellers.

**Total questions: 6 (B7 optional)**

---

## WIZARD C: Collaborator Split Agreement

*Target user: 2–4 creators building a project together (indie game, zine, music release, digital product)*

---

### C1 — Project Type
**Question:** What kind of project are collaborators working on together?

**Options:**
- Indie video game
- Digital art collection / zine
- Music release / album
- Software / app / tool
- Other creative project

**Template field populated:** `project_type`, `project_description`  
**Pain addressed:** Defines the asset types and revenue sources covered by the agreement.  
**Evidence:** Q035 (gamedev.stackexchange) — *"I am close to finishing a game with 3 friends … we have no contract."*

---

### C2 — Contributors & Splits
**Question:** Who are the contributors and what is each person's revenue share?

**Sub-fields (up to 4 contributors):**
| Field | Example |
|-------|---------|
| Contributor name / handle | @artist_alice |
| Role | Illustrator |
| Revenue share % | 30% |
| Contribution type | Art assets, character design |

*Validation: splits must total 100%*

**Template field populated:** `contributor_list[]`, `split_percentages[]`  
**Pain addressed:** The core gap — no written split agreement before launch.  
**Evidence:** Q038 — *"How is the revenue that is supposed to be split calculated — is it gross or net? When is it to be paid? Who gets the money first?"*

---

### C3 — Revenue Definition
**Question:** How is "revenue" defined for split purposes?

**Options:**
- Gross revenue (all money received before any fees)
- Net revenue after platform fees (e.g., after Steam's 30%, itch.io's cut)
- Net revenue after platform fees AND operating expenses (hosting, tools, marketing)
- Custom definition: ___

**Follow-up:** Are the following included in the split?
- DLC / expansions: Yes / No / Negotiate separately
- Merchandise: Yes / No / Negotiate separately
- Sequel / derivative works: Yes / No / Negotiate separately

**Template field populated:** `revenue_definition`, `dlc_included`, `merch_included`  
**Pain addressed:** The most contentious undefined term in all rev-share disputes.  
**Evidence:** Q044 — *"What about sales of DLC, sequels, or merchandise? How is any of that going to be taxed?"*

---

### C4 — Vesting & Exit Terms
**Question:** What happens if a contributor leaves before the project ships?

**Options:**
- Full share regardless of when they leave (no vesting)
- Pro-rated by time contributed (hours logged / total hours)
- Milestone vesting: contributor earns X% per defined milestone reached
- Cliff vesting: contributor earns 0% if they leave before [milestone]; 100% after

**Follow-up:** If a contributor leaves, can they take their contributed work with them?
- No — all contributions become project property
- Yes — they can use their own contributions in other projects
- Negotiated case-by-case

**Template field populated:** `vesting_type`, `ip_on_exit`  
**Pain addressed:** The walkaway problem — early exits claiming full share.  
**Evidence:** Q036 — *"If one of you walks away after one month and gets their full share, while others keep working — this person gets the fruits of all your effort."*

---

### C5 — IP Ownership
**Question:** Who owns the intellectual property of the finished project?

**Options:**
- Joint ownership (all contributors own proportionally to their split)
- One contributor owns the IP; others receive revenue share only
- Newly formed entity (LLC / partnership) owns it
- To be decided — placeholder terms only *(banner: recommend legal advice before publishing)*

**Template field populated:** `ip_ownership_structure`  
**Pain addressed:** IP ownership gap that lets contributors block publication if they retain rights.  
**Evidence:** Q026–Q027 (legalmoveslawfirm.com) — *"If you write code or create art without a written IP assignment, you may legally retain ownership."* … *"A dispute over IP rights can kill a project."*

---

### C6 — Jurisdiction *(shared — same as A6)*

**Total questions: 6**

---

## Cross-Wizard Shared Elements

| Element | Detail |
|---------|--------|
| **Document ID** | Auto-generated on export: `LC-{YYYY}-{HHEX4}` (e.g., LC-2026-A3F9) |
| **Version metadata** | Template version, jurisdiction, export timestamp embedded in PDF footer |
| **Disclaimer** | Shown on every wizard screen and in PDF header: *"This document was generated from a template. It is not legal advice and does not create an attorney-client relationship. For jurisdiction-specific advice, consult a licensed attorney."* |
| **Badge** | SVG embed code provided after export: `<img src="https://licensecomposer.app/badge/LC-2026-A3F9.svg">` |
| **Email delivery** | Optional: enter client email → they receive a link to acknowledge the document (timestamp logged) |

---

## Question Count Summary

| Wizard | Questions | Estimated completion time |
|--------|-----------|--------------------------|
| A: Commissioned Work Agreement | 7 | ~90 seconds |
| B: Commercial Asset License | 6 (+ 1 optional) | ~75 seconds |
| C: Collaborator Split Agreement | 6 | ~90 seconds |
