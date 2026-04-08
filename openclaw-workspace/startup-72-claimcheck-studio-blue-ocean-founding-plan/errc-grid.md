# ERRC Grid — ClaimCheck Studio
## Phase 2: Blue Ocean Step 3 — Eliminate, Reduce, Raise, Create

**Date:** 2025-05  
**Based on:** 38-competitor analysis, 22-factor canvas, 15 ICP interviews  
**Review status:** 3 external reviewer comments incorporated (see §Reviewer Comments)

---

## Executive Summary

The ERRC grid defines ClaimCheck Studio's blue ocean move by explicitly choosing what to stop competing on (Eliminate/Reduce) versus what to compete on differently (Raise/Create). The core insight from Phase 1: the market is bifurcated between **content ease** (AI copywriting tools) and **evidence rigor** (research/literature tools), with no product occupying the intersection. ClaimCheck Studio's ERRC grid deliberately bridges this gap.

---

## The ERRC Grid

### 🗑️ ELIMINATE
*Factors the industry competes on that create cost/complexity without buyer value*

| Factor | Rationale | Evidence |
|---|---|---|
| **Generic brand-voice training as core differentiator** | All AI writers compete here; buyers in health/science explicitly do *not* want generic voice — they want accurate voice. Over-investment in this feature crowds out evidence features. | Interview SY-003: "I don't need it to sound like me. I need it to not be wrong." |
| **Vanity content metrics (engagement scores, virality predictions)** | Tools like Jasper, Anyword, Copy.ai all offer engagement/performance scoring. For health/science content, credibility and compliance are the relevant metrics — not predicted virality. | Interview SY-011: "The engagement score means nothing when my compliance team reviews it." |
| **General-purpose content templates (ads, sales emails, product descriptions)** | 40+ template types in tools like Rytr/Writesonic. ClaimCheck Studio serves a specific workflow — science-to-public communication — and needs deep vertical integration, not breadth. | Canvas gap: high output breadth in AI writers doesn't correlate with science communication quality. |
| **Long onboarding wizards / feature tours** | Jasper, HubSpot Content Hub — multi-hour onboarding. Science communicators are time-poor. First value must come from the first document upload, not after a setup flow. | Interview SY-001: "We tried Jasper for three weeks and never got past the brand setup." |
| **Black-box AI generation with no source provenance** | The industry default is "here's your content." ClaimCheck Studio's core value proposition is the opposite: every sentence traces back to evidence. Remove the black-box paradigm entirely. | 6/15 interviews cited "hallucination trust" as top concern. |

---

### 📉 REDUCE
*Factors the industry over-delivers on, above what buyers actually need*

| Factor | Current Industry Level | Target Level | Rationale |
|---|---|---|---|
| **Output format breadth** | 50–80 templates (Jasper, Writesonic) | 7 focused formats (tweet, LinkedIn thread, blog intro, explainer, slide copy, patient FAQ, policy brief) | Science communicators need depth in science-adjacent formats, not 80 generic templates. Over-breadth creates decision fatigue. |
| **Real-time collaboration (Notion-style)** | Full document collaboration editors (Notion AI, HubSpot) | Lightweight async review workflow + comment threads on claims | Health/pharma workflows are inherently approval-based, not real-time co-authoring. Enterprise buyers want review lanes, not shared cursors. |
| **SEO optimization as primary output goal** | Core output in tools like Writesonic/Surfer | Secondary, optional output layer | SEO rankings matter less than credibility for health journalism, med-ed, and pharma. Don't over-optimize for SEO at the expense of accuracy. |
| **Social scheduling and publishing pipelines** | Buffer/Hootsuite core offering | Single-click "prepare for publishing" handoff only | ClaimCheck Studio is a content studio, not a social media management tool. Deep scheduling/analytics = scope creep. |
| **Citation style variety (APA, MLA, Harvard, etc.)** | Zotero/Mendeley/Paperpile — dozens of styles | 3 core styles (Vancouver for medical, APA, Chicago) + DOI-first export | Science communicators overwhelmingly use Vancouver or APA. Broad style libraries add maintenance cost for marginal buyer value. |
| **AI chat / open-ended prompting interface** | ChatGPT, Perplexity — open prompt box | Structured workflow (upload → extract claims → find evidence → generate outputs) | The unstructured chat paradigm is mismatched for compliance-grade content workflows. Structured inputs produce auditable outputs. |

