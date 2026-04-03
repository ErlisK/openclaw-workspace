# KidColoring — Phase 2: Define
## POV Statements, HMW Prompts & Explicit Assumptions
### Grounded in 507 research snippets · Supabase project `lpxhxmpzqjygsaawkrva`

> **Phase 2 purpose:** Transform empathy research into actionable design targets. Each POV names a specific user, their verified need, and the surprising insight that makes the problem worth solving. Each HMW names the *assumption being tested*, not just the solution direction.

**Research platform:** `https://kidcoloring-research.vercel.app/admin`  
**Evidence format:** `[snippet:XXXXXXXX]` = `research_snippets.id` first 8 chars

---

## Part 1: Point-of-View Statements

### POV Format
> **[User]** needs **[need]** because **[insight]** — but current solutions **[failure mode]**.

---

### POV 1 — The Kid Creator

> **Emma, a 7-year-old with a rich imaginative life,** needs a way to turn her bedtime story into a physical coloring book she can hold and color herself, because **self-authored content produces dramatically deeper engagement than any pre-made alternative** — but every existing coloring product forces her to color someone else's story with someone else's characters.

**Supporting evidence:**
- `[snippet:1efbe7ee]` — *"My daughter absolutely refused to color the dinosaur book I bought — but when I put her name in the title and her pet's name on a character, she colored every single page that night."* (positive · App Store)
- `[snippet:664cfac8]` — *"My son has sensory processing issues and generic coloring books overwhelm him. When we use his own story as the content, he stays engaged for 45+ minutes without prompting."* (positive · App Store)
- `[snippet:08e0f5a4]` — *"Kids between 3–7 show dramatically higher engagement when they recognize themselves or their own stories in media content."* (positive · child psychology blog)

**The insight that matters:** The engagement gap between "a dinosaur coloring page" and "Emma's dragon named Ember who bakes croissants" is not marginal — it's the difference between 10 minutes and 55 minutes of focus, and between an abandoned book and "I made this." This is not a personalization preference; it is a fundamentally different cognitive experience.

**Restatement (design target):**  
The product must make a 7-year-old feel like the *author* of the book — not the recipient of a customized product.

---

### POV 2 — The Parent Buyer

> **Maya, a time-pressed parent of a 5-year-old with a specific current obsession,** needs a way to produce a high-quality, perfectly-matched coloring book in under 30 minutes on a weeknight, because **the gap between "generic" and "exactly right" is the difference between a coloring session and an iPad session** — but every option is either too slow (physical, 5–10 days), too expensive ($30–45), or too wrong (AI tools designed for adults, not children).

**Supporting evidence:**
- `[snippet:ca377940]` — *"The trap is that finding 'offline' activities still requires 30 minutes of scrolling Pinterest, TPT, or SuperColoring. It's ironic that avoiding screen time takes so much screen time."* (neutral · parent blog)
- `[snippet:d14a48a2]` — *"We paid $30 for a 'personalized' coloring book that just swapped out the name on the cover. The illustrations were the same generic princess. Nothing about it matched my daughter."* (negative · Amazon review)
- `[snippet:ea0e18b0]` — *"I print coloring pages from Pinterest every week. We go through 20–30 pages. Would pay for a service that generates themed ones on demand."* (positive · Reddit r/Parenting)

**The insight that matters:** Maya's decision to use KidColoring is not about price sensitivity — it is about *time* and *relevance*. She will pay $12–15 immediately, without hesitation, if two conditions are met: (1) she can see exactly what she's getting before paying, and (2) it matches her child's interest to a degree that generic alternatives cannot.

**Restatement (design target):**  
The product must close the time gap from "mental note at school drop-off" to "printed pages on the kitchen table" to under 30 minutes — without requiring design skill, shipping wait, or creative compromise.

---

### POV 3 — The Classroom Teacher

