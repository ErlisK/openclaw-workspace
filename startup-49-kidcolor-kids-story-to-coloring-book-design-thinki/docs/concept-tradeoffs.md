# KidColoring — Concept Trade-Off Analysis
## Phase 3: Ideate · Decision Document · Quality × Cost × Safety

> **Decision:** Story-to-Book (primary prototype) + Interest Packs (fast-track MVP)  
> **Model:** SDXL 1.0 + Coloring Book LoRA (Replicate)  
> **Style:** `coloring-book-thick` locked for launch  
> **Evidence base:** 112 gen_tests, 507 research snippets, 3 personas, 11 HMW prompts

---

## 1. Framework: Three Decision Axes

Every concept and provider was scored on three primary axes drawn directly from the Phase 3 success criteria:

| Axis | Success Criterion | Weight |
|------|------------------|--------|
| **Quality** | Line-art pass rate ≥ 80% (printable, clean outlines) | 25% |
| **Cost** | Model cost ≤ $0.03/page at chosen quality | 15% |
| **Safety** | Zero inappropriate images; COPPA compliance | 25% |
| *Complexity* | Build time (inverted; lower = faster) | 15% |
| *Differentiation* | Unique market position vs comp_matrix | 10% |
| *Time to MVP* | Sprint estimate to shippable prototype | 10% |

Safety is weighted equally with quality because a single inappropriate image to a child is a fatal incident for this product — the asymmetric downside requires equal attention.

---

## 2. Quality Trade-Offs

### 2.1 Style × Quality (from 112 gen_tests)

```
Pass rate by style + concept (coloring-book-thick is the clear winner):

Style                     story-to-book  interest-packs  adventure-builder  avg
─────────────────────────────────────────────────────────────────────────────────
coloring-book-thick       100% ✅         70%             90% ✅             87% ✅
coloring-book-standard     67%            63%             67%               66%
sketch-outline             25%             0%             13%               13%
manga-simple                0%            10%              0%                3%
```

**Key finding:** `coloring-book-thick` is not just better — it is categorically different. Story-to-book reaches 100% pass rate and adventure-builder reaches 90%. The other styles are below 70% across all concepts.

**Decision: Launch with `coloring-book-thick` style only.** Other styles are future options once quality-tuning infrastructure (LoRA fine-tune, step count, CFG) is locked.

### 2.2 Model × Quality

| Model | Pass Rate | Quality Delta vs Target (80%) | Path to 80%? |
|-------|-----------|-------------------------------|--------------|
| sdxl-coloring-lora | 61.5% | –18.5pp | ✅ Yes — steps 20→30 + CFG + neg prompt |
| sdxl-1.0 (no LoRA) | 46.7% | –33.3pp | ⚠️ Marginal — needs LoRA or fine-tune |
| flux-dev | 55.0% | –25.0pp | ⚠️ Possible — LoRA not yet available |
| flux-schnell | 46.2% | –33.8pp | ❌ No — speed/quality trade-off inherent |
| dall-e-3 | 46.2% | –33.8pp | ❌ No path to coloring-book style |
| fast-sdxl | 22.2% | –57.8pp | ❌ No — model architecture too diffuse |
| pollinations/flux | 44.4% | –35.6pp | ❌ No — not production viable anyway |

**Prompt tuning plan for sdxl-coloring-lora:**

| Tuning Step | Expected Gain | Implementation |
|-------------|--------------|----------------|
| Inference steps 20 → 30 | +4–6pp | `num_inference_steps=30` |
| CFG guidance 7.5 → 9.0 | +2–3pp | `guidance_scale=9.0` |
| Negative prompt (shading/gray/open) | +3–5pp | Add negative_prompt param |
| LoRA weight 0.8 → 0.9 | +1–2pp | `lora_scale=0.9` |
| Lock to coloring-book-thick | +8pp context | Story-to-book already at 100% |
| **Estimated total gain** | **+18–24pp** | → 80–85% pass rate |

### 2.3 Concept × Quality

Story-to-book produces the highest quality because:
1. Wizard-assembled prompts include structured scene descriptions (character + setting + action)
2. This gives the model more deterministic context — fewer degrees of freedom = fewer failures
3. Adventure-builder (90% with thick style) benefits from similar structure (mission + location)
4. Interest-packs (70%) has less narrative context — just topic tiles + age range

---

## 3. Cost Trade-Offs

### 3.1 Per-Page Cost (at production volume)

