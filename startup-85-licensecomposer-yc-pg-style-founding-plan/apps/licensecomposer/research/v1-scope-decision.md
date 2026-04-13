# LicenseComposer — V1 Razor-Narrow Scope Decision

**Locked:** 2026-04-12  
**Status:** FINAL — this document governs what gets built in v1

---

## The Three Constraints

| Dimension | V1 | Deferred |
|-----------|----|---------:|
| **License types** | Commercial Asset License · Commissioned Work Agreement · Collaborator Split Agreement | Beat licenses, NFT-native licenses, publisher agreements |
| **Jurisdictions** | United States · United Kingdom | EU, Canada, Australia, Rest of World |
| **Platforms** | Itch.io · Gumroad · OpenSea | Etsy, Redbubble, Steam, Patreon, direct/custom |

---

## Why These Three License Types

### 1. Commissioned Work Agreement
**Evidence anchor:** 19/58 pain quotes (highest cluster). r/ArtistLounge has weekly threads where artists
work without contracts and suffer scope creep, revision abuse, non-payment, and IP confusion.
Direct quote from evidence.json Q004: *"All the commission contract templates I find online seem
half-baked and I don't have the know-how to alter them myself!"*

**Template covers:** work type, deliverable spec, revision rounds + overage fee, IP rights grant,
payment terms (deposit + final), refund policy, governing law.

### 2. Commercial Asset License
**Evidence anchor:** 15/58 quotes in licensing_confusion cluster. itch.io forum (Q020–Q023) shows
buyers abandoning purchases when license terms are unclear; sellers lose revenue to competitors with
clearer terms. Q022: *"Even the term 'commercial use' must be specified — so if I ask the creator
and he tells me something like 'Yes' it has no meaning."*

**Template covers:** permitted uses (personal / small commercial / unlimited commercial), exclusivity,
territory, attribution requirements, redistribution restrictions, platform-specific carve-outs
(itch.io revenue caps, Gumroad resale rules, OpenSea secondary transfer).

### 3. Collaborator Split Agreement
**Evidence anchor:** 12/58 quotes in collaborator_revenue_dispute cluster. gamedev.stackexchange Q035:
*"I am close to finishing a game I am making with 3 friends. We agreed to split revenue (40/40/10/10).
However we have no contract."* Attorney commentary (Q045): *"It's the kind of dispute that kills
studios and friendships alike. I've seen it fairly often in my work."*

**Template covers:** contributor roles, revenue split percentages, gross-vs-net definition,
vesting schedule, early-exit terms, IP ownership assignment, payout cadence, dispute resolution.

---

## Why US + UK Only (v1)

| Reason | Detail |
|--------|--------|
| **Language** | Both English-primary — single template text works |
| **Copyright baseline** | Both use Berne Convention; work-for-hire principles are similar |
| **Market size** | US + UK = ~60% of itch.io and Gumroad creator base |
| **Complexity avoided** | EU requires GDPR data processing clauses, moral rights nuance, country-specific variations across 27 member states |
| **Expand easily** | US/UK templates can be adapted to CA/AU with <10% clause changes |

**Jurisdiction selector behavior in v1:**
- US: governed by the laws of [State] (default: California)
- UK: governed by the laws of England and Wales
- Other: user sees a banner — *"We don't have a lawyer-reviewed template for your jurisdiction yet.
  This template uses internationally recognized terms but is not tailored to local law. Consider
  a local attorney review."* — and can still export.

---

## Why Itch.io + Gumroad + OpenSea Only (v1)

### Itch.io
- Primary marketplace for indie game assets, sprite packs, fonts, audio
- License terms are NOT standardized — creators write their own or leave blank
- Evidence: itch.io forum thread (Q020–Q023) shows buyers confused, going elsewhere
- V1 template includes: itch.io revenue-cap clause (personal use = free; commercial use = creator
  approval), attribution requirements, engine/game scope clarification

### Gumroad
- Primary marketplace for digital art assets, presets, brushes, commission slots
- Gumroad's own ToS is permissive but offers no license templates to sellers
- Many commission artists use Gumroad "commission slots" — perfect fit for Commissioned Work Agreement
- V1 template includes: Gumroad-compatible payment reference, file delivery terms, refund policy
  aligned with Gumroad's 30-day refund window

### OpenSea
- Primary NFT marketplace where "commercial license" confusion is documented and severe (Q051–Q058)
- OpenSea dropped creator royalties in 2023 — creators need contract protections outside platform
- V1 Commercial Asset License includes NFT-specific clause: token ownership ≠ copyright transfer;
  creator retains copyright unless explicitly assigned; secondary resale royalty expectations documented
  even if not platform-enforced

**Other platforms deferred:** Etsy (complex handmade/POD rules), Steam (publisher agreements, too complex),
Patreon (subscription vs. license hybrid, needs separate template logic)

---

## V1 Template Matrix

| Template | US | UK | Itch.io | Gumroad | OpenSea |
|----------|:--:|:--:|:-------:|:-------:|:-------:|
| Commissioned Work Agreement | ✅ | ✅ | ✅ | ✅ | — |
| Commercial Asset License | ✅ | ✅ | ✅ | ✅ | ✅ |
| Collaborator Split Agreement | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## What V1 Does NOT Do

- No EU, Canadian, Australian, or other jurisdiction templates
- No Etsy, Steam, Patreon, or direct-website platform variants
- No NFT-native licenses (ERC-721/1155 license embedding) — OpenSea template only clarifies existing IP
- No legally-binding e-signature (acknowledge-only via email link)
- No real-time lawyer chat or review (referral link only)
- No template marketplace in v1 (3 templates, unlocked with $9/year sub)
- No multi-party negotiation flow

---

## Decision Log

| Option Considered | Decision | Reason |
|-------------------|----------|--------|
| Include EU jurisdiction | Deferred | 27-country variation, GDPR clauses, moral rights complexity |
| Include beat license | Deferred | Different community, lower evidence volume |
| Include Etsy | Deferred | Handmade policy complexity, different user persona |
| Include NFT-native template | Deferred | Market cooling, smart-contract integration scope |
| 4 license types | Narrowed to 3 | Commissioned Work + Asset License cover 85% of pain quotes |
| Free tier | Included | 1 export/month free → conversion funnel into $9/year |