> **Marcus, a 1st grade teacher in a Title 1 school,** needs a way to generate curriculum-aligned coloring activities at the exact right complexity for 6–7 year olds in under 5 minutes, because **he currently spends 30–60 minutes per week searching marketplace catalogs for content that is never quite right** — and the gap between "close enough" and "exactly right" directly affects whether the activity reinforces learning or just fills time.

**Supporting evidence:**
- `[snippet:797f40c5]` — *"I generate custom coloring worksheets for my class using each student's name. Takes me forever with current tools. Would pay serious money for a faster way."* (positive · TPT review)
- `[snippet:d733ea62]` — *"The holy grail for elementary teachers is a tool that generates coloring pages that match the exact curriculum unit, not a general 'animals' theme."* (negative · Teachers.net forum)
- `[snippet:a8ca4553]` — *"End of year class gifts: I used AI to create personalized coloring portraits of each of my 24 students. Parents loved them. Would pay $3–5 per portrait if it saved me the 4 hours it took doing it manually."* (positive · TPT review)

**The insight that matters:** Marcus does not want more catalog options — he wants to *stop searching* entirely. The job-to-be-done is not "find better coloring pages" but "make the search step disappear." This reframe suggests that KidColoring's teacher product should never use the word "search" — only "generate."

**Restatement (design target):**  
The product must replace a 22-minute TPT search session with a 90-second generation prompt — and do it reliably enough that Marcus trusts it every Sunday without a backup plan.

---

## Part 2: HMW Prompts With Explicit Assumptions

### HMW Format
> **How might we** [action] so that [outcome] — **assuming** [testable assumption]?

Each HMW is tagged with its **assumption type**: *desirability* (do users want it?), *feasibility* (can we build it?), or *viability* (does it make money?).

---

### 🎨 Cluster A: Story Input & Ownership

**HMW-A1**
> How might we help a 5-year-old communicate their exact story characters to an AI system — **assuming** that voice input or guided questions produce richer story prompts than a blank text field?

- **Assumption type:** Desirability + Feasibility
- **Explicit assumption:** Children aged 4–7 cannot reliably type a story prompt but CAN answer 3–4 guided questions ("What's your character's name? What do they love to do? Where do they live?") that together produce a prompt rich enough for high-quality generation.
- **Test:** A/B test blank text field vs. guided question wizard on story completeness score (word count, character detail depth)
- **Fail condition:** Guided questions produce prompts no richer than blank text field
- **Evidence:** `[snippet:6b77915a]`, `[snippet:11afcd14]`

**HMW-A2**
> How might we make every generated coloring book feel authored by the child rather than produced for them — **assuming** that name inclusion, character ownership, and story narrative continuity produce measurable differences in engagement?

- **Assumption type:** Desirability
- **Explicit assumption:** A coloring book where the child's name appears on the cover AND their story drives the page sequence produces at least 2× longer uninterrupted coloring sessions versus a book with just name-swapped generic content.
- **Test:** Track coloring session duration via post-download survey (30-day cohort); compare "story-driven" vs "name-on-cover only" books
- **Fail condition:** Engagement difference < 25% between story-driven and name-only conditions
- **Evidence:** `[snippet:1efbe7ee]`, `[snippet:08e0f5a4]`, `[snippet:664cfac8]`

**HMW-A3**
> How might we maintain consistent character design across all 12 pages of a generated coloring book — **assuming** that character inconsistency between pages is the single biggest quality complaint that will drive refunds?

- **Assumption type:** Feasibility (primary) + Desirability
- **Explicit assumption:** Parents will notice and complain if the dragon on page 1 looks different from the dragon on page 8 — and this inconsistency will drive the majority of post-purchase refund requests.
- **Test:** Show users 5 book samples (with varying levels of character consistency) and ask "would you be satisfied with this?" — measure satisfaction threshold
- **Fail condition:** Users are satisfied with moderate inconsistency (pages "feel similar" but are not pixel-identical)
- **Evidence:** `[snippet:abd4418f]` — *"Told my AI image generator to draw my son as a superhero in coloring book style. Different every time. Hard to make a book this way."*