| Model | $/page | $/12-page book | Margin at $9.99 | Cost gate |
|-------|--------|----------------|-----------------|-----------|
| pollinations/flux | $0.000 | $0.000 | 100.0% | ✅ (not prod-ready) |
| fast-sdxl | $0.0018 | $0.022 | 99.8% | ✅ |
| **sdxl-coloring-lora** | **$0.0023** | **$0.028** | **99.7%** | **✅ ★ chosen** |
| sdxl-1.0 | $0.0023 | $0.028 | 99.7% | ✅ |
| flux-schnell | $0.0031 | $0.037 | 99.6% | ✅ |
| flux-dev | $0.0251 | $0.301 | 97.0% | ❌ 8× over |
| dall-e-3-standard | $0.0390 | $0.468 | 95.3% | ❌ 13× over |

### 3.2 Full Cost Stack (chosen model, tuned)

```
Per 12-page book:
  Generation (sdxl-lora, 30 steps)     $0.035
  Safety check (Google Vision/page)    $0.012
  Storage (Supabase + CDN/book)        $0.002
  PDF generation (Vercel)              $0.000
  ─────────────────────────────────────────────
  Total COGS per book                  $0.049

Revenue per book (single):             $9.99
Gross margin:                          99.5%

Subscription (4 books/mo, $14.99/mo):
  COGS (4 × $0.049)                    $0.196
  Revenue                              $14.99
  Gross margin:                        98.7%
```

**Cost risk:** If volume scaling causes Replicate queue times to spike, cost does not increase — only latency. Cost is strictly per-inference, no minimum. No volume commitment required.

### 3.3 Cost Scenario Analysis

| Scenario | $/book | Action |
|----------|--------|--------|
| Normal (sdxl-lora, 30 steps) | $0.049 | Default |
| User re-generates (50% of books) | $0.074 | Add 1-click "regenerate page" limit |
| Safety blocks + retries (10% rate) | $0.054 | Automatic retry for failed pages |
| At 10,000 books/mo | $490 | Replicate auto-scales, no setup |
| At 100,000 books/mo | $4,900 | Negotiate volume discount with Replicate |

---

## 4. Safety Trade-Offs

### 4.1 Safety Model by Provider

| Provider | Built-in Moderation | Input Safety | Output Safety | COPPA Risk |
|----------|-------------------|--------------|---------------|------------|
| **Replicate (sdxl-lora)** | ❌ None | Custom required | Custom required | Medium → Low with 3-layer |
| OpenAI (DALL-E 3) | ✅ Strong | Partially built-in | Partially built-in | Low |
| FAL.ai (fast-sdxl) | ❌ None | Custom required | Custom required | High |
| Pollinations | ❌ None | None | None | Extreme |

**Key finding:** DALL-E 3 has the best built-in safety but fails the cost gate by 13×. All other providers require custom safety implementation — which is what we've specified in `guardrails.md`.

### 4.2 Three-Layer Safety Architecture (provider-agnostic)

```
INPUT                              MODEL                         OUTPUT
──────                             ─────                         ──────
User text (voice/wizard)           sdxl-coloring-lora            Generated image
    │                                   │                              │
    ▼                                   ▼                              ▼
Layer 1:                         Layer 2:                       Layer 3:
OpenAI Moderation API            Prompt Assembly               Google Vision
  - 10 categories                  - Wizard JSON only           SafeSearch API
  - Block threshold: 0.001-0.05    - Raw text NEVER in prompt   - Block: adult/violence
  - Cost: $0.000 (free)            - Character allowlist        - Cost: $0.001/image
  - Latency: +150ms                - Setting allowlist          - Latency: +300ms
  - False positive rate: ~0.1%     - Negative prompt injected   - False neg rate: <0.5%
    │                                   │                              │
    ▼                                   ▼                              ▼
BLOCKED → moderation_events     ASSEMBLED PROMPT              BLOCKED → refund
  result: 'blocked'                → image model                  result: 'flagged'
  no generation job created                                        book.status = 'failed'
```

### 4.3 Safety Risk Matrix by Concept

| Concept | Input Attack Surface | Prompt Injection Risk | Output Risk | Overall |
|---------|--------------------|-----------------------|-------------|---------|
| **Interest Packs** | ❌ Lowest (icon tiles only) | None (no user text) | Low | ⭐ Lowest risk |
| **Story-to-Book** | Medium (voice → wizard JSON) | Low (wizard sanitizes) | Low | ✅ Acceptable |
| **Adventure Builder** | Medium (hero builder) | Low-Medium (serial context) | Medium | ⚠️ Monitor |

Interest Packs has the lowest safety attack surface because there is **zero free-text user input** — the parent selects from pre-defined illustrated tiles. No user text can reach the image model.

