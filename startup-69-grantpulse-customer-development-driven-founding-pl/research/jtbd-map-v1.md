# GrantPulse JTBD Map v1
## Jobs-to-be-Done Analysis — Phase 1 Customer Discovery

**Version:** 1.0 | **Domain:** grantshelf.com

---

## Framework

Jobs-to-be-Done (JTBD) describes what people are trying to accomplish — not features, not personas, but *progress*. A "job" is the underlying goal someone is trying to achieve when they encounter our product space.

Format: `[Motivation] + [Object] + [Context/Constraint]`

---

## Functional Jobs

Functional jobs are the practical tasks someone needs to get done.

### Job F1: Run a Full Grant Cycle

**"Help me get from 'grant window opens' to 'final report filed' without anything falling through the cracks."**

| Job Step | Current Solution | Pain Intensity (1–10) | GrantPulse Solution |
|----------|-----------------|----------------------|---------------------|
| Open application window | Google Form / email | 3 | Configured intake form with eligibility screening |
| Collect and organize applications | Google Sheets / email folder | 8 | Centralized applicant database with status tracking |
| Assign applications to reviewers | Manual email + spreadsheet | 7 | Automated reviewer assignment with COI check |
| Collect reviewer scores | Email / PDF / Google Form | 8 | Structured scoring interface with reminders |
| Tabulate scores and rank applications | Manual spreadsheet formulas | 7 | Auto-aggregated scoring with ranking view |
| Notify applicants of decisions | Mail merge / individual emails | 5 | Automated award/decline notifications |
| Process disbursements | Check / wire / manual banking portal | 8 | Milestone-gated Stripe disbursements |
| Track grantee milestone completion | Email follow-up / spreadsheet | 7 | Grantee portal with milestone submission |
| Collect outcome reports | Email / Google Form / ad hoc | 9 | Templated report forms with deadline tracking |
| Compile program summary | Manual slide deck / spreadsheet | 8 | One-click board report generation |

**Who has this job most:** Community Foundations (all cycles), Family Foundations (annual cycles)  
**Pain peak:** Application management, reviewer coordination, and outcome reporting  

---

### Job F2: Disburse Funds Accurately and Compliantly

**"Help me get money to the right grantees, at the right time, with a documented approval trail."**

| Outcome | Current Problem | Magnitude |
|---------|----------------|-----------|
| Issue payment only when milestone is met | No milestone gate → premature disbursements | High |
| Maintain audit trail of payment approvals | Email chain approval → no structured log | High |
| Avoid double payment | No payment tracking → manual reconciliation errors | Medium |
| Process payments efficiently | Manual check-writing / banking portal approvals | Medium |
| Recover underspent funds | No monitoring → discover at final report, too late | Medium |

**Segments:** CF, FF, MO (especially orgs that have had audit findings)  

---

### Job F3: Demonstrate Accountability to Board

**"Help me show the board what we funded, what outcomes we achieved, and whether our strategy is working — in under an hour."**

| Outcome | Current Problem | Magnitude |
|---------|----------------|-----------|
| Produce ready-to-present board packet | Manual data assembly from multiple sources | Very High |
| Show grant-level outcomes | Inconsistent grantee reports | High |
| Compare performance across cycles | Incompatible data formats year-over-year | High |
| Answer ad-hoc board questions | No data infrastructure to query | Medium |
| Produce annual impact summary | Multi-week manual process | High |

**Segments:** CF, FF — nearly universal  

---

### Job F4: Give Donors Visibility Into Their Impact

**"Help me show my donors what their money did, without producing a custom report by hand each time."**

| Outcome | Current Problem | Magnitude |
|---------|----------------|-----------|
| Produce per-fund impact summary | Fully manual, hours per donor | High |
| Provide real-time fund activity | No portal → donors call for updates | High |
| Show grant-level detail with grantee stories | No structured data → ad hoc PDFs | Medium |
| Increase donor re-grant engagement | Low visibility → low re-engagement | Medium |

**Segments:** DAF sponsors primarily; also relevant for CF family funds  

---

### Job F5: Coordinate a Fair and Efficient Review Process

**"Help me run a review process where all applications get scored on time, conflicts are avoided, and I can defend every decision."**

| Outcome | Current Problem | Magnitude |
|---------|----------------|-----------|
| Get all scores in by deadline | Reviewer no-shows, lost PDFs | High |
| Prevent COI without awkward conversations | Manual self-disclosure → gaps | High |
| Maintain blind review (prevent reviewer influence) | Shared spreadsheets expose other scores | Medium |
| Ensure scoring calibration across reviewers | No calibration tools → score drift | Medium |
| Produce defensible ranking for funding decisions | Manual tabulation errors | Medium |

