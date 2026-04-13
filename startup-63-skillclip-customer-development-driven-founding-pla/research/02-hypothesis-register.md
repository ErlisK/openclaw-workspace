# SkillClip / CertClip — Hypothesis Register
**Phase 1: Customer Discovery A**
Version: 1.0 | Date: 2026-04-07

---

## Hypothesis Format
Each hypothesis is tagged:
- **Segment:** who it applies to
- **Type:** Problem / Behavior / Willingness-to-Pay / Market
- **Confidence:** Low / Medium / High (pre-interview estimate)
- **Validation Method:** how to test it
- **Status:** Unvalidated / Confirmed / Invalidated / Pivoted

---

## HIRING FRICTION HYPOTHESES

### H-01
**Statement:** Employers and GCs spend 3–10 days per hire verifying trade credentials (calling references, requesting paper certs, waiting on background checks), and this delay directly costs them money in project delays.
**Segment:** Employers / GCs
**Type:** Problem
**Confidence:** High
**Validation Method:** Ask interviewee: "Walk me through the last time you hired a tradesperson — what took the longest?"
**Status:** Unvalidated

### H-02
**Statement:** At least 40% of employers have experienced a bad hire where a tradesperson misrepresented their skill level, resulting in rework, liability exposure, or termination within 30 days.
**Segment:** Employers
**Type:** Problem
**Confidence:** Medium
**Validation Method:** Direct survey question: "Have you ever had to terminate or remove a worker within 30 days due to skill mismatch?"
**Status:** Unvalidated

### H-03
**Statement:** Staffing agencies lose 15–30% of placed workers to client "send-backs" within the first week due to skill/certification mismatch.
**Segment:** Staffing Agencies
**Type:** Problem
**Confidence:** Medium
**Validation Method:** Ask recruiters about "return rate" or "first-week terminations"
**Status:** Unvalidated

### H-04
**Statement:** Tradespeople who relocate across state lines face 2–6 weeks of delay getting their credentials accepted by new employers, often having to redo paperwork they already completed.
**Segment:** Tradespeople (relocated)
**Type:** Problem
**Confidence:** High
**Validation Method:** Ask: "Have you ever moved states and had to re-prove your credentials? What happened?"
**Status:** Unvalidated

### H-05
**Statement:** The current hiring process for tradespeople relies primarily on word-of-mouth and reference calls, which are slow, biased, and unscalable for larger contractors.
**Segment:** Employers / Staffing
**Type:** Problem
**Confidence:** High
**Validation Method:** Ask: "How do you currently verify a new hire's skill level before their first day?"
**Status:** Unvalidated

---

## CODE-COMPLIANCE VERIFICATION HYPOTHESES

### H-06
**Statement:** Jurisdiction-specific code compliance (NEC vs. local amendments, CEC, Title 24, etc.) is a top-3 concern for commercial and industrial employers when hiring electricians and HVAC techs.
**Segment:** Employers (commercial/industrial)
**Type:** Problem
**Confidence:** High
**Validation Method:** Ask: "Has a worker ever failed an inspection because they applied the wrong code version? What happened?"
**Status:** Unvalidated

### H-07
**Statement:** In states with strict local code amendments (CA, NY, IL), contractors are willing to pay a premium for pre-verified, code-aware workers who can document compliance experience.
**Segment:** Employers (CA, NY, IL)
**Type:** Willingness-to-Pay
**Confidence:** Medium
**Validation Method:** Ask: "If you could get a verified electrician who has documented Title 24 experience, how much more per hour would that be worth? Per placement fee?"
**Status:** Unvalidated

### H-08
**Statement:** HVAC and mechanical contractors are particularly affected by refrigerant certification and EPA 608 compliance tracking across jurisdictions.
**Segment:** HVAC Contractors
**Type:** Problem
**Confidence:** Medium
**Validation Method:** Ask about EPA cert verification, refrigerant handling checks
**Status:** Unvalidated

### H-09
**Statement:** Current solutions (paper card binders, PDFs emailed, LinkedIn cert listings) are insufficient for real-time, auditable code-compliance proof — especially for client audits.
**Segment:** Employers / Staffing
**Type:** Problem (current solution inadequacy)
**Confidence:** High
**Validation Method:** Ask: "How do you store and present worker certifications to your clients? How often does this come up in audits?"
**Status:** Unvalidated

---

## MENTOR INCENTIVE HYPOTHESES

### H-10
**Statement:** Retired journeymen and master tradespeople would review skill videos for $15–$40/review if the process takes under 30 minutes and the platform handles scheduling/payment.
**Segment:** Journeyman Mentors
**Type:** Willingness-to-Pay / Behavior
**Confidence:** Medium
**Validation Method:** Test with mock pricing: "Would you review 3 videos per week at $25 each? What would make that worth it?"
**Status:** Unvalidated

