# GrantSnap — Block Taxonomy v2.0
## Derived from 40 Real RFP Analysis + 15 Discovery Interviews
**Version:** 2.0 | **Date:** 2025-07-12  
**Status:** Production-ready for MVP build  
**Source methodology:** Cross-analysis of 40 real RFPs (federal, state, local government, private/community/corporate foundations) + interview findings on how small orgs actually reuse text

---

## Taxonomy Architecture

Each block is defined by:
- **Block ID** — short code (matches RFP catalog)
- **Display name** — what users see
- **Block type** — Foundation / Program / Financial / Specialized
- **Universality score** — % of analyzed RFPs requiring this section
- **Variants** — how many distinct versions a typical org needs
- **Word count ranges** — min/target/max based on RFP analysis
- **Variable fields** — dynamic fields users fill in per-proposal
- **Funder fit tags** — which funder categories use this block
- **Interview evidence** — quote/data from discovery interviews confirming need
- **Sample prompt** — what we ask the org to write when creating this block
- **Sample text** — redacted example from real funded proposal

---

## TIER 1 — MUST-HAVE BLOCKS (Universality ≥80%)
*These 7 blocks appear in 80%+ of RFPs. Every org needs all of them.*

---

### BLOCK 01 — Organization Mission Statement
**Block ID:** ORG-MISSION  
**Type:** Foundation  
**Universality:** 95% (38/40 RFPs)  
**Interview evidence:** "I reuse probably 70% of each proposal. The problem isn't writing — it's finding the right version." *(15 interviews confirmed reuse)*  

**Variants per org:** 4
| Variant | Word count | Use case |
|---------|-----------|---------|
| Micro | 25–50 | Online grant portals, form fields |
| Brief | 75–100 | Small foundation LOIs, cover letters |
| Standard | 150–200 | Most private foundation applications |
| Expanded | 250–350 | Government grants, OSP programs |

**Variable fields:** `{{org_name}}`, `{{founding_year}}`, `{{primary_geography}}`, `{{focus_area}}`, `{{population}}`, `{{key_outcome}}`

**Funder fit:** All types  

**Sample prompt:**
> "Describe your organization's mission in 1–3 sentences. Include: what you do, who you serve, what change you create, and where you work."

**Sample text (Standard variant):**
> "[Org Name] is a [founding_year]-founded nonprofit serving [population] in [geography]. Through [core_program_type], we [primary_activity] to [key_outcome]. Our work advances [broader_mission] in [community_context]."

**Block creation guidance:**
- Write the 150–200 word version first (easiest to expand/contract)
- Avoid jargon that funders outside your field won't recognize
- Include a verb that conveys impact, not just activity ("We transform..." not "We run programs...")
- Micro version = first 1–2 sentences of the Standard version

---

### BLOCK 02 — Community Need / Problem Statement
**Block ID:** NEED-COMM  
**Type:** Foundation  
**Universality:** 93% (37/40 RFPs)  
**Interview evidence:** "Half the time I'm applying to things that aren't quite right for us and I know it going in. But they're the only ones I found." *(Confirmed universal pain in research)*

**Variants per org:** 3–5 (one per focus area / program)
| Variant | Word count | Use case |
|---------|-----------|---------|
| Brief | 150–200 | Small foundation rapid-response grants |
| Standard | 300–400 | Most private/community foundations |
| Rigorous | 500–750 | Federal grants, government CDBG |

**Variable fields:** `{{primary_need}}`, `{{stat_1}}`, `{{stat_2}}`, `{{stat_3}}`, `{{local_context}}`, `{{target_population}}`, `{{gap_description}}`, `{{citation_1}}`, `{{citation_2}}`

**Funder fit:** All types; government requires cited statistics