**Segments:** CF, DAF  

---

### Job F6: Report to External Stakeholders (State/Federal)

**"Help me produce the compliance reports my government funder requires without rebuilding data from scratch."**

| Outcome | Current Problem | Magnitude |
|---------|----------------|-----------|
| Export data in required format (CDBG, HUD, etc.) | Manual reformatting from spreadsheets | High |
| Maintain documentation for multi-year programs | No structured archiving | High |
| Demonstrate fund matching requirements | Manual calculation | Medium |

**Segments:** MO primarily; also some CF programs with government grants  

---

## Emotional Jobs

Emotional jobs describe how people want to feel (or avoid feeling) as a result of their work.

| Job | "Help me feel..." | Opposite fear | Segment | Intensity |
|-----|------------------|---------------|---------|-----------|
| E1 | In control and organized during grant season | Overwhelmed, drowning in emails | CF, FF | Very High |
| E2 | Confident presenting to the board | Embarrassed by incomplete data | CF, FF | Very High |
| E3 | Not like the bottleneck blocking grantees from getting paid | Guilty for slow disbursements | CF, MO | High |
| E4 | Like a professional, not a volunteer | Like I'm making it up as I go | CF, FF (small) | High |
| E5 | Assured that nothing will fall through the cracks | Anxious about forgotten follow-ups | CF, FF | High |
| E6 | Confident that we're compliant | Afraid of an audit finding | FF, MO | High |
| E7 | Proud of what we accomplished this cycle | Uncertain about whether grants worked | CF, FF | Medium |
| E8 | Free to focus on mission, not admin | Trapped by administrative burden | CF, FF | Very High |

---

## Social Jobs

Social jobs describe how people want to be perceived by others.

| Job | "Help me be seen as..." | Context | Segment | Intensity |
|-----|------------------------|---------|---------|-----------|
| S1 | A credible, modern funder | By grantees and applicants | CF, FF | High |
| S2 | Accountable and transparent | By donors and community | CF, DAF | High |
| S3 | A good steward of donor resources | By board and donors | FF, DAF | Very High |
| S4 | A competent program manager | By their executive director/board | CF, MO | High |
| S5 | A foundation that can grow | By peer foundations / networks | CF | Medium |
| S6 | A trustworthy government partner | By community organizations | MO | High |

---

## Job Executor Map by Segment

Who holds each job in each segment:

| Job | Community Foundation | DAF Sponsor | Family Foundation | Municipal Office |
|-----|---------------------|-------------|-------------------|-----------------|
| F1: Run grant cycle | Program Officer | Program Staff | Foundation Admin | Grants Coordinator |
| F2: Disburse funds | Program Officer + Finance | Finance/Ops | Foundation Admin | Finance + Grants |
| F3: Board accountability | Program Officer + ED | Not primary | Foundation Admin | Dept Head + Grants |
| F4: Donor visibility | N/A (or CF-wide) | DAF Advisor | N/A | N/A |
| F5: Review coordination | Program Officer | Program Staff | Foundation Admin | Grants Coordinator |
| F6: External reporting | Not primary | Not primary | Not primary | Grants Coordinator |
| E1–E8: Emotional | Program Officer | Program Staff | Foundation Admin | Grants Coordinator |

---

## Job Priority Matrix

Jobs ranked by: (pain intensity) × (frequency) × (addressability)

| Rank | Job | Pain × Freq × Addressability | Notes |
|------|-----|------------------------------|-------|
| 1 | F1 / E1: Run cycle without chaos | 9 × 10 × 8 = 720 | Core product job |
| 2 | F3 / E2: Board report without pain | 9 × 8 × 9 = 648 | Standalone high-value feature |
| 3 | F5 / E5: Fair review coordination | 8 × 8 × 8 = 512 | Key differentiator vs. email |
| 4 | F2 / E3: Compliant disbursements | 8 × 7 × 8 = 448 | Finance team champion driver |
| 5 | F4 / S2: Donor visibility | 7 × 6 × 8 = 336 | DAF segment entry point |
| 6 | F6: External compliance reporting | 7 × 5 × 7 = 245 | MO segment — lower addressability |

---

## Key Insight

The highest-priority functional job is **F1 (Run Grant Cycle)** — but the highest-emotion, fastest-to-validate job is **F3 (Board Report)**. Early adopter conversations should anchor on F1 pain and demonstrate F3 value as the instant "aha moment."

The **emotional job E8** ("help me focus on mission, not admin") is the underlying motivation for purchasing. All messaging should ladder up to it.
