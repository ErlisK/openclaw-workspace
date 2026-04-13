# KidColoring — Prioritized Product Backlog
## Phase 2: Define · DFV × Assumption Criticality Framework

> **Scoring method:** Each item scored on Desirability (D), Feasibility (F), Viability (V), and Assumption Criticality (A).  
> **Priority Score = (D + F + V) × A** — high score = build first.  
> Assumption Criticality: 5 = this feature cannot ship without testing this assumption; 1 = assumption is already validated.

---

## Scoring Legend

| Score | D (Desirability) | F (Feasibility) | V (Viability) |
|-------|-----------------|-----------------|---------------|
| 5 | Users will abandon without it | Buildable in 1–2 sprints | Direct revenue driver |
| 4 | Users strongly prefer it | Buildable in 3–4 sprints | Enables premium pricing |
| 3 | Nice-to-have | 1–2 months of work | Indirect revenue |
| 2 | Low user demand | Requires significant R&D | Operational only |
| 1 | No evidence of demand | Research-phase only | Cost center |

---

## Tier 1: MVP Core — Must Ship Before Any Public Beta

These items are load-bearing. Without them, the product cannot function.

| # | Feature | D | F | V | A | Score | Assumption |
|---|---------|---|---|---|---|-------|------------|
| 1 | **Story input wizard** (guided questions: character, setting, action) | 5 | 4 | 5 | 5 | **70** | A1: wizard > blank field |
| 2 | **AI generation pipeline** (story → 12 coloring pages) | 5 | 3 | 5 | 5 | **65** | B1: 60s generation; A3: consistency |
| 3 | **Print-quality PDF output** (300 DPI, vector paths, 8.5×11) | 5 | 4 | 5 | 5 | **70** | B2: print quality = top complaint |
| 4 | **Preview before purchase** (2 pages, watermarked) | 5 | 5 | 5 | 5 | **75** | D1: preview drives conversion |
| 5 | **Content safety filter** (pre-generation text classifier) | 5 | 4 | 5 | 5 | **70** | C2: safety filter ≥99.5% |
| 6 | **Age-calibrated line weight** (3yo=5pt lines, 7yo=2pt, 10yo=1pt) | 5 | 4 | 4 | 4 | **52** | Research-validated: 86 snippets |
| 7 | **Stripe checkout** ($9.99 single, first book free) | 5 | 4 | 5 | 4 | **56** | D1: pricing assumption |
| 8 | **PDF download delivery** (immediate post-payment) | 5 | 5 | 5 | 5 | **75** | D1: instant delivery is the product |
| 9 | **COPPA compliance** (parent account, no child login, data minimization) | 5 | 3 | 5 | 5 | **65** | C1: COPPA badge drives conversion |
| 10 | **Child name on cover + page headers** | 5 | 5 | 4 | 4 | **56** | Validated: 143 personalization snippets |

**MVP Definition:** Items 1–10 constitute the minimum viable product. The product cannot launch without all 10.

---

## Tier 2: Launch Enhancers — Ship with or Shortly After Launch

These items dramatically improve conversion and retention but the product can technically function without them.

| # | Feature | D | F | V | A | Score | Assumption |
|---|---------|---|---|---|---|-------|------------|
| 11 | **Character consistency across pages** (LoRA fine-tune or reference sheet) | 4 | 2 | 5 | 5 | **55** | A3: consistency = refund driver |
| 12 | **A/B pricing test infrastructure** ($7.99/$9.99/$12.99 variant routing) | 3 | 4 | 5 | 5 | **60** | D1: optimal price unknown |
| 13 | **Post-download satisfaction rating** (1–5 stars, optional text) | 3 | 5 | 4 | 4 | **48** | A2, B2: engagement + print quality |
| 14 | **COPPA badge placement A/B test** (above fold vs footer) | 3 | 5 | 4 | 4 | **48** | C1: badge = conversion driver |
| 15 | **Party pack product** (1 story → 20 copies, $39 bundle) | 4 | 4 | 5 | 5 | **65** | D2: party pack K-factor |
| 16 | **Referral code generation** (unique code per purchaser) | 3 | 4 | 5 | 5 | **60** | D2: referral K-factor test |
| 17 | **Email delivery** (PDF to email, no download link dependency) | 4 | 4 | 4 | 4 | **48** | Print quality: email to home printer |
| 18 | **Generation progress UI** (page-by-page streaming, not spinner) | 4 | 4 | 3 | 4 | **44** | B1: abandonment at 90s |
| 19 | **Print instructions PDF insert** (printer settings, paper type guide) | 3 | 5 | 3 | 4 | **44** | B2: home printer variance |
| 20 | **Child profile** (save nickname + age for repeat books) | 4 | 4 | 4 | 3 | **36** | Convenience, low-risk |

