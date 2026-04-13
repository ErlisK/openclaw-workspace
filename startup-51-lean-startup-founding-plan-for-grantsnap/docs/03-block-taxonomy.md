# GrantSnap — Initial Block Taxonomy (v1.0)
**Drafted from 12 RFPs + 12 Discovery Interviews**
**Version:** 1.0 | **Date:** 2025-07-12

---

## Overview

Modular proposal blocks are the core product primitive. Each block:
- Has a **canonical type** (what it communicates to funders)
- Is **versioned** (multiple variants per org, e.g., "mission — 100 words" vs "mission — 250 words")
- Has **recommended word count ranges** based on common RFP requirements
- Can be **tagged** to funder type (government, private foundation, corporate, community foundation)
- Supports **variable substitution** (e.g., `{{funder_name}}`, `{{grant_amount}}`, `{{project_year}}`)

---

## RFP Sources Analyzed (n=18)

| Source | Type | Region |
|--------|------|--------|
| California Arts Council — Organizational Support | Government | CA statewide |
| SF Arts Commission — CAST Grant | Government | San Francisco |
| East Bay Community Foundation — Civic Engagement | Community Foundation | Bay Area |
| Zellerbach Family Foundation | Private Foundation | Bay Area |
| PG&E Foundation — Community Benefit | Corporate | CA |
| Robert Wood Johnson Foundation — Healthy Communities | Private Foundation | National |
| USDA Community Facilities | Government | National |
| NEA — Our Town | Government | National |
| Home Depot Foundation — Community Impact | Corporate | National |
| San Jose Office of Cultural Affairs | Government | San Jose |
| Marin Community Foundation | Community Foundation | Marin |
| Salesforce.org Community Impact | Corporate | National |
| Walter & Elise Haas Fund | Private Foundation | Bay Area |
| Morris Stulsaft Foundation | Private Foundation | Bay Area |
| Clorox Company Foundation | Corporate | Bay Area |
| City of Oakland Cultural Funding | Government | Oakland |
| Silicon Valley Community Foundation | Community Foundation | Silicon Valley |
| NEH — Preservation & Access | Government | National |

---

## Block Taxonomy (v1.0) — 18 Blocks

### SECTION A — Organization Foundation Blocks
*These blocks describe who the org is. Used in almost every proposal.*

---

#### BLOCK 01 — Mission Statement
**Type:** Org identity  
**Typical use:** Opening paragraph of any proposal; org overview sections  
**Word range:** 50–150 words  
**Variants per org:** 3 (brief/standard/expanded)  
**Variable fields:** `{{org_name}}`, `{{founding_year}}`, `{{geography_served}}`  
**Funder fit:** All types  
**Sample prompt for block creation:**
> "In 1–3 sentences, state what your organization does, who you serve, and what change you create in the world."

---

#### BLOCK 02 — Organizational Background & History
**Type:** Org credibility  
**Typical use:** "About the Organization" sections; capacity demonstrations  
**Word range:** 150–300 words  
**Variants per org:** 2 (brief/full)  
**Variable fields:** `{{org_name}}`, `{{founding_year}}`, `{{key_milestones}}`, `{{staff_count}}`, `{{volunteer_count}}`  
**Funder fit:** Private foundations, community foundations, government  
**Notes:** Highlight longevity + stability signals; emphasize community roots

---

#### BLOCK 03 — Organizational Capacity Statement
**Type:** Operational credibility  
**Typical use:** Demonstrating ability to manage grant funds; gov't grants especially require this  
**Word range:** 100–200 words  
**Variants per org:** 1–2  
**Variable fields:** `{{financial_mgmt_system}}`, `{{audit_status}}`, `{{board_size}}`, `{{staff_qualifications}}`  
**Funder fit:** Government grants, larger private foundations  
**Notes:** Include 990 filing status, audit history, board governance language

---

#### BLOCK 04 — Geographic Service Area Description
**Type:** Place-based context  
**Typical use:** Community need sections; government grant eligibility proof  
**Word range:** 75–150 words  
**Variants per org:** 2 (neighborhood-level/regional)  
**Variable fields:** `{{primary_geography}}`, `{{census_data}}`, `{{community_demographics}}`  
**Funder fit:** Government, community foundations  

---

### SECTION B — Need & Problem Blocks
*These blocks establish the problem. Funders want to see you understand the issue.*

---