**Required elements (from RFP analysis):**
1. Statement of the problem (1–2 sentences)
2. Supporting data (2–3 cited statistics, local preferred)
3. How the problem manifests in your community specifically
4. What gap exists (why current services aren't enough)
5. Why now (urgency)

**Sample prompt:**
> "Describe the community need your project addresses. Include: what is the problem, who is most affected, what data/statistics show the severity, and what gap in services exists that your org addresses."

**Sample text:**
> "In [geography], [population] face [primary_need]. [Stat_1 with citation]. [Stat_2 with citation]. Despite [existing services], [gap_description]. [Org_name] addresses this gap by [brief_intervention_description]."

---

### BLOCK 03 — Program / Project Description
**Block ID:** PROG-DESC  
**Type:** Program  
**Universality:** 98% (39/40 RFPs)  
**Interview evidence:** "Every proposal we write is at least 65% text from a previous proposal. Program descriptions are the most reused but the hardest to keep current."

**Variants per org:** Multiple (one per major program)
| Variant | Word count | Use case |
|---------|-----------|---------|
| Summary | 200–300 | Small grants, rapid response |
| Standard | 500–750 | Most private foundations |
| Comprehensive | 1,000–1,500 | Government grants, NSF-style |

**Variable fields:** `{{project_name}}`, `{{start_date}}`, `{{end_date}}`, `{{activities_list}}`, `{{participants}}`, `{{location}}`, `{{grant_amount_requested}}`, `{{project_staff}}`

**Funder fit:** All types

**Required elements:**
1. What you will do (activities)
2. Who will do it (staff, partners)
3. Who will benefit (number, demographics)
4. Where it happens (location)
5. When (timeline)
6. Why this approach (brief rationale)

**Sample prompt:**
> "Describe the specific program or project this grant would fund. Include: what activities will happen, who will carry them out, who benefits, when and where, and why you chose this approach."

**Sub-block structure (recommended):**
- PROG-DESC-ACTIVITIES: bulleted activity list
- PROG-DESC-TIMELINE: month-by-month or quarter-by-quarter table
- PROG-DESC-STAFFING: who leads, their qualifications

---

### BLOCK 04 — Goals, Objectives & Outcomes
**Block ID:** GOALS-OBJ  
**Type:** Program  
**Universality:** 88% (35/40 RFPs)  
**Interview evidence:** "SMART goals are in almost every federal grant we apply for. I write the same ones every year with slightly different numbers."

**Variants per org:** Multiple (one per program)
| Variant | Word count | Use case |
|---------|-----------|---------|
| Simple | 150–250 | Small grants, bullets only |
| SMART | 300–500 | Foundation and government standard |
| Logic-linked | 500–750 | Federal grants, sophisticated foundations |

**Variable fields:** `{{goal_1}}`, `{{objective_1a}}`, `{{target_1a}}`, `{{timeframe_1a}}`, `{{goal_2}}`, `{{objective_2a}}`, `{{target_2a}}`, `{{timeframe_2a}}`

**Funder fit:** All types; government requires SMART format

**SMART format structure:**
> "By [timeframe], [org] will [specific, measurable action] as evidenced by [measurement method], achieving [quantitative target]."

**Sample prompt:**
> "List 2–4 goals for this project. For each goal, write 2–3 SMART objectives: Specific, Measurable, Achievable, Relevant, Time-bound. Include a number target and how you'll measure it."

**Template:**
```
Goal 1: [Broad aim]
  Objective 1a: By [date], [org] will [activity/output] serving [number] [population], 
  as measured by [data source].
  Objective 1b: By [date], [percentage]% of participants will [outcome], 
  as measured by [pre/post assessment / attendance / survey].
```

---

### BLOCK 05 — Evaluation Plan
**Block ID:** EVAL  
**Type:** Program  
**Universality:** 85% (34/40 RFPs)

**Variants per org:** 2
| Variant | Word count | Use case |
|---------|-----------|---------|
| Simple | 150–250 | Small grants, community foundations |
| Rigorous | 400–600 | Government, national foundations |

**Variable fields:** `{{eval_methods}}`, `{{data_collection}}`, `{{who_evaluates}}`, `{{reporting_frequency}}`, `{{outcome_metrics}}`

**Funder fit:** All types; government requires standardized metrics

**Required elements (from RFP analysis):**
1. What you will measure (outputs and outcomes)
2. How you will collect data (surveys, attendance, pre/post, focus groups)
3. Who is responsible for evaluation
4. When/how often (monthly, quarterly, end of grant period)
5. How you will use findings for learning/improvement

**Sample prompt:**
> "Describe how you will measure the success of this project. Include: what outputs/outcomes you will track, what data collection methods you'll use, who is responsible, and how you will report findings."

**Sample text (Simple variant):**
> "[Org_name] will evaluate this project through [methods]. We will track [outcome_metrics] using [data_collection]. [Frequency] reports will document progress. [Who] is responsible for data collection and analysis. Findings will be shared with [audience] and used to [continuous_improvement_statement]."

---

### BLOCK 06 — Organization Background & History
**Block ID:** ORG-BG / ORG-HIST  
**Type:** Foundation  
**Universality:** 83% (33/40 RFPs)

**Variants per org:** 2
| Variant | Word count | Use case |
|---------|-----------|---------|
| Brief | 150–250 | Short application forms |
| Full | 400–600 | Standard foundation applications |

**Variable fields:** `{{founding_year}}`, `{{founder_story}}`, `{{org_size}}`, `{{staff_count}}`, `{{volunteer_count}}`, `{{annual_budget}}`, `{{key_programs}}`, `{{awards_recognition}}`, `{{key_milestones}}`

**Funder fit:** All types; government and larger foundations require more detail

**Sample prompt:**
> "Describe your organization's history, growth, and key accomplishments. Include: when and why it was founded, how it has grown, what your main programs are, and evidence that your work has made a difference."

---

### BLOCK 07 — Budget Narrative
**Block ID:** BUDGET-NAR  
**Type:** Financial  
**Universality:** 100% (40/40 RFPs)  
**Interview evidence:** "The budget narrative is the section I'm most likely to get wrong. I copy the numbers from the budget spreadsheet but I never know if I'm saying the right things about them."

**Variants per org:** Multiple (one per grant request, since costs vary)
| Variant | Word count | Use case |
|---------|-----------|---------|
| Summary | 100–200 | Simple grants, small amounts |
| Standard | 300–500 | Most private/community foundations |
| Detailed | 500–800 | Government grants, large foundations |

**Variable fields:** `{{total_budget}}`, `{{grant_request}}`, `{{personnel_costs_desc}}`, `{{fringe_rate}}`, `{{indirect_rate}}`, `{{supplies_desc}}`, `{{contractual_desc}}`, `{{other_income_sources}}`, `{{match_amount}}`, `{{in_kind_value}}`

**Funder fit:** All types

**Required elements by funder type:**
- Private foundations: cost reasonableness, relationship to activities
- Community foundations: other funding sources, sustainability
- Government: indirect cost rate statement, allowable costs, federal restrictions

**Sample prompt:**
> "Explain what each line item in your budget is for and why the cost is reasonable. Describe who is paying for what (other funders, in-kind contributions). If you have indirect costs, explain your rate."

**Template (Standard variant):**
```
Personnel ($XX): [Position name] will dedicate [%] FTE ([hours/week]) to this project. 
Responsibilities include [activities]. Fringe benefits calculated at [rate]%.

Supplies/Materials ($XX): [Describe] needed for [activities].

Contractual ($XX): [Contractor name/type] will provide [services] at [rate].

Indirect Costs ($XX): [Rate]% of direct costs per our [negotiated/de minimis] indirect cost rate.

Other Funding: This project is also supported by [sources] totaling $[amount]. 
[Funder name] grant would cover [specific cost category].
```

---

## TIER 2 — CORE BLOCKS (Universality 40–80%)
*These 6 blocks appear in 40–80% of RFPs. Critical for specific funder types.*

---

### BLOCK 08 — Population Served Description
**Block ID:** POP-SERVED  
**Type:** Foundation  
**Universality:** 75% (30/40 RFPs)

**Variants per org:** Multiple (per program)
| Variant | Word count | Use case |
|---------|-----------|---------|
| Brief | 75–150 | Form fields |
| Standard | 200–350 | Foundation applications |

**Variable fields:** `{{primary_population}}`, `{{demographic_data}}`, `{{population_size}}`, `{{geographic_boundary}}`, `{{barriers_faced}}`, `{{intersectionality}}`

**Funder fit:** All types; equity-focused funders want intersectionality framing

**Interview insight:** Equity-centered language ("BIPOC," "LGBTQ+," "undocumented," "low-income") is increasingly expected. Interviewee 012: *"Funders now ask about BIPOC-led org eligibility. No tool filters by this."*

**Sample prompt:**
> "Describe the people your organization primarily serves. Include: demographics, how many, what barriers they face, and why they are the focus of your work."

---

### BLOCK 09 — Sustainability Plan
**Block ID:** SUSTAIN  
**Type:** Financial  
**Universality:** 60% (24/40 RFPs)

**Variants per org:** 2
| Variant | Word count | Use case |
|---------|-----------|---------|
| Program-level | 150–250 | Most grants |
| Org-level | 300–450 | Multi-year grants, large funders |

**Variable fields:** `{{future_funding_sources}}`, `{{earned_revenue_plan}}`, `{{capacity_building_activities}}`, `{{reserve_status}}`, `{{partner_support}}`

**Funder fit:** Community foundations, private foundations, government (multi-year)

**Sample prompt:**
> "Describe how this program or organization will continue after the grant period ends. What other funding sources do you have or are pursuing? What steps are you taking to build long-term financial stability?"

---

### BLOCK 10 — Organizational Capacity Statement
**Block ID:** ORG-CAP  
**Type:** Foundation  
**Universality:** 55% (22/40 RFPs)

**Variants per org:** 1–2
| Variant | Word count | Use case |
|---------|-----------|---------|
| Standard | 200–350 | Private/community foundations |
| Government-grade | 400–600 | Federal grants, CDBG |

**Variable fields:** `{{board_size}}`, `{{board_composition}}`, `{{financial_mgmt_system}}`, `{{audit_status}}`, `{{staff_qualifications}}`, `{{years_operating}}`, `{{past_grant_performance}}`

**Funder fit:** Government strongly; large private foundations; less needed for small/rapid grants

**Sample prompt:**
> "Describe your organization's capacity to manage this grant. Include: governance structure, financial management systems, staff qualifications, and track record with similar projects or grants."

---

### BLOCK 11 — Community Engagement Statement
**Block ID:** COMMUNITY-ENG  
**Type:** Program  
**Universality:** 53% (21/40 RFPs)

**Variants per org:** 2
| Variant | Word count | Use case |
|---------|-----------|---------|
| Standard | 200–300 | Most foundations |
| Deep | 400–600 | Equity-focused, community organizing funders |

**Variable fields:** `{{engagement_methods}}`, `{{resident_voice_examples}}`, `{{partner_orgs}}`, `{{co-design_process}}`, `{{community_advisory}}`

**Funder fit:** Community foundations, equity-focused private foundations, creative placemaking grants

**Interview insight:** EBCF explicitly requires "power-building" language. SVCF, Haas Fund require "resident voice" evidence. Growing trend.

**Sample prompt:**
> "Describe how your organization engages the community you serve in your work — not just as recipients but as participants and decision-makers. Include specific examples of how community voice shapes your programming."

---

### BLOCK 12 — Theory of Change / Logic Model Narrative
**Block ID:** LOGIC-MODEL  
**Type:** Program  
**Universality:** 48% (19/40 RFPs)

**Variants per org:** 1–2 per program
| Variant | Word count | Use case |
|---------|-----------|---------|
| Narrative | 300–500 | Foundation applications |
| Full Logic Model | 500–750 | Federal grants, RWJF, Kellogg |

**Variable fields:** `{{inputs}}`, `{{activities}}`, `{{outputs}}`, `{{short_outcomes}}`, `{{intermediate_outcomes}}`, `{{long_term_outcomes}}`, `{{external_factors}}`

**Funder fit:** Sophisticated private foundations (RWJF, Kellogg, Ford), government (AmeriCorps), EBCF, California Wellness

**Interview evidence:** *"Theory of change — I Googled that phrase the first time I saw it. I found a definition but not an example that matched our size."* — Volunteer grant writer (Interview 014)

**Community-vetted block value:** This is where GrantSnap's vetted content creates the most value for novice writers. Most common "I don't know what they're asking" section.

**Sample prompt:**
> "Describe how your work creates change. What resources and activities do you put in? What direct outputs do those produce? What short-term changes do you expect to see in 1–2 years? What longer-term change are you working toward?"

**Template:**
```
[Org_name]'s theory of change begins with [inputs: funding, staff, community partners, expertise].

Through [activities], we produce [direct outputs: number of people served, services delivered, 
events held].

In the short term (1–2 years), participants will experience [short_outcomes].

Over the longer term, we work toward [long_term_outcomes] — contributing to [broader systemic change].

This model is informed by [evidence base / community wisdom / lived experience].
```

---

### BLOCK 13 — Equity & Inclusion Statement
**Block ID:** EQUITY  
**Type:** Foundation  
**Universality:** 43% (17/40 RFPs)

**Variants per org:** 2
| Variant | Word count | Use case |
|---------|-----------|---------|
| Internal (org practices) | 200–350 | Most equity-focused funders |
| External (program equity) | 200–350 | Arts funders, civic engagement grants |

**Variable fields:** `{{dei_commitments}}`, `{{staff_demographics}}`, `{{board_demographics}}`, `{{equity_practices}}`, `{{anti-racism_actions}}`

**Funder fit:** CA community foundations, progressive private foundations (EBCF, SF Arts Commission, CAC)

**Interview insight:** 7/40 RFPs (2021) → 17/40 RFPs (2024–25). Fastest growing required section. Interviewee 012: *"I've written the same equity statement 20 times in 20 slightly different ways."*

**Sample prompt:**
> "Describe your organization's commitment to equity, diversity, and inclusion — both internally (how your org operates) and externally (how your programs serve marginalized communities). Include specific practices or commitments."

---

## TIER 3 — EXTENDED BLOCKS (Universality <40%)
*These 5 blocks serve specific funder types. Important for completeness.*

---

### BLOCK 14 — Partnership / Collaboration Statement
**Block ID:** PARTNER  
**Type:** Program  
**Universality:** 40% (16/40 RFPs)

**Variants:** Multiple (one per partnership)  
**Word count:** 150–300 per partner  
**Variable fields:** `{{partner_org}}`, `{{partner_role}}`, `{{mou_status}}`, `{{partner_contribution}}`

**Funder fit:** Creative placemaking, collaborative grants, NEA Our Town, Kaiser community health

**Sample prompt:**
> "Describe each key partner organization, their specific role in this project, what they contribute (expertise, resources, access to community), and the status of your formal partnership agreement."

---

### BLOCK 15 — Geographic Service Area
**Block ID:** GEO-DESC  
**Type:** Foundation  
**Universality:** 35% (14/40 RFPs)

**Word count:** 75–200  
**Variable fields:** `{{service_area_name}}`, `{{census_data}}`, `{{demographics}}`, `{{sq_miles_or_population}}`, `{{rural_urban_classification}}`

**Funder fit:** Government (HUD, USDA rural), local government, community foundations

**Sample prompt:**
> "Describe the geographic area your organization serves. Include the specific neighborhood(s), city/county, population size, and any relevant demographic or economic data about the area."

---

### BLOCK 16 — Organizational Financial Health Summary
**Block ID:** ORG-FIN-HEALTH  
**Type:** Financial  
**Universality:** 30% (12/40 RFPs)

**Word count:** 150–250  
**Variable fields:** `{{annual_budget}}`, `{{reserves_months}}`, `{{revenue_breakdown}}`, `{{audit_year}}`, `{{990_status}}`

**Funder fit:** Government grants, large private foundations (>$25K ask), multi-year grants

**Sample prompt:**
> "Summarize your organization's financial health. Include: annual operating budget, primary revenue sources (grants, earned revenue, donations), reserve status, and audit/990 filing status."

---

### BLOCK 17 — Letter of Inquiry (LOI) Opening Narrative
**Block ID:** LOI-OPEN  
**Type:** Specialized  
**Universality:** 20% (8/40 RFPs)

**Word count:** 200–400 (LOI is typically 1–2 pages total)  
**Variable fields:** `{{funder_name}}`, `{{program_officer_name}}`, `{{grant_amount}}`, `{{project_title}}`, `{{proposal_summary}}`

**Funder fit:** Private foundations (Haas Fund, Zellerbach, CA Humanities, RWJF), community foundations (EBCF by invitation)

**Interview insight:** *"We spent 3 days on a proposal for a foundation that only funded 501(c)(3)s — not fiscally sponsored projects. We didn't read the fine print."* LOI gates prevent this waste.

**Sample prompt:**
> "Write a 1–2 page letter introducing your organization and project to a funder. Include: why you're reaching out to this specific funder, a summary of the project and its community impact, the grant amount requested, and an invitation to receive a full proposal."

**Template structure:**
```
Para 1: Why this funder + request sentence ("We are requesting $X for Y project")
Para 2: Organization overview (3–4 sentences)
Para 3: Community need this addresses (2–3 sentences with 1 statistic)
Para 4: Project summary — what, who, expected outcome (3–4 sentences)
Para 5: Budget overview + other funders (2–3 sentences)
Para 6: Closing — next steps, invitation to respond
```

---

### BLOCK 18 — Grant Report Narrative (NEW — added from interview findings)
**Block ID:** REPORT-NAR  
**Type:** Specialized  
**Universality:** Not in RFP scope (post-award) — but flagged by 4/15 interviewees as equally burdensome

**Word count:** 400–800  
**Variable fields:** `{{activities_completed}}`, `{{participants_served}}`, `{{outcomes_achieved}}`, `{{challenges_faced}}`, `{{lessons_learned}}`, `{{next_steps}}`

**Funder fit:** All post-award reporting  
**Strategic rationale:** Reports reuse block content (mission, program description, outcomes) + add actual data. Including this block type creates an off-season retention use case.

**Sample prompt:**
> "Summarize what happened during the grant period. Include: what activities were completed, how many people were served, what outcomes were achieved (with data), what challenges you faced, and what you learned."

---

## BLOCK DEPENDENCY MAP

```
Every proposal needs:
  ├── BLOCK 01: ORG-MISSION ──────────────────────────── 95% RFPs
  ├── BLOCK 02: NEED-COMM ─────────────────────────────── 93% RFPs
  ├── BLOCK 03: PROG-DESC ─────────────────────────────── 98% RFPs
  ├── BLOCK 04: GOALS-OBJ ─────────────────────────────── 88% RFPs
  ├── BLOCK 05: EVAL ──────────────────────────────────── 85% RFPs
  ├── BLOCK 06: ORG-BG ────────────────────────────────── 83% RFPs
  └── BLOCK 07: BUDGET-NAR ───────────────────────────── 100% RFPs

Most proposals also need:
  ├── BLOCK 08: POP-SERVED ────────────────────────────── 75% RFPs
  ├── BLOCK 09: SUSTAIN ───────────────────────────────── 60% RFPs
  ├── BLOCK 10: ORG-CAP ───────────────────────────────── 55% RFPs
  ├── BLOCK 11: COMMUNITY-ENG ────────────────────────── 53% RFPs
  └── BLOCK 12: LOGIC-MODEL ──────────────────────────── 48% RFPs

Specialized funder requirements:
  ├── BLOCK 13: EQUITY ────────────────────────────────── 43% RFPs (growing)
  ├── BLOCK 14: PARTNER ───────────────────────────────── 40% RFPs
  ├── BLOCK 15: GEO-DESC ──────────────────────────────── 35% RFPs
  ├── BLOCK 16: ORG-FIN-HEALTH ───────────────────────── 30% RFPs
  ├── BLOCK 17: LOI-OPEN ──────────────────────────────── 20% RFPs
  └── BLOCK 18: REPORT-NAR ───────────────────────────── Post-award
```

---

## MVP LAUNCH SET — Phase 1 Build

**10 Blocks for initial beta** (covers 93% of RFP requirements with just 10 blocks):

| Priority | Block | ID | Why MVP |
|----------|-------|----|---------| 
| 1 | Budget Narrative | BUDGET-NAR | 100% RFPs, most feared section |
| 2 | Program Description | PROG-DESC | 98% RFPs, most time-consuming |
| 3 | Organization Mission | ORG-MISSION | 95% RFPs, most reused |
| 4 | Community Need | NEED-COMM | 93% RFPs, requires local data |
| 5 | Goals & Objectives | GOALS-OBJ | 88% RFPs, standardized |
| 6 | Evaluation Plan | EVAL | 85% RFPs, writers feel uncertain |
| 7 | Organization Background | ORG-BG | 83% RFPs, institutional memory |
| 8 | Population Served | POP-SERVED | 75% RFPs, equity filter needed |
| 9 | Theory of Change | LOGIC-MODEL | 48% RFPs, most confusing section |
| 10 | Equity Statement | EQUITY | 43% RFPs, fastest growing |

**Phase 2 additions** (v1.1, post-beta):
- SUSTAIN, ORG-CAP, COMMUNITY-ENG, PARTNER, GEO-DESC, ORG-FIN-HEALTH, LOI-OPEN, REPORT-NAR

---

## Block Variant System

Each block supports **multiple variants** per org, tagged by:
- **Word count range** (micro / brief / standard / expanded / comprehensive)
- **Funder type** (government / private foundation / community foundation / corporate)
- **Focus area** (arts / environment / human services / housing / youth / etc.)

**Example: ORG-MISSION for a youth arts org**
```
ORG-MISSION-MICRO-25w:    "Bay Area Youth Arts Collective builds creative confidence in 
                           Oakland youth through free after-school arts programs."

ORG-MISSION-BRIEF-100w:   [Micro + founding year, geography, scale, one outcome stat]

ORG-MISSION-STD-175w:     [Brief + key programs, community context, theory of change sentence]

ORG-MISSION-GOVT-300w:    [Standard + organizational structure, governance, capacity signals]
```

---

## Community Vetting Process (Block Quality Standards)

**For community-seeded blocks:**
1. **Source** — pulled from actual funded proposals (with org permission) or written by experienced grant writers
2. **Review** — minimum 1 experienced grant writer QA pass
3. **Endorsement** — tagged when reviewed by a program officer or funder
4. **Usage signal** — block rating improves with positive outcomes (when user marks a proposal "submitted" or "awarded")
5. **Freshness check** — flag blocks >18 months old for org review

**Quality badges:**
- ⭐ Community-vetted (reviewed by grant writer)
- 🏆 Award-linked (org reported win using this block)
- 🔄 Recently updated (within 6 months)
- ⚠️ Needs review (flagged as outdated by org)

---

## Variable Field Conventions

All variable fields follow this naming pattern:
- `{{snake_case_name}}` — required fill-in
- `{{snake_case_name?}}` — optional fill-in
- `{{CONSTANT_NAME}}` — pulled from org profile automatically

**Org profile auto-fills:**
- `{{ORG_NAME}}` — from organization profile
- `{{EIN}}` — from organization profile
- `{{ORG_ADDRESS}}` — from organization profile
- `{{ED_NAME}}` — from organization profile
- `{{ANNUAL_BUDGET}}` — from organization profile
- `{{PRIMARY_GEOGRAPHY}}` — from organization profile
- `{{FOCUS_AREA_1}}` — from organization profile tags

---

## Implementation Notes for Engineering

### Database schema (Supabase)
```sql
CREATE TABLE proposal_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  block_type TEXT NOT NULL,  -- 'ORG-MISSION', 'NEED-COMM', etc.
  variant TEXT NOT NULL,     -- 'micro', 'brief', 'standard', 'expanded'
  title TEXT,
  content TEXT NOT NULL,
  word_count INTEGER,
  funder_tags TEXT[],        -- ['government', 'private-foundation', etc.]
  focus_tags TEXT[],         -- ['arts', 'youth', 'environment', etc.]
  variable_fields JSONB,     -- filled variable values
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  quality_badges TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE block_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES proposal_blocks(id),
  content TEXT NOT NULL,
  version INTEGER,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  change_note TEXT
);
```

### Block library UX principles
1. **Always show word count** — most common query is "which version is under 150 words?"
2. **Variant toggle** — micro/brief/standard/expanded toggle on every block
3. **Variable field highlighting** — unfilled `{{fields}}` highlighted in yellow
4. **Version history** — simple "last updated X days ago" + expand to see changes
5. **Usage count** — "used in 7 proposals" signals trustworthiness
