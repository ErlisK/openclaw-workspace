# PricingSim — Persona Briefs & Priority Stack
*Cluster-informed, AI-assisted via Vercel AI Gateway (Claude Sonnet 4.6)*
*Source data: 95 public signals, 10 pain clusters*
*Last updated: 2025-04-24*

---

## MVP Priority Summary

| Rank | Persona | Platform | MRR | ICP Priority |
|---|---|---|---|---|
| **#1 PRIMARY** | Maya — Template Seller | Gumroad | $600–$2.8k | ⭐⭐⭐⭐⭐ Build first |
| **#2 PRIMARY** | Marcus — Micro-SaaS | Stripe (subscriptions) | $2k–$8k | ⭐⭐⭐⭐⭐ Build second |
| **#3 V2** | Sofia — Course Creator | Gumroad/Teachable | $1k–$5k | ⭐⭐⭐⭐ Post-MVP |
| **#4 V2** | Devon — Shopify Digital | Shopify + Stripe | $1k–$6k | ⭐⭐⭐ Post-MVP |
| **#5 V2** | Alexei — Productized Consultant | Stripe payment links | $3k–$10k | ⭐⭐⭐ Post-MVP |

**MVP Positioning Statement (AI-generated):**
> *"PricingSim is the pricing experiment tool for solo creators and micro-SaaS founders who want to safely test a higher price — without needing a data team, a statistics degree, or an enterprise analytics budget."*

**First 60 Days Focus:**
Build one core flow: connect Gumroad or Stripe → pick a product → set two prices → get a split test URL → receive a plain-English verdict when confidence crosses 90%. Ship Gumroad integration first (weeks 1–2), Stripe recurring second (weeks 3–4). Do 10 manual onboarding calls with Gumroad creators from r/Notion and IndieHackers. Instrument two north-star events: "started a test" and "saw a verdict." Do not build dashboards, cohort analysis, or tier optimization until both P0 personas have hit success metric at least 20 times.

---

## Persona #1 (P0 PRIMARY): Maya — Notion Template Seller ⭐

> *"I downloaded my Gumroad CSV, spent three hours in Google Sheets trying to figure out if I should charge more, and walked away knowing absolutely nothing. I just need someone to tell me the right price."*

### Profile
- **Age:** 24–32
- **Background:** Ex-designer or productivity nerd turned creator. Learned by doing. No formal business education.
- **Product:** Notion/Figma/Obsidian/Excel templates, icon packs, UI kits
- **MRR (equivalent):** $600–$2,800 (mostly one-time spikes around launches or Reddit posts going viral)
- **Customer count:** 200–2,000 lifetime; 50–150 active in any given month
- **Time at current price:** 8–24 months — set on launch day by looking at what similar creators charged

### Platform Stack
| Layer | Tool |
|---|---|
| **Primary payment** | Gumroad |
| **Storefront** | Gumroad product page + Notion landing page |
| **Email** | ConvertKit (free tier) |
| **Analytics** | Gumroad native dashboard + manual Google Sheets exports |
| **Social** | Twitter/X, r/Notion, Pinterest |

### Trigger Moment
A Reddit post or tweet about their Notion template goes viral, driving 300 sales in 48 hours at $12. Two days later the traffic dies and they realize: *"If I'd just charged $29 I'd have made $5,100 instead of $1,800 and those same people would have bought."* They open Gumroad analytics, stare at a bar chart showing sales volume, find no conversion rate, no price sensitivity data, nothing. They Google "how to test pricing on Gumroad" and find nothing useful.

### Decision Context
- **What they know:** Their product sells. The price feels arbitrary. Other creators charge 2–3x more for similar templates. A price change is theoretically reversible.
- **What they don't know:** Their true conversion rate at current price. Whether a higher price would hurt volume or hurt it slightly. What their customer LTV looks like. Whether buyers are price-sensitive or just need a nudge.
- **What they fear:** Raising the price and watching their next viral moment produce zero sales. Public embarrassment of a flopped launch. Losing the few loyal customers who've been buying their whole catalog.
- **What would unlock action:** A clear, non-technical way to test $12 vs $29 on real traffic with a verdict in plain English. Bonus: seeing a case study from another Gumroad creator who tried it.