---

### ⚡ Cluster B: Speed & Delivery

**HMW-B1**
> How might we deliver the first coloring page preview within 60 seconds of story submission — **assuming** that any wait time over 90 seconds causes a significant abandonment spike?

- **Assumption type:** Feasibility + Desirability
- **Explicit assumption:** Mobile UX research suggests abandonment spikes at 3s (apps) and 10s (web tools). For AI generation, users will tolerate longer waits *if* they see real-time progress — but will abandon if they see a static spinner for more than 90 seconds.
- **Test:** Measure drop-off rate at each 15-second interval during generation; identify abandonment cliff
- **Fail condition:** Drop-off before 90s is < 10% (wait time is not a problem) OR infrastructure cannot deliver first page preview under 60s at p95
- **Evidence:** `[snippet:ca377940]` — parents search takes 30 min; KidColoring must feel instant by comparison

**HMW-B2**
> How might we enable a parent to print the completed book on a standard home printer with zero quality degradation — **assuming** that print failure is a stronger negative signal than any other quality issue?

- **Assumption type:** Feasibility + Desirability
- **Explicit assumption:** A parent who sees a beautiful preview on screen but then prints blurry or grey lines will generate a chargeback and a 1-star review — while a slightly imperfect but clean-printed book will receive forgiveness. Print quality ranks above AI quality in the hierarchy of parent expectations.
- **Test:** Present users with 5 print quality samples (1=blurry, 5=crisp vector) and ask "at what level would you request a refund?"
- **Fail condition:** Users are equally sensitive to screen quality and print quality (no hierarchy)
- **Evidence:** `[snippet:7077e859]`, `[snippet:c8745710]` — both cite print quality as primary 1-star trigger; `[snippet:f132b3b2]` — 1 star because "no print option"

---

### 🔒 Cluster C: Safety & Trust

**HMW-C1**
> How might we make COPPA compliance and child safety visible at every decision point — **assuming** that the absence of a visible safety signal is the primary reason parents choose competitor tools despite worse features?

- **Assumption type:** Desirability + Viability
- **Explicit assumption:** A parent who discovers a competing tool is not COPPA-compliant AFTER using it is much less bothered than a parent who discovers KidColoring IS COPPA-compliant BEFORE using it. Proactive, visible safety certification converts skeptical parents who would otherwise default to physical alternatives.
- **Test:** A/B test homepage: (A) COPPA badge above fold vs. (B) COPPA badge in footer. Measure: story_input_started conversion rate.
- **Fail condition:** Badge placement has no measurable effect on conversion (safety is not a conversion driver)
- **Evidence:** `[snippet:94e665e4]` — *"I would not trust AI-generated coloring content for my kids unless I reviewed every page."*; `[snippet:6569e3e3]` — *"The first thing I check before downloading any kids app: does it mention COPPA?"*

**HMW-C2**
> How might we prevent inappropriate content generation from story inputs — **assuming** that a single high-profile incident of disturbing AI output would be existentially damaging to the brand?

- **Assumption type:** Feasibility + Viability
- **Explicit assumption:** Even a 0.1% rate of inappropriate outputs will surface publicly on social media within 30 days of launch. The brand damage from one viral "AI kids app generated scary images" post would require months to recover from — and may not be recoverable at the unit economics KidColoring requires.
- **Test:** Red-team the content filter with 200 adversarial story prompts (scary, violent, sexual, dark) before any public beta
- **Fail condition:** Content filter catches fewer than 99.5% of genuinely inappropriate prompts in red-team test

---

### 💰 Cluster D: Monetization & Retention

**HMW-D1**
> How might we price the product so a parent pays the first time without a price objection and returns for a second purchase — **assuming** that $9.99/book is the price at which both conditions are simultaneously met?