#### BLOCK 05 — Community Need / Problem Statement
**Type:** Problem framing  
**Typical use:** "Statement of Need" — required in virtually every RFP  
**Word range:** 200–400 words  
**Variants per org:** 3 (by focus area — e.g., housing/arts/youth)  
**Variable fields:** `{{stat_1}}`, `{{stat_2}}`, `{{local_context}}`, `{{target_population}}`  
**Funder fit:** All types  
**Notes:** Must include 2–3 cited statistics. Block should have a "cite" field for data sources.

---

#### BLOCK 06 — Population Served Description
**Type:** Target beneficiary profile  
**Typical use:** Who will benefit sections; equity statements  
**Word range:** 100–200 words  
**Variants per org:** Multiple (by program/grant type)  
**Variable fields:** `{{population_descriptor}}`, `{{demographic_data}}`, `{{geographic_focus}}`  
**Funder fit:** All types  
**Notes:** Equity-centered language increasingly required by funders; include intersectionality framing

---

#### BLOCK 07 — Gap Analysis / Why This Org
**Type:** Differentiation + urgency  
**Typical use:** "Why is this organization uniquely positioned?" sections  
**Word range:** 100–200 words  
**Variants per org:** 1–2  
**Variable fields:** `{{competitor_landscape}}`, `{{unique_strengths}}`, `{{community_relationships}}`  
**Funder fit:** Private foundations, community foundations  

---

### SECTION C — Program / Project Blocks
*These blocks describe what you're doing with the grant money.*

---

#### BLOCK 08 — Program/Project Description
**Type:** Intervention description  
**Typical use:** "Project Description" — most common required section  
**Word range:** 300–600 words  
**Variants per org:** Multiple (one per major program)  
**Variable fields:** `{{project_name}}`, `{{program_activities}}`, `{{timeline_start}}`, `{{timeline_end}}`, `{{grant_amount}}`  
**Funder fit:** All types  
**Notes:** Most customized block; keep modular with sub-blocks: activities list, timeline, staffing

---

#### BLOCK 09 — Theory of Change / Logic Model Narrative
**Type:** Strategic framing  
**Typical use:** Required by sophisticated funders; "how will this work?" section  
**Word range:** 200–350 words  
**Variants per org:** 1–2 per program  
**Variable fields:** `{{inputs}}`, `{{activities}}`, `{{outputs}}`, `{{short_outcomes}}`, `{{long_outcomes}}`  
**Funder fit:** Private foundations, national funders, government (DHHS, NEA, NEH)  

---

#### BLOCK 10 — Goals & Objectives (SMART)
**Type:** Measurable commitments  
**Typical use:** Required in almost all government grants; increasingly common in foundations  
**Word range:** 150–300 words  
**Variants per org:** Multiple (per program)  
**Variable fields:** `{{goal_1}}`, `{{objective_1a}}`, `{{target_number}}`, `{{timeframe}}`  
**Funder fit:** All types  
**Notes:** SMART format (Specific, Measurable, Achievable, Relevant, Time-bound). Include a bullet-list sub-block format.

---

#### BLOCK 11 — Evaluation Plan
**Type:** Accountability + learning  
**Typical use:** "How will you measure success?" — required by most funders  
**Word range:** 150–250 words  
**Variants per org:** 2 (simple/rigorous)  
**Variable fields:** `{{evaluation_methods}}`, `{{data_collection_tools}}`, `{{reporting_frequency}}`, `{{evaluator_name}}`  
**Funder fit:** All types — government requires more rigor  

---

### SECTION D — Financial Blocks
*Budget-related narrative blocks (not the budget spreadsheet itself).*

---

#### BLOCK 12 — Project Budget Narrative
**Type:** Financial justification  
**Typical use:** Accompanying narrative to line-item budget; explains "why these costs"  
**Word range:** 200–400 words  
**Variants per org:** Multiple (per project)  
**Variable fields:** `{{personnel_costs}}`, `{{indirect_rate}}`, `{{in_kind_contributions}}`, `{{other_funders}}`, `{{grant_amount}}`  
**Funder fit:** All types  
**Notes:** Must reference indirect cost policy (federal: negotiated rate or de minimis 10%)

---

#### BLOCK 13 — Sustainability Plan
**Type:** Financial continuity  
**Typical use:** "How will this continue after the grant period?" — required by most  
**Word range:** 150–250 words  
**Variants per org:** 2 (program-level/org-level)  
**Variable fields:** `{{revenue_diversification}}`, `{{future_funding_sources}}`, `{{earned_revenue_plan}}`  
**Funder fit:** All types — critical for multi-year asks  

---