---

## Tier 3: Retention & Growth — Build After First 100 Paid Users

| # | Feature | D | F | V | A | Score | Assumption |
|---|---------|---|---|---|---|-------|------------|
| 21 | **Subscription plan** ($9.99/mo unlimited books) | 4 | 4 | 5 | 5 | **65** | D3: subscription timing |
| 22 | **Subscription upsell prompt** (A/B: post-1st vs start-of-2nd book) | 3 | 5 | 5 | 5 | **65** | D3: prompt timing |
| 23 | **Book history dashboard** (view/re-download past books) | 3 | 4 | 3 | 2 | **20** | Low assumption risk |
| 24 | **Story template gallery** (10 starter stories by age/interest) | 3 | 5 | 3 | 2 | **22** | Reduces blank-page anxiety |
| 25 | **Post-download share prompt** (Instagram/WhatsApp/link copy) | 3 | 5 | 4 | 4 | **48** | D2: viral loop activation |
| 26 | **30-day coloring survey** ("how long did your child color?") | 2 | 5 | 3 | 5 | **50** | A2: engagement duration test |
| 27 | **48-hour print quality survey** ("how did it print?") | 2 | 5 | 3 | 5 | **50** | B2: print quality test |
| 28 | **Repeat purchase reminder email** (7-day + 30-day post-download) | 3 | 5 | 5 | 3 | **39** | Validated retention pattern |
| 29 | **Birthday/holiday seasonal templates** | 3 | 4 | 4 | 2 | **22** | Research: 55K/mo birthday searches |
| 30 | **Multi-child household support** (up to 3 child profiles) | 3 | 3 | 4 | 2 | **20** | Convenience; medium viability |

---

## Tier 4: Teacher Channel — Build After Product-Market Fit Confirmed