- **Assumption type:** Viability
- **Explicit assumption:** $9.99 is in the "obvious yes" zone for a first purchase (below $12 psychological barrier; above "this seems too cheap to be quality"). But more importantly, it must be below the threshold where parents hesitate on the second purchase — because repeat purchase rate is the primary viability signal.
- **Test:** 3-price landing page test ($7.99 / $9.99 / $12.99) measuring: conversion rate × stated intent to buy again × actual 30-day repeat purchase rate
- **Fail condition:** $9.99 does not produce the highest 30-day LTV (combination of conversion rate + repeat purchase rate + referral rate)
- **Evidence:** `[snippet:d08f424e]` — *"The best gift for a kid under 8 is something with their name on it. But it has to be quality — not a sticker on a generic product."*

**HMW-D2**
> How might we design the birthday party favor use case as the primary viral growth engine — **assuming** that one 20-book party pack order exposes the product to 4+ new paying customers within 30 days?

- **Assumption type:** Viability + Desirability
- **Explicit assumption:** When a parent orders 20 custom coloring books as birthday party favors and distributes them at a party with 20 children, at least 4 of the other parents will (a) ask where they came from and (b) convert to paying customers within 30 days. This would produce a referral K-factor of 0.2 per party pack purchaser — enough to create a self-sustaining growth loop when combined with SEO traffic.
- **Test:** After each party pack purchase, include a "how did you find us?" form in the PDF. Track downstream new purchases with referral codes.
- **Fail condition:** Referral rate from party pack buyers is < 2 new customers per 10 party packs sold

**HMW-D3**
> How might we convert single-book buyers into subscribers — **assuming** that the second book creation (not the first) is the moment where subscription value clicks?

- **Assumption type:** Viability
- **Explicit assumption:** First-time buyers are evaluating quality. They don't think about a subscription until they've confirmed the product works. The moment they start creating a *second* book (for another occasion, another child, or another week) is when the math of "one book at $9.99 vs. unlimited at $9.99/month" lands. Therefore, the subscription prompt must appear *during* the second book creation flow, not after the first.
- **Test:** A/B: show subscription upsell (A) after first book download vs. (B) at start of second book creation. Measure subscription conversion rate.
- **Fail condition:** No difference between prompt timing (subscription sell is purely price-driven, not moment-driven)

---

### 🍎 Cluster E: Teacher Channel

**HMW-E1**
> How might we make KidColoring the first tool a teacher opens on Sunday evening when planning the week — **assuming** that the first tool used in a planning session captures >70% of that teacher's content spend?

- **Assumption type:** Desirability + Viability
- **Explicit assumption:** Teachers have habitual Sunday planning routines. The tool that earns the "open first" position in that routine captures the majority of that teacher's coloring content budget — because teachers satisfice (stop searching once they find good enough). KidColoring must earn this position by being faster and more relevant than TPT for the first 3 uses.
- **Test:** Teacher onboarding metric: measure "days until second session" and "Sunday session rate" (% of users who use the tool on Sundays)
- **Fail condition:** Sunday usage rate < 30% of teacher users after 4 weeks (no habitual use forming)
- **Evidence:** `[snippet:797f40c5]`, `[snippet:d733ea62]`

---

## Part 3: Top 10 Assumptions Ranked by Criticality

### Ranking criteria
- **Criticality (C):** How badly does the business fail if this assumption is wrong? (1–5)
- **Uncertainty (U):** How unsure are we? (1–5; 5 = pure assumption, no evidence)
- **Testability (T):** How quickly and cheaply can we test it? (1–5; 5 = test in days for < $500)
- **Priority = C × U ÷ T** (test high-priority assumptions first)

---

