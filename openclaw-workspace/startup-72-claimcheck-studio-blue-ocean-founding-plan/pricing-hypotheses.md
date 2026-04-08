# Pricing & Segment Hypotheses — ClaimCheck Studio
## Phase 2: Market Sizing + Pricing Model Design

**Date:** 2025-05  
**Status:** Hypotheses for validation; prices to be A/B tested in beta

---

## Pricing Principles (from ERRC Grid)

1. **Accessible starting price** — eliminate non-consumption among solo researchers and journalists ($20–40/mo WTP confirmed in interviews)
2. **Usage-based growth** — base tier is feature-complete but usage-capped; teams naturally upgrade as volume grows
3. **Compliance as a tier differentiator** — compliance agent + audit trail locked to Professional+ to capture pharma/agency WTP ($500–10k/mo)
4. **Enterprise anchored to Veeva displacement** — position $2k–10k/mo as "Veeva lite" for mid-market pharma, not as a premium startup tool
5. **Per-claim microtask revenue** — peer review marketplace creates a separate, high-margin revenue stream on top of subscription

---

## Pricing Tiers

### Tier 1: Researcher — $29/month (or $290/year, 2 months free)
**Target:** Solo researchers, science journalists, health bloggers, PhD students, academic post-docs  
**WTP evidence:** SY-002 ($20–40/mo), SY-005 ($20–60/mo), SY-006 ($30–50/mo)

Includes:
- 20 document sessions/month (≤5,000 words each)
- All 7 output formats
- PubMed + CrossRef + Unpaywall evidence search
- Per-claim confidence scoring
- CiteBundle export (CSV + BibTeX + Vancouver)
- Audience-adaptive output (patient/journalist/clinician/policymaker)
- Audit trail (90-day retention)
- General health claims compliance flags (read-only)
- 1 user seat

Limits: 100 claims/month, no Scite integration, no team features, no custom compliance rules

---

### Tier 2: Professional — $149/month (or $1,490/year)
**Target:** Freelance medical writers, health startup content teams (2–5 people), science communication consultants, university comms departments  
**WTP evidence:** SY-001 ($100–300/mo), SY-005 ($150–400/mo), SY-010 ($99–499/mo)

All Researcher features, plus:
- 100 document sessions/month
- Unlimited claims per session
- Scite Smart Citations integration (citation sentiment: supports/disputes/mentions)
- FDA + EMA compliance flag rule packs
- Compliance attestation report export (PDF)
- Audit trail (12-month retention)
- Up to 5 team seats
- Evidence preferences profile (database weights, study type hierarchy)
- Priority evidence search queue
- CiteBundle: adds source excerpts + confidence report PDF

---

### Tier 3: Agency — $499/month (or $4,990/year)
**Target:** Medical communications agencies (5–50 staff), health-focused digital marketing agencies, med-ed content shops  
**WTP evidence:** SY-003 ($500–2,000/mo agency), SY-004 ($499–1,500/mo), SY-007 ($500–5,000/mo med-ed agency)  
**Displacement:** Partial Veeva PromoMats alternative for agencies that can't afford $150k

All Professional features, plus:
- Unlimited document sessions
- Up to 20 team seats
- Custom compliance rule packs (admin-configurable)
- SAML SSO (single sign-on)
- Peer review microtask marketplace access (assign claims to vetted reviewers)
- CiteBundle: adds snapshot PDFs
- Dedicated Slack support channel
- Retraction + correction alert monitoring (ongoing, for published content linked to sources)
- 12-month audit trail + admin purge controls
- White-label citation report (org logo on confidence report PDF)

---

### Tier 4: Enterprise — Starting $2,000/month (annual contract; custom pricing)
**Target:** Mid-size pharma/biotech (200–5,000 employees), medical device companies, health insurance content teams, large med-ed publishers  
**WTP evidence:** SY-008 ($1,000–15,000/mo), SY-011 ($2,000–8,000/mo), SY-013 ($10,000–50,000/mo pharma)  
**Displacement:** Veeva PromoMats for companies that have outgrown agency-tier but can't justify $150k+

All Agency features, plus:
- Unlimited seats
- Institutional library connector (hospital/university IP; custom integration)
- On-premise database option (customer-hosted PubMed mirror)
- FDA 21 CFR Part 11-ready audit trail (electronic records/electronic signatures)
- SLA: 99.9% uptime, 4-hour support response, dedicated CSM
- Custom LLM deployment option (models hosted in customer VPC)
- Enterprise security review (SOC 2 Type II report, pen test results, BAA for HIPAA)
- Quarterly evidence model updates + compliance rule pack maintenance
- API access (bulk processing, webhook integrations, CMS push connectors)

---

## Peer Review Microtask Marketplace (Add-on Revenue)

Independent revenue stream on top of subscription, available to Professional+ subscribers.

**How it works:**
1. User flags a claim for expert peer review ("I need a cardiologist to verify this")
2. System routes to verified reviewer in relevant specialty
3. Reviewer completes review (accept/reject/modify + notes) within SLA
4. User pays per-claim fee; reviewer earns percentage

**Pricing:**
- Standard review (general health/science): $5/claim (24h SLA)
- Specialty review (MD/PhD in field): $15/claim (48h SLA)  
- Urgent review: 2× base price, 6h SLA
- Reviewer take-rate: 70% of fee (ClaimCheck keeps 30%)

