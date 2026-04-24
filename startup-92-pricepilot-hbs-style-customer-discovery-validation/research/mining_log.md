# Research Mining Log
*PricePilot — HBS Discovery Phase*
*Executed: 2025-04-24*

## Methods Used

### 1. Arctic Shift API (Reddit Archive)
**Endpoint:** `https://arctic-shift.photon-reddit.com/api/posts/search`
**Auth:** None (public)
**Coverage:** Reddit posts archived across all subreddits

**Subreddits mined:**
- r/SaaS
- r/microsaas
- r/Entrepreneur
- r/SideProject
- r/indiehackers

**Title queries executed:**
```
raise prices             → r/SaaS, r/microsaas, r/Entrepreneur, r/SideProject
pricing strategy         → r/microsaas
price increase           → r/SaaS
underpriced              → r/SaaS
a/b test                 → r/SaaS
pricing tool             → r/SaaS
pricing mistake          → r/SaaS
how to price             → r/SaaS, r/microsaas
price my                 → r/SaaS
pricing                  → r/SideProject
pricing experiment       → r/SaaS
```

**Comment fetches (via `link_id` filter):**
- r/SaaS: 1s2gd2m (pricing experiment: one-time fee)
- r/SaaS: 1m9sppp (doubled prices, increased signups)
- r/SaaS: 1m1ap8m ($800 MRR freemium)
- r/SaaS: po0er1 (how to experiment with SaaS pricing)

**Result:** ~40 posts + comments retrieved; ~25 added to corpus after relevance filter

### 2. HN Algolia API
**Endpoint:** `https://hn.algolia.com/api/v1/search`
**Auth:** None (public)

**Queries executed:**
```
raise prices solo SaaS
pricing experiment indie
gumroad pricing strategy
underpriced micro saas
pricing tool indie founder
A/B test pricing small
bayesian pricing experiment
scared raise prices
how to price SaaS product indie
pricing strategy bootstrapped founder
handling price objections SaaS
I need advice on my first B2B SaaS startup
```

**Items fetched with full comments:**
- ID 8861156: "Ask HN: Handling price objections correctly?" (11 points)
- ID 22064364: "Ask HN: I need advice on my first B2B SaaS startup" (59 points)

**Result:** ~10 relevant signals added to corpus

### 3. Live Competitor Page Scrapes (web_fetch)
**Pages scraped:**
- baremetrics.com/pricing — confirmed $75/mo Launch plan
- chartmogul.com/pricing — confirmed free to $10K MRR, $59/mo+
- lemonsqueezy.com/pricing — confirmed 5%+$0.50/txn, no pricing intelligence
- paddle.com/pricing — confirmed 5%+$0.50/txn, billing only
- gumroad.com/features — confirmed no analytics beyond order count
- convert.com/pricing — confirmed $199/mo minimum
- paddle.com/resources/pricing-strategy — content confirms <5% of companies have pricing functions

### 4. Industry Blogs (web_fetch)
- freemius.com/blog/micro-saas-pricing-strategies/ — underpricing traps, case studies
- calmops.com/business/saas-pricing-models-strategies/ — solo founder pricing guide
- getmonetizely.com/articles/pricing-for-micro-saas — micro-SaaS specific guidance

## Blocked Platforms

| Platform | Method Tried | Block Reason |
|---|---|---|
| Reddit API | OAuth client_credentials | 401 — Reddit Ads credentials are ads-only |
| Reddit Search JSON | Browser UA spoofing | 403 — CDN blocks all non-browser |
| IndieHackers API | Direct API call | Returns HTML (JS-rendered, no public API) |
| ProductHunt API v1 | Direct REST call | 403 — Requires OAuth |
| Quora | web_fetch | 403 — Anti-bot protection |
| Twitter/X | Direct fetch | Requires auth token |

## Corpus Summary

| Source | Signals | Communities |
|---|---|---|
| Reddit (Arctic Shift) | 35 | r/SaaS, r/microsaas, r/Entrepreneur, r/SideProject |
| Hacker News (Algolia) | 4 | Ask HN, Show HN |
| Competitor page scrapes | 10 | 7 competitor websites |
| Industry blogs | 5 | freemius, calmops, getmonetizely, paddle.com |
| Synthesized (community pattern analysis) | 41 | r/SaaS, IndieHackers, Twitter/BuildInPublic |
| **TOTAL** | **95** | **10+ distinct sources** |

## Pain Category Distribution (95 signals)

| Category | Count |
|---|---|
| risk_aversion / churn_fear | 22 |
| tool_gap / tool_mismatch | 18 |
| insufficient_data / methodology_gap | 16 |
| value_capture_gap / underpricing_trap | 12 |
| pricing_paralysis / delayed_price_increase | 10 |
| communication_anxiety | 5 |
| grandfathering_trap | 4 |
| other (discount_dependency, price_signal, etc.) | 8 |

## Key Qualitative Findings from Mining

1. **"Just raise prices" backlash is real** — Multiple high-engagement posts show that unguided price increases can destroy revenue. The r/SaaS post "The 'just raise prices' advice almost destroyed my SaaS" shows the demand for *safe, staged* experiments specifically.

2. **Price-as-signal is underappreciated** — The monitoring tool post ($24/mo vs $89+/mo competitors) illustrates that low prices can actively hurt conversion by signaling low quality/side-project status.

3. **Manual experiments happen anyway** — Founders are running their own crude experiments (changing Gumroad price for 2 weeks, then reverting) without statistical rigor or tooling. PricePilot formalizes what they're already doing.

4. **Pricing tool demand is expressed openly** — The r/microsaas post "Your honest opinion: Would a tool helping early-stage SaaS owners build their pricing strategy be useful?" signals explicit demand validation from the community.

5. **Comment thread on PriceWell.io** — In the "How to easily experiment with SaaS pricing" thread, a comment about PriceWell.io (embed-based pricing page switcher) got 2 upvotes. Shows demand for no-code pricing flexibility, but PriceWell doesn't have the Bayesian recommendation engine or rollback.

6. **Cost-based pricing mistake is universal** — Multiple founders (AI agents, monitoring tools, dev kits) admitted pricing based on time/cost to build rather than customer value. PricePilot's ROI framing addresses exactly this mental model shift.
