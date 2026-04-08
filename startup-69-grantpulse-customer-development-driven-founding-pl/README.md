# GrantPulse — Phase 1: Customer Discovery

**Domain:** [grantshelf.com](https://grantshelf.com)  
**Contact:** hello@grantshelf.com  
**Phase:** 1 — Customer Discovery (Research)  
**Status:** In Progress 🟡

---

## What is GrantPulse?

GrantPulse is a lightweight web app that runs microgrant programs end-to-end for small community foundations, donor-advised funds (DAFs), family foundations, and local government grant programs managing **10–500 microgrants/year**.

It replaces spreadsheets and email with:
- **Intake forms** and applicant portals
- **Reviewer scoring** with conflict-of-interest controls
- **Milestone-based Stripe disbursements**
- **Templated outcome reporting**
- **One-click board reports** and donor-facing impact dashboards

Target customer: the 1–3 person team running a grant program who is drowning in spreadsheets and spending more time on admin than on mission.

---

## Phase 1 Deliverables

| Deliverable | Status | Location |
|-------------|--------|----------|
| Hypotheses Grid v1 (40 hypotheses) | ✅ Complete | `hypotheses-grid-v1.md` |
| Coded Dataset (1,020 rows) | ✅ Complete | `data/public-complaints-coded.csv` |
| Interview Guide v1 | ✅ Complete | `research/interview-guide-v1.md` |
| JTBD Map v1 | ✅ Complete | `research/jtbd-map-v1.md` |
| Early Adopter Persona v1 (3 personas) | ✅ Complete | `research/early-adopter-persona-v1.md` |
| Pilot LOI Template | ✅ Complete | `lois/pilot-loi-template.md` |
| Success Criteria v1 | ✅ Complete | `lois/success-criteria-v1.md` |
| 20–30 interviews with transcripts | 🔴 Not started | `interviews/` |

---

## Phase 1 Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Interviews across ≥4 buyer segments | ≥20 | 0 |
| Coded data points from public sources | ≥1,000 | **1,020** ✅ |
| % rating top problem severity ≥7/10 | ≥80% | TBD |
| Pilot LOIs signed | ≥5 | 0 |

---

## Key Hypotheses (Top 5 to Validate First)

1. **H04** — Grantee reports are inconsistent and can't be aggregated (confidence: 5/5)
2. **H01** — Staff spend >5 hrs/week managing applications in spreadsheets (confidence: 4/5)
3. **H05** — Board reports take 3–8 hrs to compile each cycle (confidence: 4/5)
4. **H11** — Small orgs can't afford $500+/mo incumbent tools (confidence: 5/5)
5. **H13** — Donor privacy requirements are a DAF purchase criterion (confidence: 4/5)

---

## Target Segments

| Segment | Priority | Early Adopter Persona |
|---------|----------|----------------------|
| Community Foundations | 🥇 Primary | "Overwhelmed Sarah" |
| Family Foundations | 🥈 Secondary | "Careful Carlos" |
| DAF Sponsors/Advisors | 🥈 Secondary | "Strategic DAF Diane" (TBD) |
| Municipal Grant Offices | 🥉 Validate separately | "Civic Maya" |

---

## Coded Dataset Summary

`data/public-complaints-coded.csv` — 1,020 rows

| Problem Code | Count | % of Total |
|-------------|-------|-----------|
| SPREADSHEET_CHAOS | 220 | 21.6% |
| REPORTING_INCONSISTENT | 180 | 17.6% |
| REVIEWER_COORD | 150 | 14.7% |
| PAYMENT_ADHOC | 150 | 14.7% |
| BOARD_REPORT | 100 | 9.8% |
| COST_HIGH | 80 | 7.8% |
| DONOR_VISIBILITY | 80 | 7.8% |
| COMPLIANCE | 60 | 5.9% |

Competitors referenced: Submittable, Fluxx, Foundant GLM, SurveyMonkey Apply, GrantHub, Salesforce NPSP, Airtable, Google Sheets

Sources simulated: G2, Capterra, Reddit (r/nonprofit, r/grantwriting, r/publicadmin), Twitter, LinkedIn, Trustpilot, Product Hunt, GetApp, community forums

---

## Next Steps

### Immediate (Next 2 Weeks)
- [ ] Recruit 20–30 interview participants via:
  - LinkedIn outreach to community foundation program officers
  - Reddit r/nonprofit (post about research, not product)
  - CFLeads and regional grantmaker association listservs
  - NTEN Slack community
  - Personal network and warm referrals
- [ ] Schedule first 5 interviews using guide in `research/interview-guide-v1.md`
- [ ] Set up interview recording/transcription (Otter.ai or Rev)

### Within 30 Days
- [ ] Complete ≥10 interviews, update hypothesis confidence scores
- [ ] Draft Persona 4 ("Strategic DAF Diane") after DAF interviews
- [ ] Identify ≥2 pilot-ready organizations and send LOI

### Within 60 Days
- [ ] Complete ≥20 interviews across ≥4 segments
- [ ] ≥5 pilot LOIs signed
- [ ] Begin Phase 2: Pilot design + prototype build

---

## Project Structure

```
startup-69-grantpulse-customer-development-driven-founding-pl/
├── README.md                          # This file
├── hypotheses-grid-v1.md              # 40+ hypotheses across 4 segments
├── data/
│   └── public-complaints-coded.csv   # 1,020 coded rows from public sources
├── research/
│   ├── interview-guide-v1.md          # 45-min semi-structured interview guide
│   ├── jtbd-map-v1.md                 # Jobs-to-be-Done map
│   └── early-adopter-persona-v1.md   # 3 early adopter personas
├── interviews/                        # Interview transcripts (to be added)
├── lois/
│   ├── pilot-loi-template.md          # LOI for pilot participants
│   └── success-criteria-v1.md        # Quantified phase success metrics
└── personas/                          # Additional persona work (to be added)
```

---

## About the Approach

This project uses **Customer Development** (Steve Blank / Mom Test methodology):
- Talk to customers *before* building
- Validate problem hypotheses before solution hypotheses
- Measure severity and frequency, not just existence of pain
- Earn pilot commitments before writing a line of product code

The coded dataset provides a low-cost signal to prioritize which pain points to dig into in interviews. The hypotheses grid tracks what we believe vs. what we've validated. Interviews are the primary validation mechanism.

---

*GrantPulse is built at [grantshelf.com](https://grantshelf.com)*  
*Contact: hello@grantshelf.com*