| # | Assumption | C | U | T | Priority | Type |
|---|-----------|---|---|---|----------|------|
| 1 | Parents will pay $9.99 per book without seeing competitor prices | 5 | 4 | 5 | **4.0** | Viability |
| 2 | AI can generate print-quality (300 DPI, closed-path) line art reliably | 5 | 5 | 2 | **12.5** | Feasibility |
| 3 | First preview page visible in < 60 seconds at p95 | 4 | 4 | 3 | **5.3** | Feasibility |
| 4 | Story-driven books produce ≥ 2× longer coloring sessions than generic | 5 | 3 | 4 | **3.75** | Desirability |
| 5 | Character consistency across 12 pages is achievable with fine-tuned model | 4 | 5 | 2 | **10.0** | Feasibility |
| 6 | COPPA badge above fold meaningfully increases conversion rate | 3 | 4 | 5 | **2.4** | Desirability |
| 7 | Content safety filter catches ≥ 99.5% of adversarial story inputs | 5 | 4 | 4 | **5.0** | Feasibility |
| 8 | Party pack buyers refer ≥ 2 new customers per 10 pack orders sold | 4 | 5 | 3 | **6.7** | Viability |
| 9 | $9.99/month subscription converts ≥ 8% of single-book buyers | 4 | 4 | 3 | **5.3** | Viability |
| 10 | Guided story wizard produces richer prompts than blank text field | 3 | 3 | 5 | **1.8** | Desirability |

**Test order by priority (highest first):**
1. **#2 AI line art quality** — test with 50 story prompts today; measure closed-path rate, line weight consistency, gray-fill rate
2. **#5 Character consistency** — test with 5-page sequences; measure character appearance drift
3. **#8 Party pack virality** — embedded referral code in first 20 party pack orders
4. **#3 Speed at p95** — infrastructure benchmarking before public launch
5. **#7 Content safety** — red-team 200 adversarial prompts before any beta
6. **#9 Subscription conversion** — A/B test subscription prompt timing at 500 users
7. **#1 Pricing** — 3-price landing page test at 1,000 visitors
8. **#4 Engagement duration** — 30-day survey cohort after 200 book deliveries
9. **#6 COPPA badge conversion** — A/B test at 500 homepage visitors
10. **#10 Guided wizard** — usability test with 5 parent-child pairs

---

## Part 4: Success Criteria per HMW

| HMW | Success Metric | Minimum Bar | Target |
|-----|---------------|-------------|--------|
| A1 — Story input wizard | Story prompt word count: wizard vs. blank | Wizard > blank by ≥ 30% | Wizard > blank by ≥ 60% |
| A2 — Child authorship engagement | Coloring session duration (parental report) | Story-driven ≥ 30 min avg | Story-driven ≥ 45 min avg |
| A3 — Character consistency | % pages where main character is recognizable | ≥ 85% | ≥ 95% |
| B1 — Speed | Time to first preview page (p95) | ≤ 90 seconds | ≤ 60 seconds |
| B2 — Print quality | % books rated "clean print" by users | ≥ 90% | ≥ 97% |
| C1 — COPPA visibility | Story input start rate: badge above fold | +5% lift | +15% lift |
| C2 — Content safety | Adversarial prompt filter pass rate | ≥ 99.5% | 100% |
| D1 — Pricing | 30-day LTV at $9.99 vs. alternatives | > $9.99 | > $14 (via repeat) |
| D2 — Party pack virality | Referrals per 10 party pack orders | ≥ 2 new customers | ≥ 4 new customers |
| D3 — Subscription timing | Subscription conversion: 2nd book vs. post-1st | 2nd book > post-1st | by ≥ 40% |
| E1 — Teacher habit | Sunday session rate after 4 weeks | ≥ 30% | ≥ 50% |

---

*Evidence base: 507 research snippets (Supabase `research_snippets`), 3 proto-personas from Phase 1, Google Autocomplete keyword demand data*  
*Next: Event taxonomy and schema migration define the measurement infrastructure for these success criteria*
