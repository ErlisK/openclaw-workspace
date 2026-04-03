# KidColoring — GitHub Issues: Hypothesis Validation Tracker
## Phase 2: Define · All 10 Assumptions Mapped to Experiments

**Repository:** https://github.com/ErlisK/openclaw-workspace  
**Milestone:** [Phase 2: Define — Validated](https://github.com/ErlisK/openclaw-workspace/milestone/1)  
**Epic:** [#12 — Phase 3 Gate](https://github.com/ErlisK/openclaw-workspace/issues/12)

---

## Issues Created (11 hypothesis + 1 epic)

| Issue | Title | Priority | Labels | HMW | Experiment |
|-------|-------|----------|--------|-----|-----------|
| [#1](https://github.com/ErlisK/openclaw-workspace/issues/1) | AI line art quality — 300 DPI home printing | 🔴 Critical (12.5) | assumption:critical, cluster:generation | B-2 | Print benchmark |
| [#2](https://github.com/ErlisK/openclaw-workspace/issues/2) | Character consistency across 12 pages | 🔴 Critical (10.0) | assumption:critical, cluster:generation | A-3 | LoRA vs reference-image |
| [#3](https://github.com/ErlisK/openclaw-workspace/issues/3) | Party pack K-factor ≥ 0.4 | 🔴 Critical (6.7) | assumption:critical, cluster:monetization | D-2 | `party_pack_referral_placement_v1` |
| [#4](https://github.com/ErlisK/openclaw-workspace/issues/4) | Generation speed — first page ≤60s p95 | 🟠 High (5.3) | assumption:high, cluster:generation | B-1 | Infrastructure benchmark |
| [#5](https://github.com/ErlisK/openclaw-workspace/issues/5) | Subscription timing — 2nd book prompt | 🟠 High (5.3) | assumption:high, cluster:monetization | D-3 | `subscription_prompt_timing_v1` |
| [#6](https://github.com/ErlisK/openclaw-workspace/issues/6) | Content safety — 200 adversarial prompts | 🟠 High (5.0) | assumption:high, cluster:safety | C-2 | Red-team test |
| [#7](https://github.com/ErlisK/openclaw-workspace/issues/7) | Pricing — $9.99 maximises 30-day LTV | 🟠 High (4.0) | assumption:high, cluster:monetization | D-1 | `pricing_v1` |
| [#8](https://github.com/ErlisK/openclaw-workspace/issues/8) | COPPA badge — above-fold lifts activation | 🟡 Medium (2.4) | assumption:medium, cluster:safety | C-1 | `coppa_badge_placement_v1` |
| [#9](https://github.com/ErlisK/openclaw-workspace/issues/9) | Story wizard +30% word count vs blank | 🟡 Medium (1.8) | assumption:medium, cluster:story-input | A-1 | `story_input_wizard_v1` |
| [#10](https://github.com/ErlisK/openclaw-workspace/issues/10) | Engagement — ≥30 min coloring sessions | 🟡 Medium (3.75) | assumption:medium, cluster:story-input | A-2 | 30-day survey |
| [#11](https://github.com/ErlisK/openclaw-workspace/issues/11) | Teacher Sunday planning habit | 🟡 Medium | assumption:medium, cluster:teacher | E-1 | Cohort measurement |
| [#12](https://github.com/ErlisK/openclaw-workspace/issues/12) | EPIC: Phase 3 Gate — all assumptions | — | phase:define | — | — |

---

## Labels Created (12)

| Label | Color | Purpose |
|-------|-------|---------|
| `hypothesis` | #7B68EE | Unvalidated assumption |
| `experiment` | #9B59B6 | A/B test or benchmark |
| `assumption:critical` | #C0392B | C×U÷T ≥ 10 |
| `assumption:high` | #E67E22 | C×U÷T 4–9 |
| `assumption:medium` | #F1C40F | C×U÷T 1–3 |
| `cluster:generation` | #1ABC9C | AI quality/speed |
| `cluster:story-input` | #3498DB | Wizard/prompt |
| `cluster:safety` | #E74C3C | COPPA/content |
| `cluster:monetization` | #2ECC71 | Pricing/conversion |
| `cluster:teacher` | #F39C12 | Teacher channel |
| `phase:define` | #27AE60 | Phase 2 |
| `kidcoloring` | #8E44AD | Project tag |

---

## Supabase Experiments (4 pre-seeded, activate when ready)

```sql
-- Activate when prototype is ready:
UPDATE experiments SET status = 'active' WHERE name = 'pricing_v1';
UPDATE experiments SET status = 'active' WHERE name = 'story_input_wizard_v1';
UPDATE experiments SET status = 'active' WHERE name = 'coppa_badge_placement_v1';
UPDATE experiments SET status = 'active' WHERE name = 'subscription_prompt_timing_v1';
```

Each experiment uses `assign_ab_variant(session_id, experiment_name)` for deterministic assignment.

---

## Phase 3 Entry Gate (from #12)

All blockers must close before Phase 3:

| Gate | Issue | Status |
|------|-------|--------|
| AI model generates print-quality line art | #1 | ⬜ |
| ≥85% character consistency on blind test | #2 | ⬜ |
| `first_page_ms` p95 ≤ 90s confirmed | #4 | ⬜ |
| 200-prompt safety red-team passed | #6 | ⬜ |
| Pricing A/B experiment activated | #7 | ⬜ |
| Schema PR reviewed ✅ | — | ✅ |
| Event taxonomy reviewed ✅ | — | ✅ |
| COPPA consent modal legal review | — | ⬜ |

---

*Generated: Phase 2 Define completion · Issues linked to pov-hmw.md, analytics-events.md, domain-model.md*