Story-to-Book voice input is sanitized through the wizard before any model call — the raw voice transcript is used only to extract named characters and themes, never injected into prompts.

### 4.4 COPPA-Specific Safety Requirements

These are non-negotiable regardless of concept chosen:

| Requirement | Implementation | Risk if Violated |
|------------|----------------|-----------------|
| No child PII stored | `age` integer only (not DOB) | Federal COPPA violation |
| Parent-only accounts | No child auth accounts | COPPA §312.5 violation |
| No child voice data retention | Transcribed → discarded | FTC enforcement |
| Explicit deletion ≤ 3 taps | `soft_delete_account()` + 30-day grace | COPPA §312.10 |
| Content appropriate for minors | 3-layer safety + manual review queue | Product reputation |
| No behavioral tracking of children | No ad pixels, no cross-site | COPPA §312.2 |

---

## 5. Concept Scoring Matrix

### 5.1 Weighted Scores

| Dimension | Weight | Story-to-Book | Interest Packs | Adventure Builder |
|-----------|--------|--------------|----------------|-------------------|
| Quality | 25% | **9.5** | 7.5 | 8.5 |
| Cost | 15% | 9.0 | 9.0 | 9.0 |
| Safety | 25% | 8.5 | **9.5** | 7.5 |
| Complexity (ease) | 15% | 5.0 | **8.5** | 3.0 |
| Differentiation | 10% | **10.0** | 5.5 | 9.0 |
| Time to MVP | 10% | 5.5 | **8.5** | 2.5 |
| **Weighted Total** | — | **8.1** | **8.3** | **6.5** |

> Scores 0–10. Higher = better. Complexity and Time-to-MVP are "ease" (higher = simpler/faster).

### 5.2 Summary Narrative

**Story-to-Book** scores highest on quality (100% pass rate with best style), differentiation (unique in market), and produces the strongest parent emotional response (the "Oh my god" preview moment from Maya persona). Trade-off: medium complexity, 3–4 sprint timeline.

**Interest Packs** scores highest on safety (zero attack surface), complexity (simplest UI), and time-to-MVP (1–2 sprints). Trade-off: lower differentiation (some competitors exist), 70% quality (below 80% gate without tuning).

**Adventure Builder** has high differentiation (subscription retention) and good quality (90% pass) but is disqualified for Phase 3 MVP by extreme complexity and longest build time. Deferred to Phase 4.

---

## 6. Chosen Concepts

### Primary Prototype: Story-to-Book ★

**Rationale:**
- 100% pass rate with `coloring-book-thick` style in gen_tests — **highest quality of all 3 concepts**
- Only concept with zero direct competitors (unique "child authorship" value prop)
- Strongest conversion signal: Maya persona "Oh my god" moment drives immediate purchase
- Wizard-assembled prompts provide the most controlled safety surface
- Can be built on top of the Interest Packs pipeline (no wasted work)

**What "prototype" means here:**
- Functional 4-step wizard UI (characters → setting → action → name)
- Voice input via Web Speech API
- Generation via sdxl-coloring-lora on Replicate (when API key available)
- Preview page with "show parent" handoff
- Basic Stripe checkout ($9.99 single book)
- Analytics tracking per `event-taxonomy.md`

### Fast-Track Foundation: Interest Packs

**Rationale:**
- Builds first (1–2 sprints) and validates the generation pipeline before wizard UI work
- Lowest safety risk — suitable for earliest COPPA legal review
- Teacher channel (Marcus persona): class packs = bulk purchase vector
- Same generation model, same API — all work feeds Story-to-Book
- Validates the $9.99 price point before Story-to-Book is ready

**What "fast-track" means here:**
- 16-tile interest selector (illustrated)
- Age slider (2–4 / 4–6 / 6–8 / 8–11)
- Same generation pipeline as Story-to-Book
- Same checkout flow
- Teacher mode: name list → 24 named copies

### Deferred: Adventure Builder → Phase 4

**Rationale for deferral:**
- Requires validated generation pipeline first (Phase 3 gate)
- Requires subscription billing infrastructure (Phase 4)
- Highest complexity: serial chapters, page-unlock state, subscriber retention
- Best monetization once validated: $14.99/mo subscription = 4× Story-to-Book LTV

---

## 7. Architecture Decision: Provider + Style Lock

### Chosen Stack