**Revenue model:** At 1,000 reviews/month × $10 avg = $10k/month GMV → $3k gross margin from marketplace alone  
**Strategic value:** Network effects — more reviewers → faster SLAs → more users → more reviews → more reviewer earnings → attracts more reviewers

---

## Segment Hypotheses

### Segment 1: Solo Science Communicator (Researcher tier)
**Size estimate:** ~500,000 globally (health/science journalists + freelance med writers + science bloggers + PhD communicators)  
**Conversion hypothesis:** 2% of addressable = 10,000 customers × $29/mo = $3.5M ARR  
**Acquisition:** SEO (science communication workflow), Product Hunt, AMWA/ISMPP communities, academic Twitter/X  
**Key risk:** High churn if evidence search results are poor quality; must nail PubMed/CrossRef retrieval on Day 1  
**Validation needed:** Does $29/mo clear their budget approval threshold? (Many solo freelancers self-approve <$50/mo)

### Segment 2: Health Startup / Digital Health Content Team (Professional tier)
**Size estimate:** ~50,000 health startups globally; ~15,000 with content teams of 2–5  
**Conversion hypothesis:** 3% of addressable = 450 companies × $149/mo = $800k ARR  
**Acquisition:** YC/Founder network, healthcare accelerators, Slack communities (Hana Health, HealthTech), LinkedIn  
**Key risk:** Procurement cycles even for $149/mo can be 4–8 weeks at VC-backed companies; founder champion must push through  
**Validation needed:** Is $149/mo below the "no approval needed" threshold for health startup content budgets?

### Segment 3: Medical Communications Agency (Agency tier)
**Size estimate:** ~3,000 medcomms agencies globally (AMWA, ISMPP registrations); ~800 mid-size (5–50 staff)  
**Conversion hypothesis:** 5% of mid-size = 40 agencies × $499/mo = $240k ARR  
**Acquisition:** AMWA conference (October), ISMPP Annual Meeting (June), direct outreach to AMWA member agencies  
**Key risk:** Agencies have existing tools (Word + PubMed + Endnote); switching cost is real; need to show 10× speed improvement  
**Validation needed:** Will agency principals sign a $499/mo contract after a 14-day pilot? Need ≥3 agency pilot customers by Month 4.

### Segment 4: Pharma / Biotech (Enterprise tier)
**Size estimate:** ~500 mid-size pharma/biotech companies ($100M–$5B revenue) that are Veeva-locked or Veeva-evaluating  
**Conversion hypothesis:** 1% of addressable = 5 companies × $3,000/mo = $180k ARR (Year 1)  
**Acquisition:** Conference BD (DPharm, EyeForPharma), LinkedIn enterprise outreach, referrals from Agency tier customers  
**Key risk:** Long sales cycle (6–12 months), requires security review, legal/compliance sign-off; may need SOC2 before first enterprise close  
**Validation needed:** Can we get a paid POC (proof of concept) at $500–1,000 for a 30-day pilot? Need ≥1 pharma POC by Month 6.

---

## Revenue Model Summary

| Tier | Target Customers (Yr 1) | MRR/Customer | Yr 1 MRR |
|---|---|---|---|
| Researcher | 500 | $29 | $14,500 |
| Professional | 150 | $149 | $22,350 |
| Agency | 30 | $499 | $14,970 |
| Enterprise | 3 | $3,000 | $9,000 |
| **Marketplace (GMV × 30%)** | — | — | ~$3,000 |
| **Total** | **683** | — | **~$63,820/mo** |

**Year 1 ARR target: $766k** (achievable; conservative)  
**Year 2 ARR target: $3.2M** (requires Agency + Enterprise segment penetration)  
**Break-even:** ~$35k MRR → 120 Professional equivalent customers

---

## Pricing Risks and Mitigations

| Risk | Description | Mitigation |
|---|---|---|
| **Price too high for researchers** | $29/mo may be too high vs. free PubMed + ChatGPT | Generous free trial (14 days, 3 sessions); freemium tier evaluation post-beta |
| **Agency tier underpriced** | $499/mo may be too cheap if agencies see $5k+/mo in time savings | A/B test $499 vs. $799 vs. $999 in first 90 days; use usage analytics to find natural ceiling |
| **Enterprise sales cycle too long** | 6–12 month sales cycle before first revenue | Charge for POC ($500–1k); use agency customers as references to accelerate pharma BD |
| **Marketplace cold start** | No reviewers on Day 1 | Manually recruit 20 vetted reviewers (LinkedIn + AMWA) before marketplace launch; subsidize first 100 reviews |
| **Scite API cost** | Scite API costs ~$500/mo base; at scale may be $5k+/mo | Include in Professional+ only; negotiate volume deal; evaluate in-house citation sentiment model at 1,000+ customers |

---

## Freemium Evaluation (Post-Beta)

A freemium tier is **not in MVP scope** but will be evaluated after:
- Beta data shows conversion rate from free trial to paid
- Operational cost per free user (evidence search API costs) is measured
- Competitive response from Consensus/Elicit is assessed

**Freemium hypothesis (to test):** 3 document sessions/month free, 10 claims/session, no compliance tools, no CiteBundle export → PLG funnel for researchers and students.

**Decision point:** Month 6 beta review. If free-to-paid conversion from 14-day trial is >15%, keep trial model. If <10%, consider freemium to increase top-of-funnel.
