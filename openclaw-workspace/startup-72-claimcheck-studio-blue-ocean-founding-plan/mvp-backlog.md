# MVP Backlog — ClaimCheck Studio
## Phase 2: Locked MVP Scope (≤8 Core Stories)

**Date:** 2025-05  
**Sign-off status:** Locked for Phase 3 development  
**Reviewer sign-offs:** 3 external reviewers confirmed scope (see ERRC grid §Reviewer Comments)  
**Target:** Paying beta customers within 6 months of this document

---

## MVP Philosophy

The MVP must demonstrate the **core blue ocean move** in a single workflow:

> Upload a document → Extract claims → Find peer-reviewed evidence → Generate channel-ready output with per-claim citations → Export CiteBundle

Everything else is Phase 2+. The MVP does NOT need to be the full product. It needs to be the *moment of truth* that converts a skeptic into a paying customer.

**Success metric:** A user who has never heard of ClaimCheck Studio uploads a real manuscript and says *"I need this"* within 10 minutes.

---

## The 8 Core User Stories (MVP Scope — LOCKED)

### Story 1: Document Upload + Claim Extraction
**As a** science communicator,  
**I want to** upload a manuscript, slide deck, or transcript (PDF, DOCX, TXT, PPTX),  
**so that** ClaimCheck Studio automatically identifies and lists the discrete factual claims in my document.

**Acceptance criteria:**
- Supports PDF, DOCX, TXT, PPTX (max 50MB)
- Extracts ≥80% of factual claims from a test document (evaluated against human-labeled gold set)
- Claims displayed as editable list; user can add/remove/edit claims before proceeding
- Claim extraction completes in <60 seconds for a 10,000-word document
- Audience selection prompt shown before/after extraction ("Who will read this output?")

**Out of scope for MVP:** Real-time extraction preview; streaming; multi-document sessions

---

### Story 2: Evidence Search + Source Retrieval
**As a** science communicator,  
**I want** ClaimCheck Studio to automatically search PubMed, CrossRef, Scite, and Unpaywall for peer-reviewed sources that support or challenge each extracted claim,  
**so that** I have a grounded evidence base without manual searching.

**Acceptance criteria:**
- Searches PubMed (via Entrez API), CrossRef, Scite, and Unpaywall for each claim
- Returns ≥3 candidate sources per claim (when available)
- Each source includes: title, authors, year, journal, DOI, study type, abstract snippet
- Unpaywall resolution attempted for all sources; OA full-text retrieved when available
- Source retrieval completes in <90 seconds per claim (async, displayed as results arrive)
- Handles "no sources found" gracefully with clear UI messaging

**Out of scope for MVP:** Institutional library connectors; Elsevier ScienceDirect integration; on-prem connectors

---

### Story 3: Per-Claim Confidence Scoring
**As a** science communicator,  
**I want** each claim to receive a provenance confidence score,  
**so that** I can quickly identify which claims are well-supported, which are uncertain, and which need additional review.

**Acceptance criteria:**
- Each claim receives a confidence score from 0.0–1.0
- Score derived from: number of sources found, source recency (<5yr bonus), study type hierarchy (meta-analysis=1.0x, RCT=0.8x, cohort=0.6x, case study=0.4x, review=0.7x), citation sentiment from Scite (supports/disputes/mentions weighted)
- Visual indicator: 🟢 High (0.8–1.0), 🟡 Moderate (0.5–0.79), 🔴 Low (<0.5), ⚫ No evidence
- Retraction check via Retraction Watch API; retracted sources flagged with ⚠️
- Score explanation available on hover/expand

**Out of scope for MVP:** Machine-learning-based confidence model; custom weighting by organization; real-time score updates as new evidence publishes

---

### Story 4: Audience-Adapted Content Generation
**As a** science communicator,  
**I want** ClaimCheck Studio to generate channel-ready content from the evidence-grounded claims,  
**so that** I have draft outputs ready for my target audience and channel without starting from scratch.