### H-11
**Statement:** Union-affiliated journeymen mentors are more credible to employers than non-union mentors, and employers will pay more for union-reviewed credentials.
**Segment:** Employers + Mentors
**Type:** Market
**Confidence:** Medium
**Validation Method:** Ask employers: "Would a review from a union-certified journeyman carry more weight than a generic 'verified' badge?"
**Status:** Unvalidated

### H-12
**Statement:** Active journeymen will mentor during evenings/weekends for supplemental income, and do NOT want a full-time commitment.
**Segment:** Mentors (active)
**Type:** Behavior
**Confidence:** High
**Validation Method:** Ask: "If you could do 2–3 video reviews per week in your own time for $25 each, would that interest you?"
**Status:** Unvalidated

### H-13
**Statement:** The biggest friction for mentor participation is trusting the platform to pay reliably and not waste their time with low-quality submissions.
**Segment:** Mentors
**Type:** Problem
**Confidence:** Medium
**Validation Method:** Ask about hesitations around freelance reviewing / existing mentoring experiences
**Status:** Unvalidated

---

## FRAUD VECTOR HYPOTHESES

### H-14
**Statement:** Fake or expired certification cards are a known, regular occurrence — 1 in 5 employers has directly encountered a fraudulent credential.
**Segment:** Employers / Staffing
**Type:** Problem
**Confidence:** Medium
**Validation Method:** Ask: "Have you ever found out a worker had a fake or expired certification? How did you find out?"
**Status:** Unvalidated

### H-15
**Statement:** Video-based verification is significantly harder to fake than paper credentials, and employers will trust video evidence more once they understand the challenge-prompt mechanism.
**Segment:** Employers
**Type:** Market / Behavior
**Confidence:** Medium
**Validation Method:** Explain randomized challenge prompts in interview, ask: "Would this give you more confidence than a scanned certificate?"
**Status:** Unvalidated

### H-16
**Statement:** The highest fraud risk is in the 1099/day-labor market, not in union or W-2 employment — making independent contractors the primary fraud-risk segment to address.
**Segment:** Platform / Employers
**Type:** Market
**Confidence:** Medium
**Validation Method:** Ask employers where they source workers who most often have credential issues
**Status:** Unvalidated

---

## WILLINGNESS-TO-PAY HYPOTHESES

### H-17
**Statement:** Employers and GCs will pay $199–$499/month for unlimited portfolio searches + 5 included assessments if it replaces at least one bad hire per quarter.
**Segment:** Employers (SMB GC, 10–100 employees)
**Type:** Willingness-to-Pay
**Confidence:** Low-Medium
**Validation Method:** Price anchoring in interviews: "A bad hire costs you roughly $X in rework. If this prevented one per quarter, what's that worth monthly?"
**Status:** Unvalidated

### H-18
**Statement:** Staffing agencies will pay $1,000–$3,000/month for team access + ATS integration if it reduces first-week return rate by even 10%.
**Segment:** Staffing Agencies
**Type:** Willingness-to-Pay
**Confidence:** Low
**Validation Method:** ROI calculation exercise with recruiter: model cost of returns vs. subscription
**Status:** Unvalidated

### H-19
**Statement:** Tradespeople will pay $0 (freemium) to upload initial portfolio but will pay $9–$29/month for premium features (priority visibility, credential wallet, mobile app).
**Segment:** Tradespeople
**Type:** Willingness-to-Pay
**Confidence:** Medium
**Validation Method:** Ask: "If this made you 20% more likely to get hired faster, would you pay $15/month for it?"
**Status:** Unvalidated

### H-20
**Statement:** One-time per-assessment fees of $49–$99 are acceptable for tradespeople commissioning a live mentor review for a specific job application.
**Segment:** Tradespeople / Employers
**Type:** Willingness-to-Pay
**Confidence:** Low
**Validation Method:** Prototype price test on landing page (A/B price anchoring)
**Status:** Unvalidated

---

## HYPOTHESIS PRIORITY MATRIX

| Priority | Hypothesis | Reason |
|---|---|---|
| 🔴 Critical | H-01 Hiring delay | Core problem; must be true for product to have PMF |
| 🔴 Critical | H-06 Code compliance pain | Differentiator; must validate before building compliance features |
| 🔴 Critical | H-17 Employer WTP | Revenue model depends on this |
| 🟠 High | H-02 Bad hire frequency | Quantifies problem severity |
| 🟠 High | H-05 Current workarounds | Reveals competitive landscape |
| 🟠 High | H-10 Mentor payout WTP | Supply side viability |
| 🟡 Medium | H-14 Fraud prevalence | Fraud features need this confirmed |
| 🟡 Medium | H-11 Union mentor credibility | Positioning decision |
| 🟢 Lower | H-08 HVAC EPA specifics | Narrow vertical; validate after core |
| 🟢 Lower | H-20 Per-assessment WTP | Second-order pricing; validate after subscription |