### Pain Clusters (Primary)
- **C3** — Data-Blind Pricing Guesswork (can't make sense of Gumroad CSV)
- **C10** — Payment Platform Analytics Gap (Gumroad shows nothing useful)
- **C2** — Statistically-Invalid Tiny-Sample Tests (doesn't know about Bayesian)
- **C4** — Missing Value-to-Price Alignment (severely underpriced, knows it, can't quantify)

### Channel Footprint
- **Daily reads:** r/Notion, r/passive_income, IndieHackers, Creator Wizard newsletter, Traf's blog
- **Posts in:** r/Notion, r/sidehustle, Gumroad Creator Facebook Group, Notion Creator Discord
- **Follows on Twitter:** @traf, @thomas_frank, @hahnbee, @JohnRush_x, @marc_louvion
- **Buys from:** other Gumroad creators, Gumroad community recommendations

### PricingSim Adoption Journey
| Stage | What Happens |
|---|---|
| **Discovery** | Sees a tweet from another Gumroad creator: "Used PricingSim to test $12 vs $29 on my template — $29 won and I doubled revenue with same traffic." Clicks the link out of acute FOMO. |
| **Evaluation question** | "Does this actually work with Gumroad or do I need to set up custom code?" Checks the landing page within 90 seconds for "works with Gumroad" signal. Leaves if not obvious. |
| **Activation moment** | Connects Gumroad account, selects best-selling template, sets Test A at $12 and Test B at $29, clicks "Start Experiment." Gets a shareable test link she can drop in her next tweet. |
| **Success metric** | PricingSim tells her "Test B ($29) is performing 23% better in revenue per visitor with 94% confidence." She raises the price with one click. Revenue goes up. She posts about it on Twitter. |
| **Churn risk** | Setup takes >10 minutes or requires any code. Gets no traffic for 30 days (no traffic = no signal = no value). Tool doesn't show results clearly enough for a non-analytical person. |

### Willingness to Pay
- **Comfortable:** $9–$15/mo
- **Stretch:** $19/mo
- **Preferred model:** Monthly cancel-anytime OR one-time $49–$79 "lifetime" fee (feels safer for creator psyche)
- **Objection:** *"My whole product makes $600/mo, I can't spend $50/mo on a tool. It has to pay for itself in one experiment."*

---

## Persona #2 (P0 PRIMARY): Marcus — Micro-SaaS Founder ⭐

> *"I know I'm underpriced but every time I think about raising prices I get cold feet. I need data that tells me it's safe, not just Twitter anecdotes from survivors."*

### Profile
- **Age:** 28–38
- **Background:** Ex-software engineer or product manager; went indie 1–3 years ago
- **Product:** Single-feature B2B or B2D SaaS (SEO checker, invoice generator, screenshot API, uptime monitor, Slack bot)
- **MRR:** $2,000–$8,000 (typically 30–200 paying customers on recurring Stripe billing)
- **Customer count:** 30–200 active subscriptions
- **Time at current price:** 8–24 months — set "kind of randomly" at launch by copying a competitor

### Platform Stack
| Layer | Tool |
|---|---|
| **Primary payment** | Stripe (recurring subscriptions) |
| **Storefront** | Self-hosted Next.js / Vercel landing page |
| **Email** | Loops, Postmark, or Resend for transactional; Beehiiv or ConvertKit for newsletters |
| **Analytics** | PostHog or Mixpanel; occasionally Baremetrics (but it's pricey) |
| **Infra** | Vercel + Supabase or PlanetScale |

### Trigger Moment
Hits $5k MRR, realizes the business is "real money" now. Opens a spreadsheet, calculates that if he could charge $49 instead of $29 he'd make an extra $2k/mo — life-changing at this scale. Spends an hour reading pricing threads on IndieHackers. Closes the laptop having decided nothing. Repeats this monthly for 6 months. Then a customer emails saying "I'd pay twice as much for this, please don't shut it down" — and that's the moment he starts actively looking for a way to test.

### Decision Context
- **What they know:** Subscription revenue model, basic churn tracking, that A/B testing exists, that their competitors charge more.
- **What they don't know:** What his specific cohort's price elasticity is. Whether new subscribers are more price-sensitive than existing ones. How to run a price experiment without breaking Stripe's billing setup.
- **What they fear:** Losing existing customers with a price increase. Technical complexity of routing users to different price IDs. Angry email threads from long-term customers.
- **What would unlock action:** A Bayesian confidence score on his own data that says "72% chance raising to $49 increases revenue." Plus a staged rollout so new signups see $49 first while existing customers stay grandfathered.

### Pain Clusters (Primary)
- **C1** — Fear-of-Churn Price-Increase Paralysis (the dominant cluster for this persona)
- **C2** — Statistically-Invalid Tiny-Sample Tests (100 customers ≠ enough for frequentist tests)
- **C6** — Existing-Customer Migration Guilt (grandfathered early adopters at $9/mo)
- **C9** — Low-Friction Test Execution Gap (knows what to do, can't wire up Stripe split easily)

### Channel Footprint
- **Daily reads:** IndieHackers, r/SaaS, r/microsaas, HackerNews (Show HN), Marc Lou's blog
- **Posts in:** IndieHackers (product updates), r/SaaS (advice threads), Twitter/X (BuildInPublic)
- **Follows on Twitter:** @levelsio, @marc_louvion, @patio11, @shl, @dannypostmaa, @tibo_maker
- **Buys from:** other indie tools, AppSumo LTDs, Gumroad starter kits

### PricingSim Adoption Journey
| Stage | What Happens |
|---|---|
| **Discovery** | Sees PricingSim on IndieHackers "What are you working on this week?" thread. Or a Show HN post. Clicks through because the title mentions "Bayesian pricing for small SaaS." |
| **Evaluation question** | "Does this work with Stripe subscriptions, not just one-time sales? Can I test $29 vs $49 on new signups only, while keeping existing customers at $29?" |
| **Activation moment** | Connects Stripe, selects the $29/mo plan, sets up a price experiment showing $49/mo to 25% of new visitors, gets a tracking URL to swap on his pricing page. |
| **Success metric** | After 3 weeks: "New customers on $49 plan are converting at 78% the rate of the $29 cohort, but revenue per new customer is up 42%. Projected 60-day revenue lift: +$1,100/mo at 80% confidence." Raises price on new signups. |
| **Churn risk** | If Stripe integration is flaky or requires more than a few minutes of setup. If the experiment runs for 4+ weeks with no statistical signal. |

### Willingness to Pay
- **Comfortable:** $29–$49/mo
- **Stretch:** $79/mo if ROI is clearly demonstrated
- **Preferred model:** Monthly initially; would commit to annual at 2 months free once he trusts it
- **Objection:** *"If this costs $99/mo and only adds 10% revenue lift at my current MRR, that's barely worth it. It has to pay for itself by month 1."*

---

## Persona #3 (P1 SECONDARY / V2): Sofia — Course Creator

> *"I launched at $197 to get my first students. Now I have 400 students and no idea if I should be charging $497 or $997. I've been at $197 for 14 months."*

### Profile
- **Age:** 30–45
- **Background:** Domain expert turned educator — designer, marketer, developer, copywriter
- **Product:** Self-paced video course or cohort-based program; possibly a bundle with templates/ebooks
- **MRR (equivalent):** $1,000–$5,000 (varies heavily with launch cycles; not purely recurring)
- **Platform:** Gumroad, Podia, Teachable, or Kajabi; email list 1,000–10,000

### Platform Stack
| Layer | Tool |
|---|---|
| **Primary payment** | Gumroad or Teachable (Stripe-powered) |
| **Storefront** | Course platform + custom landing page (Webflow/Carrd) |
| **Email** | ConvertKit or Mailchimp |
| **Analytics** | Platform native + email open rates |

### Trigger Moment
Plans a "price increase before cohort closes" announcement for the next launch. Writes the email 3 times and deletes it. Realizes she has no data to justify the number she picked. Needs to know: "If I say $297 instead of $197, will I get 30% fewer students or 5% fewer?" No tool exists to tell her this for launch-model courses.

### Pain Clusters (Primary)
- **C5** — Discount-Trap Revenue Ceiling (heavy reliance on launch discounts)
- **C3** — Data-Blind Pricing Guesswork (no framework for course pricing)
- **C8** — Tier & Bundle Structure Uncertainty (solo vs. bundle pricing)
- **C6** — Existing-Customer Migration Guilt (alumni pricing on next cohort)

### Channel Footprint
- **Daily reads:** Twitter/X (course creator community), ConvertKit Creator Community, Every.to
- **Follows on Twitter:** @NathanBarry, @JustinWelsh, @AliAbdaal, @dangellareed
- **Discovery trigger:** Twitter thread from another course creator: "I used PricingSim to test two launch prices. Here's what the data showed."

### Willingness to Pay
- **Comfortable:** $29–$59/mo OR $79–$149 one-time audit
- **Preferred model:** One-time "pricing audit" more appealing than SaaS subscription — thinks in launches, not months

---

## Persona #4 (P1 SECONDARY / V2): Devon — Shopify Digital Product Seller

> *"I sell Shopify themes and digital downloads through my own Shopify store. Shopify gives me a ton of flexibility but zero insight into whether my prices are right."*

### Profile
- **Age:** 26–40
- **Background:** Freelance web developer turned product creator
- **Product:** Shopify themes, digital downloads, Webflow templates, possibly a small SaaS add-on sold through the Shopify App Store
- **MRR (equivalent):** $1,000–$6,000
- **Platform:** Shopify (storefront) + Stripe or Shopify Payments; sometimes Gumroad for digital downloads

### Platform Stack
| Layer | Tool |
|---|---|
| **Primary payment** | Shopify Payments or Stripe |
| **Storefront** | Own Shopify store + Shopify App Store listing |
| **Email** | Klaviyo or Mailchimp |
| **Analytics** | Shopify Analytics (limited pricing insight) |

### Trigger Moment
Looks at Shopify analytics, sees traffic is up 40% this month but revenue is up only 15%. Conversion rate dropped slightly. Wonders if the new price they set last month is the culprit, or whether it's something else entirely. Has no way to isolate the pricing variable.

### Pain Clusters (Primary)
- **C3** — Data-Blind Pricing Guesswork
- **C9** — Low-Friction Test Execution Gap (Shopify A/B apps are clunky)
- **C10** — Payment Platform Analytics Gap
- **C8** — Tier & Bundle Structure Uncertainty

### Channel Footprint
- **Daily reads:** r/shopify, Shopify Community forums, IndieHackers, r/webdev
- **Discovery trigger:** Shopify App Store listing or a tweet from a Shopify developer community member

### Willingness to Pay
- **Comfortable:** $19–$39/mo
- **Preferred model:** Monthly; expects Shopify-native feel

---

## Persona #5 (P2 / V2): Alexei — Productized Consultant

> *"I charge $3k/month for my SEO retainer. Been the same rate for 3 years. Inflation alone justifies raising it but I freeze every time I think about the conversation."*

### Profile
- **Age:** 32–50
- **Background:** Agency founder, ex-consultant, or senior operator gone independent
- **Product:** Fixed-scope monthly retainer (SEO, paid ads, copywriting, dev ops)
- **MRR:** $3,000–$10,000 (typically 3–8 clients at $500–$2k/retainer)
- **Platform:** Stripe payment links for invoicing; proposals via Notion or Proposify

### Platform Stack
| Layer | Tool |
|---|---|
| **Primary payment** | Stripe (one-time payment links or manual invoices) |
| **Storefront** | Personal website + LinkedIn |
| **Email** | Gmail or HEY |
| **Analytics** | None / gut feel / spreadsheet |

### Trigger Moment
Loses a client unexpectedly, dropping from $7k to $4k MRR in one month. Realizes all revenue is vulnerable to single-client churn. Needs to raise rates to rebuild margin. Opens a spreadsheet to model "what if I charged $4k instead of $3k" — gets overwhelmed by variables. Starts Googling "how to raise consulting rates without losing clients."

### Pain Clusters (Primary)
- **C1** — Fear-of-Churn Price-Increase Paralysis (rate increase = existential fear)
- **C6** — Existing-Customer Migration Guilt (grandfathered long-term clients)
- **C3** — Data-Blind Pricing Guesswork
- **C4** — Missing Value-to-Price Alignment (LTV >>> monthly rate)

### Channel Footprint
- **Daily reads:** Twitter/X consulting community, Brennan Dunn's Double Your Freelancing, r/freelance
- **Follows on Twitter:** @JonathanStark, @BrennanDunn, @philipmorgancpa
- **Discovery trigger:** Brennan Dunn newsletter or a Twitter thread about consulting pricing

### Willingness to Pay
- **Comfortable:** $49–$79/mo
- **Preferred model:** Would also pay $299 for a one-time "raise my rates" analysis
- **Challenge:** Hardest to build for — services have no transaction data volume; simulation-heavy approach needed

---

## Cross-Persona Insights

### Shared Truths (All 5 Personas)
1. **Fear > Logic** — All know they're likely underpriced; fear of churn is the emotional blocker
2. **Time poverty** — Will abandon any tool requiring >90 minutes of setup
3. **Proof required** — Need a case study from someone just like them before trusting
4. **Rollback = trust signal** — Ability to undo instantly is a must-have, not a nice-to-have
5. **ROI framing required** — The tool must visibly pay for itself in its first result

### Key Differentiation by Persona
| Persona | Primary Need | Secondary Need | Hard No |
|---|---|---|---|
| Maya (Gumroad) | Works with Gumroad, no code needed | Simple visual results | Any code requirement |
| Marcus (Stripe SaaS) | Bayesian engine + staged rollout | Migration toolkit | Setup >15 min |
| Sofia (Course) | Launch-model simulation | Refund rate tracking | Subscription-only framing |
| Devon (Shopify) | Shopify-native feel | Price isolation testing | Requires leaving Shopify ecosystem |
| Alexei (Consulting) | Scenario modeling for services | Email templates | "This is only for SaaS" messaging |

### MVP Scope (P0 Only — Maya + Marcus)

Build for these two first. Do not touch P1/P2 until:
- 20+ successful experiments completed by Maya-type users (Gumroad)
- 20+ successful experiments completed by Marcus-type users (Stripe)
- Both have referred at least one other person to the tool

**Gumroad integration is the unlock** — it addresses the largest analytically-underserved segment (4M+ Gumroad creators) with zero existing competition. Ship that first.
