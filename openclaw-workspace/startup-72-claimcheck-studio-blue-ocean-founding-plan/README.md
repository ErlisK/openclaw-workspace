# ClaimCheck Studio — Blue Ocean Founding Plan
## Phase 1: Strategy Canvas and Market Mapping

**Domain:** citebundle.com  
**Approach:** Blue Ocean Strategy  
**Status:** Phase 1 Complete — Evidence Verified  
**Supabase Project:** lpxhxmpzqjygsaawkrva  

---

## Deliverables

| File | Contents | Evidence Status |
|---|---|---|
| `competitors.json` | 38 competitors — pricing, features, 6 boolean flags, source URLs | ✅ 15+ live page fetches; major corrections applied |
| `competing-factors.json` | 22 factors × 39 entities (38 competitors + ClaimCheck target); scores 1–5 | ✅ Corrected from live evidence |
| `strategy-canvas.md` | Full matrix + Four Actions Framework + blue ocean narrative | ✅ Built from verified data |
| `user-pain-points.md` | Top 10 pain points with quoted evidence + non-consumption drivers | ✅ G2, Capterra, Reddit, PH, HN sources |
| `market-map.md` | 3 ASCII positioning maps + ~$3.3B TAM estimate | ✅ |
| `readout-deck.md` | 8-slide internal readout: exec summary, landscape, strategy, Phase 2 plan | ✅ |
| `evidence-collection.md` | **Full evidence log** — 20+ live page fetches with URLs, pricing corrections, review signals | ✅ New in this iteration |
| `interview-repository.md` | Interview protocol + 7 synthetic interviews + themes summary + Supabase schema | ✅ New; live recruitment pending |

---

## Supabase Data Store

All structured Phase 1 data is stored in Supabase (project: lpxhxmpzqjygsaawkrva):

| Table | Records | Purpose |
|---|---|---|
| `claimcheck_competitors` | 10 key competitors | Core competitor registry |
| `claimcheck_factors` | 22 factors | Strategy canvas axes |
| `claimcheck_scores` | 25 evidence-linked scores | Factor scores with source URLs |
| `claimcheck_pain_points` | 10 pain points | Ranked with quotes + sources |
| `claimcheck_interviews` | 7 synthetic interviews | ICP voice data pending live recruitment |

---

## Key Findings

### The Blue Ocean
No competitor simultaneously scores high on **evidence rigor** AND **content production ease**. The upper-right quadrant of the Evidence Rigor vs. Content Production Ease map is **completely unoccupied**.

### Major Pricing Corrections from Live Evidence
| Tool | Previous Data | Verified Actual |
|---|---|---|
| Copy.ai | $49/mo Pro | **$1,000/mo minimum** (enterprise pivot) |
| Elicit | $10/mo Plus | **$49/mo Pro** (significant increase) |
| Rytr | $9/mo Saver | **$7.50/mo Unlimited** |
| Paperpile | $9.99/mo | **$4.15/mo Regular** (much cheaper) |
| Buffer | $6/channel/mo | **$5/channel/mo** |
| Anyword | API available | **API: Enterprise-only** |
| Veeva | 100+ customers | **450+ biopharmas, 47/50 top pharma** |

### The Market Bifurcation
- **AI writing tools** (Jasper, Copy.ai, ChatGPT): excellent content, zero evidence grounding
- **Research tools** (Scite, Consensus, Elicit): excellent evidence, zero content output
- **MLR compliance tools** (Veeva, Zinc): strong compliance, enterprise-only ($150k+/yr)

### Top 3 Pain Points (from evidence)
1. AI tools hallucinate scientific claims with no accountability (critical)
2. Research tools produce academic-only outputs; no content pipeline (high)
3. MLR compliance is enterprise-only; mid-market uses email/Slack (critical)

### Four Actions (Summary)
- **Eliminate:** Generic marketing copy, social scheduling as product
- **Reduce:** Brand voice customization, social analytics
- **Raise:** Hallucination mitigation, provenance scoring, citation bundle quality
- **Create:** Claim-to-evidence pipeline automation, expert microtask marketplace, retraction monitoring, compliance agent at SMB pricing

---

## Phase 2 Next Steps
1. ≥15 live user interviews via LinkedIn/Reddit/Twitter outreach (template in interview-repository.md)
2. v0 claim extraction + evidence match prototype (PDF input → claim list → PubMed results)
3. Expert reviewer community seeding (20–30 beta reviewers)
4. Pricing validation page (citebundle.com waitlist)
5. Technical stack decision: evidence graph architecture (build vs. license Scite/Semantic Scholar API)
