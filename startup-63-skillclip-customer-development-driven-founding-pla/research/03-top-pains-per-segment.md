# SkillClip / CertClip — Top 3 Pains per Segment
**Phase 1: Customer Discovery A | Prioritized by Impact × Frequency**
Date: 2026-04-07

---

## Scoring Methodology
Each pain is scored on two axes (1–5 scale):
- **Impact:** Revenue lost, liability incurred, time wasted, project risk
- **Frequency:** How often this pain occurs (daily/weekly/monthly/quarterly)
- **Priority Score** = Impact × Frequency

---

## SEGMENT 1: TRADESPEOPLE

| Rank | Pain | Impact (1-5) | Freq (1-5) | Score | Evidence Basis |
|---|---|---|---|---|---|
| 🥇 #1 | **Credential portability across jurisdictions** — Relocating workers must re-prove credentials to new employers from scratch; paper certs are hard to present, easy to lose, and not trusted | 5 | 4 | **20** | Construction labor mobility rate ~15%/yr; IBEW workers routinely work across locals |
| 🥈 #2 | **Invisible skill differentiation** — Qualified workers lose jobs to less-skilled applicants because there's no way to show *quality* of work, only *existence* of a license | 4 | 5 | **20** | License ≠ skill; common complaint on trade forums (r/electricians, r/plumbing) |
| 🥉 #3 | **Slow hiring cycle kills income continuity** — Workers sit idle 1–3 weeks between jobs waiting for employer verification processes to complete | 4 | 4 | **16** | Especially acute for 1099 contractors; gig-to-gig income instability |

**Key workarounds today:** Carrying a binder of paper certs, word-of-mouth referrals, relying on union dispatchers, maintaining a LinkedIn with cert photos

---

## SEGMENT 2: EMPLOYERS / GENERAL CONTRACTORS

| Rank | Pain | Impact (1-5) | Freq (1-5) | Score | Evidence Basis |
|---|---|---|---|---|---|
| 🥇 #1 | **Code-compliance verification delay** — Before deploying a worker on a commercial or industrial job, employers must verify jurisdiction-specific licenses and code exposure; this takes 3–7 days and often requires calling agencies or the state board | 5 | 5 | **25** | AHJ inspections can fail entire projects; liability is severe; NEC amendments vary by locality |
| 🥈 #2 | **Skill-level fraud / mismatch** — Workers claim journeyman-level skills but perform at apprentice level; discovered only after day 1 on site, causing rework, delay, and reputational damage with clients | 5 | 4 | **20** | AGC surveys show 35%+ of contractors report quality issues with new hires |
| 🥉 #3 | **Slow time-to-deploy** — Finding, screening, and deploying a qualified tradesperson takes 2–4 weeks through traditional channels (Indeed, referrals, staffing agencies); this creates project bottlenecks | 4 | 5 | **20** | Construction project delays are endemic; labor is the most common bottleneck |

**Key workarounds today:** Reference checks by phone, requiring paper license copies, trialing workers on low-stakes tasks first, using known/trusted subcontractors

---

## SEGMENT 3: STAFFING AGENCIES

| Rank | Pain | Impact (1-5) | Freq (1-5) | Score | Evidence Basis |
|---|---|---|---|---|---|
| 🥇 #1 | **First-week send-backs (skill mismatch)** — Client sites return workers within the first 1–5 days because skill level doesn't match job requirements; agency absorbs placement cost and relationship damage | 5 | 4 | **20** | Industry norm: 10–25% first-week return rates for skilled trades |
| 🥈 #2 | **Certification audit risk** — Client contracts require proof of specific certs (OSHA 10/30, EPA 608, arc flash, etc.); agencies scramble to collect and store documentation; audit failures cost contracts | 5 | 3 | **15** | Construction clients increasingly require compliance audits; risk to staffing firm contracts |
| 🥉 #3 | **Recruiter bandwidth bottleneck** — Phone screening and manual credential verification requires 30–90 min per candidate; limits recruiter throughput and makes scaling placements expensive | 3 | 5 | **15** | Staffing firm margins are thin (15–25%); efficiency is critical to profitability |

**Key workarounds today:** Internal cert binders, manual photocopying, spreadsheet tracking, some use Hireology or Bullhorn with manual document upload

---

## SEGMENT 4: JOURNEYMAN MENTORS

| Rank | Pain | Impact (1-5) | Freq (1-5) | Score | Evidence Basis |
|---|---|---|---|---|---|
| 🥇 #1 | **Underutilized expertise** — Retired or semi-retired journeymen have deep knowledge but no structured way to monetize it in small increments; tutoring/consulting feels like too big a commitment | 3 | 5 | **15** | Gig economy comfort increasing among 45+ tradespeople |
| 🥈 #2 | **No platform for micro-mentoring** — Mentoring opportunities are all-or-nothing (apprenticeship programs, classroom instruction); no lightweight async option exists | 3 | 4 | **12** | Market gap; nothing like "Fiverr for trade mentorship" exists at scale |
| 🥉 #3 | **Payment & scheduling friction** — Informal mentoring is often unpaid or awkwardly paid; formal arrangements require IRS paperwork, invoicing, etc. that deters participation | 2 | 3 | **6** | Real barrier for occasional reviewers |

---

## CROSS-SEGMENT INSIGHT: The Verification Triangle

The three most critical pains converge on **one root cause: there is no portable, verifiable, trustworthy record of a tradesperson's demonstrated skill in specific tasks under specific code regimes.**

- Tradespeople need it to prove themselves
- Employers need it to trust who they're hiring
- Staffing firms need it to pre-screen at scale

This is the core job CertClip/SkillClip must do.

---

## Pain Prioritization for MVP Scope

**Must address in MVP:**
1. Employer code-compliance verification delay (H-06, H-09) → jurisdiction-tagged profiles
2. Skill-level fraud/mismatch (H-02, H-14) → video evidence + challenge prompts
3. Tradesperson credential portability (H-04) → shareable credential wallet

**Defer to v2:**
4. Staffing ATS integration (H-18) → API after core workflow validated
5. Per-task mentor review workflow (H-10) → after supply side validated
6. HVAC/EPA sub-vertical specifics (H-08) → post-launch expansion