| # | Feature | D | F | V | A | Score | Assumption |
|---|---------|---|---|---|---|-------|------------|
| 31 | **Teacher hub** (curriculum topic + grade level input fields) | 4 | 4 | 5 | 4 | **52** | E1: teacher habit formation |
| 32 | **Classroom pack** (24-book class set, $20/month teacher pricing) | 4 | 4 | 5 | 4 | **52** | Teacher pricing elasticity |
| 33 | **COPPA + FERPA certification** (iKeepSafe, ~$5K) | 5 | 3 | 5 | 5 | **65** | C1: unlocks school channel |
| 34 | **Google Classroom integration** (SSO via Google Workspace) | 3 | 3 | 5 | 3 | **33** | Distribution, not product |
| 35 | **Sunday planning mode** (batch-generate week's activities at once) | 3 | 4 | 4 | 4 | **44** | E1: Sunday session rate |
| 36 | **School district licensing** (per-student pricing, admin portal) | 3 | 2 | 5 | 3 | **30** | Long sales cycle; defer |
| 37 | **Curriculum standard tagging** (NGSS, CCSS aligned) | 3 | 3 | 4 | 3 | **30** | Teacher trust; medium priority |
| 38 | **Student name personalization** (24 unique name-stamped PDFs) | 4 | 4 | 4 | 3 | **36** | Research: teacher uses names |

---

## Tier 5: Physical & Premium — Post $10K MRR

| # | Feature | D | F | V | A | Score | Assumption |
|---|---------|---|---|---|---|-------|------------|
| 39 | **Print-on-demand upsell** (Lulu Direct integration, $18-22 shipped) | 4 | 3 | 5 | 3 | **36** | Physical demand: 49 snippets |
| 40 | **Coloring completion photo share** ("Emma finished her book!") | 3 | 4 | 4 | 3 | **33** | Social proof loop |
| 41 | **Mobile app** (iOS, App Store Kids category) | 4 | 2 | 5 | 3 | **33** | Distribution; COPPA required |
| 42 | **Voice story input** (child speaks story, transcribed) | 4 | 2 | 4 | 4 | **40** | A1 variant; high feasibility risk |
| 43 | **Custom character illustration** (parent describes character appearance) | 3 | 2 | 4 | 4 | **36** | A3 variant; hard technically |
| 44 | **Coloring video** (animated version of the coloring book) | 2 | 1 | 3 | 2 | **12** | Low feasibility; deprioritize |

---

## Sprint Allocation (First 8 Weeks)

### Sprint 1–2 (Weeks 1–2): Core Generation Pipeline
- Item 2: AI generation pipeline (initial model selection, prompt engineering)
- Item 5: Content safety filter (OpenAI moderation + custom rules)
- Item 6: Age-calibrated line weight (post-processing filter)
- **Assumption tested:** B1 (speed), C2 (safety), A3 (consistency baseline)

### Sprint 3–4 (Weeks 3–4): Input UX + Output Quality
- Item 1: Story input wizard (4-step guided form)
- Item 3: Print-quality PDF generation (300 DPI, vector paths)
- Item 10: Child name on cover + page headers
- **Assumption tested:** A1 (wizard), B2 (print quality)

### Sprint 5–6 (Weeks 5–6): Conversion Flow
- Item 4: Preview before purchase (2-page watermarked preview)
- Item 7: Stripe checkout ($9.99 single book)
- Item 8: PDF download delivery
- Item 9: COPPA compliance (parent account, data minimization)
- **Assumption tested:** D1 (pricing), B1 (preview load time)

### Sprint 7–8 (Weeks 7–8): Measurement + Growth Hooks
- Item 12: A/B pricing test infrastructure
- Item 14: COPPA badge A/B
- Item 15: Party pack product
- Item 16: Referral code generation
- Item 13: Satisfaction rating prompt
- **Assumption tested:** D1 (pricing), C1 (COPPA badge), D2 (party pack)

---

## Backlog Prioritization Matrix (Visual)

```
HIGH FEASIBILITY
        │
   [8] PDF   [4] Preview    [13] Rating
   [10] Name  [14] COPPA A/B [7] Checkout
        │
────────┼──────────────────────────────── HIGH VIABILITY
        │
   [11] Char. [15] Party     [21] Sub plan
   Consistency Pack           [33] FERPA
        │
   [2] AI     [9] COPPA      [1] Wizard
   Pipeline   Compliance     [3] Print PDF
LOW FEASIBILITY
```

**Top-right quadrant** (High F + High V) = Build first (items 4, 7, 8, 13, 14)  
**Bottom-right quadrant** (Low F + High V) = Invest in R&D (items 2, 9, 11)  
**Top-left quadrant** (High F + Low V) = Quick wins for retention (items 23, 28)  
**Bottom-left quadrant** (Low F + Low V) = Defer or drop (items 44, 41)

---

## Assumption Criticality Summary

Before shipping any item, these are the assumptions that must be tested in order:

1. **C2 — Safety filter ≥99.5%** → Red-team 200 prompts (Week 1, offline)
2. **B1 — First page < 60s at p95** → Infrastructure benchmarking (Week 2)
3. **B2 — Print quality** → Print test on 10 common home printers (Week 3)
4. **A3 — Character consistency** → Generate 5 × 12-page books, rate consistency (Week 4)
5. **A1 — Story wizard** → Build both variants, 50-submission A/B (Week 5–6)
6. **D1 — Pricing** → 3-price landing page, 1,000 visitors (Week 7–8)
7. **C1 — COPPA badge placement** → 500-visitor A/B (Week 7–8)
8. **D2 — Party pack K-factor** → Embed referral code in first 20 party packs (Week 8+)
9. **D3 — Subscription timing** → A/B at 500 returning users (post-launch)
10. **A2 — Engagement duration** → 30-day survey, 200-book cohort (post-launch)

---

*Scoring based on 507 research snippets, Phase 1 competitor analysis, persona storyboards, and Phase 2 POV/HMW framework*  
*Schema migration v0 implements measurement infrastructure for all testable assumptions*