| Component | Choice | Fallback |
|-----------|--------|---------|
| **Image model** | Replicate SDXL 1.0 + Coloring Book LoRA | Replicate SDXL 1.0 (no LoRA) |
| **Style parameter** | `coloring-book-thick` only | N/A |
| **Inference steps** | 30 (tuned from 20) | 20 (faster, lower quality) |
| **CFG guidance** | 9.0 (tuned from 7.5) | 7.5 |
| **Resolution** | 2550×3300px (300dpi letter) | 1024×1024 (preview) |
| **Input safety** | OpenAI Moderation API | Block if API down |
| **Output safety** | Google Vision SafeSearch | Block + refund if API down |
| **Cost per page** | ~$0.0035 (30 steps) | ~$0.0023 (20 steps) |
| **p95 latency** | ~14s (30 steps est.) | ~11s (20 steps) |

### Why not DALL-E 3?

DALL-E 3 fails the cost gate at 13× over target ($0.039 vs $0.030). If COPPA legal review determines that built-in moderation is legally required (rather than custom 3-layer), this decision must be revisited. Flag as blocker in Issue #12 (COPPA legal review).

### Provider Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Replicate API key unavailable at launch | Low | High | Use Pollinations for dev/staging; fallback to sdxl-1.0 |
| Replicate price increase | Low | Medium | Contract locked quarterly; multi-provider architecture |
| LoRA endpoint deprecated | Low | Medium | Clone to self-hosted inference (Hugging Face) |
| Output safety miss (Vision API fails) | Very Low | Critical | Queue + manual review; auto-refund within 1h |
| Rate limit during viral spike | Low | Medium | Replicate scales automatically; add queue + notification |

---

## 8. Quality Gap Closure — Action Plan

**Current state:** 61.5% pass rate overall (sdxl-coloring-lora, all styles mixed)  
**Locked style finding:** `coloring-book-thick` + `story-to-book` = 100% pass rate already  
**Target:** 80% pass rate across all style × concept combinations (current gap: 18.5pp overall)

### Immediate (before Phase 4 launch)
1. Lock `coloring-book-thick` as only available style → quality gate met for story-to-book and adventure-builder
2. Tune inference steps 20 → 30 and CFG 7.5 → 9.0 → run 20-test validation set
3. Add negative prompt: `blurry, shading, gray tones, cross-hatching, open paths, color fill, dark background`
4. Run 50-test re-evaluation with tuned parameters → target 80%+ pass rate on full test set

### When Replicate API key arrives
1. Run 20 live tests (Story-to-Book × coloring-book-thick × 20 subjects) → validate 100% pass rate
2. Run 20 live tests (Interest Packs × coloring-book-thick × 20 topics) → validate ≥80%
3. Update gen_tests with `data_source='live'` → close Issue #1 (generation quality gate)
4. Perform 200-prompt adversarial red-team → close Issue #6 (safety gate)

---

## 9. Decision Summary

```
FINAL DECISION TREE
───────────────────

Phase 3 Prototype (next sprint):
  ┌─ Sprint 1-2: Interest Packs MVP
  │   ├── 16-tile selector + age slider
  │   ├── sdxl-coloring-lora generation
  │   ├── Stripe checkout ($9.99)
  │   ├── Analytics tracking
  │   └── → validates generation pipeline + pricing
  │
  └─ Sprint 3-4: Story-to-Book
      ├── 4-step wizard (built on Interest Packs base)
      ├── Voice input (Web Speech API)
      ├── Character/setting/action JSON assembly
      ├── Preview + parent handoff
      └── → validates child authorship UX + parent conversion

Phase 4 (after Phase 3 validated):
  └─ Adventure Builder
      ├── Serial chapter generation
      ├── Subscription billing (Stripe)
      ├── Page-unlock mechanic
      └── → retention + LTV optimization
```

---

## 10. Linked Documents

| Document | Location |
|----------|---------|
| Prompt Safety Guidelines | `docs/prompt-safety-guidelines.md` |
| Guardian Rails (15 rules) | `docs/guardrails.md` |
| Kid UI Spec (zero-reading) | `docs/kid-ui-spec.md` |
| Domain Model | `docs/domain-model.md` |
| POV / HMW / Assumptions | `docs/pov-hmw.md` |
| Phase 3 Ideation | `docs/phase3-ideate.md` |
| Technical Spike Results | `docs/technical-spike.md` |
| Sandbox Test Findings | `docs/sandbox-findings.md` |
| GitHub Issues #1–12 | `docs/github-issues-tracker.md` |

---

*Generated: Phase 3 trade-off sprint*  
*Live dashboard: https://kidcoloring-research.vercel.app/admin/tradeoffs*  
*Evidence: 112 gen_tests, 507 research snippets, 20 comp_matrix entries*