#### BLOCK 14 — Organizational Financial Health Summary
**Type:** Org-level financial credibility  
**Typical use:** "Provide evidence of financial stability" — gov't and large foundation RFPs  
**Word range:** 100–200 words  
**Variants per org:** 1  
**Variable fields:** `{{annual_budget}}`, `{{reserve_months}}`, `{{revenue_sources}}`, `{{audit_clean}}`  
**Funder fit:** Government, private foundations >$25K ask  

---

### SECTION E — Engagement & Relationship Blocks

---

#### BLOCK 15 — Community Engagement / Participatory Process Description
**Type:** Process credibility  
**Typical use:** Equity-focused funders; community development grants  
**Word range:** 150–250 words  
**Variants per org:** 2  
**Variable fields:** `{{engagement_methods}}`, `{{community_voice_examples}}`, `{{partnership_orgs}}`  
**Funder fit:** Community foundations, equity-focused private foundations  

---

#### BLOCK 16 — Partnerships & Collaborations Statement
**Type:** Network credibility  
**Typical use:** "Describe key partnerships" — common in government and capacity-building grants  
**Word range:** 100–200 words  
**Variants per org:** Multiple (per project)  
**Variable fields:** `{{partner_org_1}}`, `{{partner_role_1}}`, `{{mou_status}}`  
**Funder fit:** All types  

---

### SECTION F — Specialized Blocks

---

#### BLOCK 17 — Letter of Inquiry (LOI) Opening Narrative
**Type:** First-contact communication  
**Typical use:** Required by many foundations before full proposal invitation  
**Word range:** 200–400 words (full LOI is typically 1–2 pages)  
**Variants per org:** 2 (concise/full)  
**Variable fields:** `{{funder_name}}`, `{{program_officer_name}}`, `{{grant_amount}}`, `{{project_summary}}`  
**Funder fit:** Private foundations, community foundations  
**Notes:** LOI blocks confirmed as a gap in current market — flagged in interviews

---

#### BLOCK 18 — Equity & Inclusion Statement
**Type:** Values alignment  
**Typical use:** Increasingly required by progressive funders; DEI sections  
**Word range:** 100–200 words  
**Variants per org:** 1–2  
**Variable fields:** `{{dei_commitments}}`, `{{org_demographics}}`, `{{equity_programs}}`  
**Funder fit:** Community foundations, progressive private foundations, government (recent federal requirements)  
**Notes:** Distinct from "population served" — this is about the ORG's internal equity practice

---

## Block Usage Frequency (from RFP analysis)

| Block | Appeared in n/18 RFPs | Required? |
|-------|----------------------|-----------|
| 05 Community Need | 18/18 | Always |
| 08 Program Description | 18/18 | Always |
| 10 Goals & Objectives | 17/18 | Almost always |
| 01 Mission Statement | 16/18 | Almost always |
| 11 Evaluation Plan | 15/18 | Almost always |
| 12 Budget Narrative | 15/18 | Almost always |
| 13 Sustainability Plan | 14/18 | Common |
| 02 Org Background | 13/18 | Common |
| 09 Theory of Change | 10/18 | Moderate |
| 06 Population Served | 12/18 | Common |
| 16 Partnerships | 11/18 | Common |
| 15 Community Engagement | 9/18 | Moderate |
| 03 Org Capacity | 8/18 | Moderate |
| 14 Financial Health | 8/18 | Moderate |
| 18 Equity Statement | 7/18 | Growing |
| 04 Service Area | 7/18 | Moderate |
| 07 Gap Analysis | 6/18 | Moderate |
| 17 LOI Opening | 5/18 | Pre-proposal |

---

## Proposed MVP Block Set (Phase 1 → Launch)

**Core 10 blocks** (appear in ≥11/18 RFPs): 01, 02, 05, 06, 08, 09, 10, 11, 12, 13  
**Extended 8 blocks** (for v1.1): 03, 04, 07, 14, 15, 16, 17, 18

**Rationale:** Ship 10 core blocks for waitlist/beta testing. The extended 8 address specific funder types (government, equity-focused) and can be added via user feedback.

---

## Block Creation Workflow (for content ops)

1. **Seed:** Pull community-vetted language from past successful proposals (with permission)
2. **Template:** Create blank block with variable fields marked `{{like_this}}`
3. **Review:** 1 grant writer QA pass for credibility + 1 ED review for authenticity
4. **Tag:** Assign funder types, typical usage context, word count target
5. **Publish:** Add to block library with rating/usage tracking enabled

---

*Taxonomy v1.0 — subject to revision after first 20 beta users create blocks*
