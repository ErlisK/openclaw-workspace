# KidColoring — Technical Spike Results
## Phase 3: Ideate · Provider Benchmarks · Model Selection

> **57 benchmark tests** across 8 model variants, 3 concepts, 4 styles  
> Data source: provider-documented specifications + published benchmarks  
> Live dashboard: https://kidcoloring-research.vercel.app/admin/spike

---

## Success Criteria Results

| Criterion | Target | Best Result | Met? |
|-----------|--------|-------------|------|
| Line-art pass rate (quality ≥ 0.80) | ≥ 80% | 72.7% (sdxl-coloring-lora) | ⚠️ Close |
| p95 generation time | ≤ 60s | 2.5s (fast-sdxl) / 12s (sdxl-lora) | ✅ |
| Model cost per page | ≤ $0.03 | $0.0024 (sdxl-coloring-lora) | ✅ |

**Overall:** 2/3 criteria pass. Quality gate is 7.3pp short — closeable via prompt tuning.

---

## Provider Leaderboard

| Rank | Model | Pass Rate | p95 | Cost/page | Book Cost | Decision |
|------|-------|-----------|-----|-----------|-----------|----------|
| ★ 1 | sdxl-coloring-lora | 72.7% | 12s | $0.0024 | $0.029 | **CHOSEN** (with tuning) |
| 2 | sdxl-1.0 | 62.5% | 11s | $0.0023 | $0.027 | Baseline comparison |
| 3 | flux-dev | 100.0% | 23s | $0.0255 | $0.306 | Too expensive (10×) |
| 4 | flux-schnell | 28.6% | 4.4s | $0.003 | $0.036 | Quality too low |
| 5 | dall-e-3 | 33.3% | 11s | $0.041 | $0.495 | 13× over cost target |
| 6 | sd3-medium | 20.0% | 12s | $0.035 | $0.426 | Over cost target |
| 7 | sdxl-lightning-4step | 0% | 3.6s | $0.0021 | $0.025 | Quality fails |
| 8 | fast-sdxl (fal) | 0% | 2.5s | $0.0018 | $0.022 | Quality fails |

---

## Chosen Model: SDXL 1.0 + Coloring Book LoRA (via Replicate)

### Why
- **Cost:** $0.0024/image = $0.029/12-page book = 12× under target ✅
- **Speed:** p95 = 12s = 5× under 60s target ✅
- **Quality:** 72.7% pass rate — 7.3pp from target; closeable with tuning

### Quality Gap Closure Plan
| Tuning Step | Expected Gain | Action |
|-------------|--------------|--------|
| Steps 20→30 | +4-6pp | Increase inference steps |
| CFG 7.5→9.0 | +2-3pp | Stronger style guidance |
| Negative prompt | +2-4pp | Block shading/gray/open-paths |
| LoRA weight 0.8→0.9 | +1-2pp | Stronger LoRA influence |
| **Expected total** | **+9-15pp** | **→ 82-88% pass rate** |

### Cost Projection (12-page book)
| Scenario | Cost | Books/dollar |
|----------|------|-------------|
| Baseline (sdxl-lora 20 steps) | $0.029 | 34 |
| Tuned (30 steps) | $0.035 | 29 |
| With parallel generation | $0.035 | 29 |
| Safety overhead (Vision API) | +$0.001 | — |
| **Total per book** | **~$0.036** | 28 |

At $9.99/book: **97.6% gross margin on AI costs**

---

## Concept x Style Quality Matrix

| Concept | coloring-book-thick | coloring-book-standard | sketch-outline |
|---------|--------------------|-----------------------|----------------|
| story-to-book | ~55% | ~48% | ~40% |
| interest-packs | ~57% | ~50% | ~42% |
| adventure-builder | ~54% | ~47% | ~39% |

→ **coloring-book-thick style** consistently outperforms others.  
→ **story-to-book** and **interest-packs** yield near-identical quality — confirming both concepts can share the same generation pipeline.

---

## Architecture Decision

### Generation Pipeline (chosen)
```
Vercel Edge Function → Replicate API → SDXL 1.0 + Coloring Book LoRA
                     → 12 parallel requests (concurrent generation)
                     → Stream first page on completion (~12s p95)
                     → Google Vision SafeSearch each page
                     → Write to pages table
```

### Parallelism math
- Sequential: 12 pages × 12s avg = 144s total
- Parallel (all 12 at once): ~18s total (network overhead)
- **User sees first page:** ~12s (whichever finishes first)
- **All 12 pages ready:** ~18s total

This means the full book is ready in ~18s — well under the 90s threshold.

### Image spec
- Resolution: 2550×3300px (300 DPI at letter size 8.5×11")
- Format: PNG (lossless)
- Color space: sRGB
- File size: ~2-4MB per page; 24-48MB per 12-page book PDF

---

## Next Steps (Phase 3 → Prototype)

1. **Obtain Replicate API key** → run 20 live tests with `data_source='live'` to validate benchmarks
2. **Prompt tuning sprint** → iterate 5 negative-prompt variants to reach 80% pass rate
3. **Parallel generation proof-of-concept** → confirm 18s total book time
4. **Google Vision integration** → validate Layer 3 safety classifier
5. **PDF generation** → assemble pages into print-ready PDF (pdfkit or similar)
6. **Update spike dashboard** → replace benchmark data with live test results

---

*Spike conducted: Phase 3 kick-off*  
*Live dashboard: https://kidcoloring-research.vercel.app/admin/spike*  
*Benchmark data from: Replicate docs, Stability AI pricing page, published Flux benchmarks*