**Acceptance criteria:**
- 7 output formats available: Twitter/X thread, LinkedIn post/thread, explainer blog section (500w), slide copy (headline + 3 bullets), patient FAQ, policy brief excerpt, press release paragraph
- Audience level selection (set in Story 1 or adjustable here): Patient (6th grade), Journalist (10th grade), Clinician (professional), Policymaker (exec summary)
- Each generated sentence or paragraph is linked to the claim(s) and source(s) it draws from
- Outputs clearly marked when a claim has Low or No Evidence confidence score
- Generation completes in <30 seconds per format

**Out of scope for MVP:** Social scheduling/publishing; brand voice training on org corpus; custom output templates; CMS direct push

---

### Story 5: CiteBundle Export
**As a** science communicator,  
**I want** to download a CiteBundle package for each piece of content,  
**so that** I can share source documentation with editors, fact-checkers, compliance reviewers, or institutional review boards.

**Acceptance criteria:**
- CiteBundle is a downloadable ZIP containing:
  - `citations.csv` — DOI, title, authors, year, journal, URL, access status, retraction status
  - `citations.bib` — BibTeX format
  - `citations_vancouver.docx` — Vancouver-formatted reference list
  - `source_excerpts.md` — Highlighted relevant excerpts per claim (from OA full text or abstract)
  - `confidence_report.pdf` — Per-claim confidence scores, evidence summary, sources used
- Bundle generation completes in <60 seconds
- Download available for 72 hours after session creation

**Out of scope for MVP:** APA/MLA/Chicago formats (Phase 2); snapshot PDFs of full papers (legal/IP); custom bundle templates

---

### Story 6: Compliance Flag Layer (Configurable)
**As a** medical communications professional or pharma content reviewer,  
**I want** a configurable compliance layer that flags potentially non-compliant phrasing before I publish,  
**so that** I reduce MLR review time and avoid regulatory risk.

**Acceptance criteria:**
- Compliance territories available at MVP: FDA (US, general pharma), EMA (EU, general), General health claims (EFSA/FTC)
- Rule packs include: absolute claim detection ("cures," "eliminates," "proven to"), fair balance trigger words, off-label indicator phrases, superlative language flags
- Flags shown inline in generated content with explanation and suggested alternatives
- Compliance attestation report (PDF) exportable: lists all flagged items, user decisions (accepted/overridden), reviewer identity, timestamp
- Audit trail of compliance decisions stored in DB per session
- Rule packs configurable per organization (org admin UI); default = General health claims

**Out of scope for MVP:** FDA 21 CFR Part 11 digital signature compliance; custom rule pack builder (Phase 2); HIPAA compliance tier

---

### Story 7: Session Audit Trail
**As a** team lead, compliance officer, or enterprise admin,  
**I want** a complete audit trail of every claim extraction, evidence search, score, and content generation decision,  
**so that** I can demonstrate due diligence to internal reviewers, editors, or regulatory bodies.

**Acceptance criteria:**
- Audit trail stored per session: user, timestamp, document name, claims extracted, sources retrieved per claim, confidence scores, content generated, compliance flags, compliance decisions, export events
- Audit trail viewable in-app (session history page)
- Exportable as PDF or JSON
- Immutable: audit trail entries cannot be deleted by users (admin-only purge with confirmation)
- Retention: 12 months by default; enterprise tier configurable

**Out of scope for MVP:** Real-time audit streaming; Splunk/SIEM integration; blockchain attestation

---

### Story 8: Account + Team Management (Minimal)
**As a** team admin,  
**I want** to invite team members, assign roles, and manage org-level settings,  
**so that** multiple people on my team can use ClaimCheck Studio with consistent evidence preferences and compliance settings.