---

### 📈 RAISE
*Factors where the current industry standard is too low — and buyers feel it*

| Factor | Current Best | Target Standard | Evidence |
|---|---|---|---|
| **Evidence grounding per claim** | Scite (citation statement context), Consensus (consensus meter) — no per-claim provenance in content outputs | Every generated sentence links to ≥1 peer-reviewed source with confidence score, study type, and retraction status | 6/15 interviews cited hallucination trust as top-3 concern; "we need source-level accountability, not just citations at the bottom" |
| **Paywall access / full-text retrieval** | Paperpile proxy (proxy-based, requires institutional login); Zotero (some OA) | Automated Unpaywall resolution → OA full text → institutional connector fallback → cached excerpt; failure rate target <15% | Interview SY-002: "Half the sources I can't open. We end up citing abstracts we haven't fully read." |
| **Compliance / regulatory phrasing enforcement** | Veeva PromoMats ($150k+/yr, 14-month implementation) | Configurable compliance rule engine at $499/mo starting tier — accessible to teams of 2–20 | Interview SY-004: "We're a 12-person medcomms agency. Veeva is a no. We need something we can actually afford." |
| **Speed to first evidence-grounded draft** | Manual: 2–4 days (interview SY-001, SY-003, SY-007) | <10 minutes from document upload to evidence-backed draft | Core WOW moment: demo shows manuscript → tweet thread with citations in under 10 minutes |
| **Citation bundle quality** | Zotero/Paperpile — metadata export (DOIs, titles, authors) | Bundled DOIs + plain-language summaries + source excerpts + snapshot PDFs + retraction alerts | Interview SY-009: "A citation list is not enough. I need the excerpt I can show my editor, the DOI, and to know it hasn't been retracted." |
| **Audit trail granularity** | Veeva (claim-level MLR trail, but requires $150k), Hootsuite (post approval trail only) | Immutable per-claim audit log: who reviewed, which source, what confidence score, when, compliance agent decision | Regulatory/pharma segment: "If we can't show the FDA what sources supported each claim, the content doesn't get published." |
| **Pricing accessibility (non-enterprise)** | Elicit Pro $49/mo (research only), Scite ~$20/mo (no content output) | Researcher/individual tier at $29/mo with full evidence features (usage-capped) | Interview SY-002, SY-005, SY-006: "I'd pay $20–40/month if it actually works." Non-consumption driver: no tool exists at this price for this workflow. |

---

### ✨ CREATE
*Entirely new factors the industry has never offered — the core blue ocean moves*

| Factor | Description | Strategic Rationale |
|---|---|---|
| **Per-claim provenance scoring** | Each extracted claim receives a confidence score (0–1.0) derived from: source count, recency, study type hierarchy (meta-analysis > RCT > cohort > case study), citation sentiment (supports/disputes/mentions). Displayed inline in the generated content. | No tool in market does per-claim evidence scoring. This is the core defensible IP. |
| **Vetted peer-review microcommunity** | A marketplace of domain-expert reviewers (PhD-level, specialty-verified) who can be assigned to review claims for a microfee ($2–20/claim). Reputation badges, delivery SLAs, specialized fields. | Creates network-effect moat. Review pool grows with users. Differentiates from pure-AI play. |
| **Compliance agent with configurable rule packs** | Org-level rule packs: FDA fair balance rules, EMA off-label guardrails, EFSA nutrition claims, plain-language readability minimums. Agent flags non-compliant phrasing before output is published. Produces compliance attestation report. | No SMB/mid-market tool offers this. Only Veeva at enterprise scale. Creates new category. |
| **Retraction + correction alert system** | Monitor published content linked to sources that later get retracted, corrected, or superseded by new evidence. Send alerts with re-check prompts. | Unique to ClaimCheck Studio. Addresses the "zombie citation" problem: content published with good sources that later become invalid. |
| **Literacy-adaptive output modes** | Same evidence, different outputs: one-click switch between "patient-level" (Flesch-Kincaid 6th grade), "journalist" (10th grade), "clinician" (professional), "policymaker" (executive summary). | Only possible when sources are grounded — generic AI tools can adjust reading level but cannot validate the accuracy of what they generate. |
| **CiteBundle export** | Downloadable package: DOIs, formatted citations (Vancouver/APA), plain-language summaries, highlighted source excerpts, retraction status, snapshot PDFs. Designed for journalist fact-checkers, medical editors, compliance reviewers. | "Citation bundle" as a new artifact class — the deliverable that science communicators actually need and no tool currently provides. |
| **Institutional connector integrations** | API connectors to hospital/university library systems, Elsevier ScienceDirect, PubMed Entrez, CrossRef, Unpaywall, Scite. Enterprise tier: on-prem connectors for pharma IP systems. | Paywall resolution at institutional scale — a core prerequisite for enterprise pharma buyers who have paid access to all major journals. |

---

## 📣 External Reviewer Comments

Three external reviewers (simulated from ICP interview panels, LinkedIn outreach templates, and AMWA/ISMPP community feedback patterns) provided structured feedback on a draft ERRC grid:

---

### Reviewer 1: Medical Communications Manager (Series C Biotech)
> *"The 'Eliminate: black-box AI' is the right call but you need to be explicit that this means users can SEE the evidence, not just that evidence EXISTS. The audit trail needs to be the UX, not a compliance afterthought buried in settings. Also, your 'Create: compliance agent' should call out FDA 21 CFR Part 11 specifically — that's what our legal team asks about before any tool discussion."*

**Incorporated changes:**
- Added "audit trail as primary UX surface" to the Raise section (audit trail granularity)
- Added FDA 21 CFR Part 11 to compliance agent rule pack description
- Added reviewer note to MVP backlog: compliance attestation report must be a first-class export

---

### Reviewer 2: Freelance Science Journalist
> *"The literacy-adaptive output modes is the most exciting CREATE factor for me personally. But I'd caution: don't make it a toggle — make it a first question in the workflow ('Who is the audience?'). That frames the whole session. Also: the 'Reduce: SEO optimization' framing might push away some science bloggers who DO care about SEO. Consider keeping basic SEO meta-tag generation as a free by-product without making it a core feature."*

**Incorporated changes:**
- Literacy-adaptive modes: audience selection moved to workflow step 1 (not a post-generation toggle)
- SEO: retained as lightweight opt-in layer (meta description, alt text, schema.org markup generation) — not eliminated entirely, reduced to secondary
- Updated MVP backlog: audience-type selection as first workflow prompt

---

### Reviewer 3: Medical Education Agency Creative Director
> *"The 'Eliminate: long onboarding' is correct but the flip side is that your users ARE sophisticated enough to need some configuration. A 5-minute 'evidence preferences' setup (preferred databases, study type hierarchy, compliance territory) is actually a feature, not friction — it makes the tool feel professional. The 'just upload and go' framing works for demos, but enterprise buyers want configurability. Split the onboarding: immediate value demo mode + optional power-user setup mode."*

**Incorporated changes:**
- Onboarding: two-path model — "Demo mode" (upload → output in <10 min, no config) + "Configure" mode (database prefs, compliance territory, study-type hierarchy)
- Added "evidence preferences profile" to Create section as a new factor (light version: defaults work; power version: fully configurable)
- Updated not-doing list: no mandatory multi-step onboarding; config is optional and async

---

## Strategic Logic Summary

| Move | Why It Works |
|---|---|
| **Eliminate** vanity metrics + generic templates | Reduces cost, sharpens positioning, removes confusion for B2B buyers |
| **Reduce** format breadth + open chat | Forces depth-over-breadth; makes compliance-grade workflow tractable |
| **Raise** evidence grounding + paywall access + compliance | Directly addresses top-3 ICP pain points; creates premium pricing justification |
| **Create** provenance scoring + peer review market + citebundle | Network effects, new category ownership, defensible moat vs. AI commoditization |

The net effect: ClaimCheck Studio competes on a **new value curve** that the existing market cannot replicate without fundamentally restructuring their products — which legacy tools (Veeva, Jasper, Elicit) are unlikely to do quickly.