**Acceptance criteria:**
- Auth: email + password, Google OAuth, SSO (SAML) for Enterprise tier only
- Roles: Admin (full org settings), Editor (create/edit sessions), Reviewer (view + comment + compliance decisions only)
- Org settings: compliance territory, preferred databases (PubMed/CrossRef/Scite enable/disable), study type hierarchy defaults, brand context (optional: org name + domain)
- Team invitation via email
- Usage dashboard: sessions, exports, claims processed this billing period
- Supabase Auth + Row-Level Security for data isolation between orgs

**Out of scope for MVP:** Slack/Teams integrations; HR provisioning (SCIM); multi-org management

---

## ❌ Not-Doing List (Explicitly Out of MVP)

These items are commonly requested or appear in competitor feature sets. They are **not in scope for MVP** and must be actively rejected when they come up in design/engineering discussions.

| Not Doing | Why | When (if ever) |
|---|---|---|
| Social media scheduling & publishing | Scope creep; we're a content studio, not a social tool | Phase 3+ (API handoff only in MVP) |
| AI chat / open-ended prompt interface | Mismatched with compliance-grade workflow; adds complexity | Evaluate post-MVP |
| Brand voice training on custom corpus | High compute cost, low priority for ICP | Phase 2 |
| Institutional library connector (Elsevier, etc.) | Requires enterprise partnership; not MVP-tractable | Enterprise tier, Phase 3 |
| Real-time collaboration editor | Async review workflow sufficient for MVP | Phase 2 |
| Blockchain/NFT audit attestation | Gimmick; enterprise buyers don't require it | Never (unless regulatory requirement) |
| 50+ output format templates | Breadth over depth; 7 focused formats for MVP | Selective expansion post-MVP |
| Video/podcast transcript claim-checking | Different input processing stack; separate workstream | Phase 3 |
| Automated social posting via Buffer/Hootsuite API | Out of core workflow | Phase 3 (optional integration) |
| Citation style variety >3 formats | Low-value maintenance overhead | Phase 2 (APA/Chicago on request) |
| Mobile native app | Web-first; mobile browser sufficient | Phase 3+ |
| Mandatory multi-step onboarding wizard | Reviewer feedback: kills time-to-value | Never; optional config only |
| On-prem deployment | Not relevant until enterprise tier with pharma | Phase 4 (if needed) |
| LLM provider lock-in | Use router (OpenAI + Claude + Gemini fallback) | Architecture decision, not feature |

---

## MVP Technical Architecture Notes

**Stack:** Next.js App Router + TypeScript, Supabase (auth + DB + storage), deployed on Vercel  
**LLM:** OpenAI GPT-4o for claim extraction + content generation; fallback to Claude 3.5 Sonnet  
**Evidence APIs:** PubMed Entrez (free), CrossRef REST API (free), Scite API (paid, ~$500/mo), Unpaywall (free)  
**Compliance rules:** Custom rule engine (JSON-configured); no third-party compliance API needed at MVP  
**Retraction check:** Retraction Watch API (open access)  
**Storage:** Supabase Storage for uploaded documents and exported CiteBundles  
**Background jobs:** Supabase Edge Functions or Vercel Cron for evidence search (async)  

**Estimated build time:** 3 developers × 8 weeks = ~480 dev-hours  
**Critical path:** Story 2 (evidence search) is the deepest technical work; must start Week 1

---

## Definition of Done (MVP)

The MVP is complete when:
1. All 8 stories pass acceptance criteria on ≥3 real user test documents
2. Latency targets met: claim extraction <60s, evidence search <90s/claim, generation <30s/format
3. CiteBundle export verified for correctness by a PhD-level test user
4. Compliance flag layer verified against 10 known FDA/EMA violation phrase examples
5. Audit trail verified as immutable (penetration test: user cannot delete entries via API)
6. ≥5 beta customers paying (Starter $29/mo or Professional $149/mo) before "MVP complete" declaration
7. Supabase RLS verified: org data isolation passes automated security test
