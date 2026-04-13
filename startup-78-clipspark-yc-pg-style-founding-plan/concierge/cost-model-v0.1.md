# ClipSpark — Concierge Cost/Time Baseline Model v0.1
**Phase:** 2 — Concierge Pilot
**Purpose:** Establish per-clip cost and time baselines to inform MVP pricing, automation targets, and unit economics

---

## Concierge Workflow Time Breakdown (per episode)

| Step | Tool / Method | Time (min) | Cost ($) | Notes |
|------|--------------|-----------|----------|-------|
| 1. Receive & download episode | Email / Google Drive | 3 | 0 | Operator time only |
| 2. Upload to Whisper API | OpenAI Whisper | 2 (upload) + 3 (wait) = 5 | $0.006/min × 45min = **$0.27** | At $0.006/min of audio |
| 3. Read transcript + score candidates | Operator review | 20 | $0 (pilot) | Most time-intensive step |
| 4. Mark clip boundaries (3 clips) | Manual timestamp marking | 10 | 0 | Using transcript + source video |
| 5. Export clip segments | ffmpeg CLI | 5 | 0 | Free, runs locally |
| 6. Burn captions onto clips (3 clips) | FFmpeg + SRT | 15 | 0 | Render time included |
| 7. Generate titles + hashtags | GPT-4o mini prompt | 3 | $0.001 per clip × 3 = **$0.003** | Cheap, fast |
| 8. QA review (watch each clip) | Operator | 10 | 0 | 3 min/clip × 3 clips |
| 9. Upload to Drive + send email | Google Drive + AgentMail | 5 | 0 | |
| **TOTAL** | | **~73 min** | **~$0.28** | Per episode |

### Per-Clip Breakdown
| Metric | Value |
|--------|-------|
| **Time per episode** | ~73 minutes |
| **Time per clip** | ~24 minutes |
| **Hard cost per episode** (API only) | **$0.28** |
| **Hard cost per clip** (API only) | **$0.09** |
| **Operator cost @ $15/hr** | $18.25/episode, $6.08/clip |
| **Total cost per episode (manual)** | **$18.53** |
| **Total cost per clip (manual)** | **$6.18** |

---

## At-Scale Automated Estimates (MVP Target)

When the concierge workflow is automated, per-clip cost drops dramatically:

| Step | Automation | Time | Cost |
|------|-----------|------|------|
| File intake | Auto-ingest from URL | 0 operator min | $0 |
| Transcription | Whisper API | 0 operator min | $0.27/episode |
| Clip detection | AI heuristic model | 0 operator min | ~$0.05 (GPT-4o mini, 3k tokens) |
| Rendering | Cloud render (FFmpeg worker) | 0 operator min | ~$0.08/clip (1 vCPU × 3 min × $0.027/vCPU-hr) |
| Caption generation | Included in render | 0 operator min | $0 (included above) |
| Title/hashtag | GPT-4o mini | 0 operator min | $0.001/clip |
| Delivery | Auto-email | 0 operator min | $0 |
| **Total per episode (3 clips)** | **Fully automated** | **~5-8 min wall-clock** | **~$0.59** |
| **Total per clip** | | | **~$0.20** |

---

## Unit Economics at $5/Month

### Usage Cap Model
- **Assumption:** Nano-creator publishes 1 episode/week = 4 episodes/month
- **Clips per episode:** 5
- **Total clips per month:** 20

| Item | Cost |
|------|------|
| Transcription (4 eps × $0.27) | $1.08 |
| AI clip detection (4 eps × $0.05) | $0.20 |
| Rendering (20 clips × $0.08) | $1.60 |
| Title/hashtag gen (20 × $0.001) | $0.02 |
| Infrastructure (storage, bandwidth, API) | $0.30 |
| **Total COGS per user/month** | **$3.20** |
| **Revenue per user/month** | **$5.00** |
| **Gross margin per user** | **$1.80 (36%)** |

### Path to Healthier Margins
- **Render batching:** Queue clips during off-peak hours → 40% cost reduction → $2.06 COGS → **59% margin**
- **Whisper self-hosted (faster-whisper):** At 500 users, self-hosting reduces transcription cost 80% → saves $0.86/user
- **Preview renders:** Low-res preview for review, HD only on export → reduces render cost 50%
- **At scale (1,000 users):** $3.20 → ~$1.60 COGS → **68% gross margin**

| Scale | Users | MRR | COGS | Gross Profit | Gross Margin |
|-------|-------|-----|------|-------------|-------------|
| Launch | 100 | $500 | $320 | $180 | 36% |
| 6 months | 500 | $2,500 | $1,350 | $1,150 | 46% |
| 1 year | 2,500 | $12,500 | $5,500 | $7,000 | 56% |
| Mature | 10,000 | $50,000 | $15,000 | $35,000 | 70% |

---

## Concierge Pilot: Time-to-Automation Map

The pilot reveals where human time goes so we know what to automate first.

| Step | Pilot Time | Automation Complexity | Priority |
|------|-----------|----------------------|----------|
| Clip candidate scoring | 20 min | Medium (heuristic model) | **P0 — biggest time sink** |
| Caption burning | 15 min | Easy (FFmpeg template) | **P0** |
| Boundary fine-tuning | 10 min | Medium (UI for review) | **P1** |
| QA review | 10 min | Low (swipe UI, creator does it) | **P1** |
| Transcription (waiting) | 5 min | None (already API) | Done |
| Title/hashtag | 3 min | Easy (GPT prompt) | Done |
| File delivery | 5 min | Easy (auto-email) | Done |

**Key insight:** If we automate only the two P0 steps (clip detection + caption rendering), operator time drops from 73 min to ~25 min per episode — 66% reduction. That's the MVP: AI does the hard part, creator reviews in 2 min, clicks export.

---

## Target Metrics: Concierge → MVP Transition Criteria

We graduate from concierge to MVP when:
1. ✅ Clip detection accuracy ≥ 60% (creator accepts ≥3/5 AI clips without manual replacement)
2. ✅ Caption error rate ≤ 5% (on standard US-EN podcast content)
3. ✅ End-to-end wall-clock time ≤ 10 min (upload to download)
4. ✅ COGS ≤ $0.25/clip at 100 users
5. ✅ Pilot CSAT ≥ 4/5 average

---

## Concierge Pilot Tracking

| Participant | Episode Received | Clips Delivered | TAT (hrs) | CSAT | Notes |
|-------------|-----------------|-----------------|-----------|------|-------|
| Marcus | Pending | — | — | — | Awaiting episode link |
| Dev K. | Pending | — | — | — | Awaiting episode link |
| Angela B. | Pending | — | — | — | VA-replacement test |
| Tom H. | Pending | — | — | — | Compliance-safe clips test |
| Jamie R. | Pending | — | — | — | True crime narrative test |
| Lisa Chen | Pending | — | — | — | LinkedIn professional test |
| Raj M. | Pending | — | — | — | Multi-speaker test |
| James T. | Pending | — | — | — | Comedy timing test |
| Nick A. | Pending | — | — | — | Winback test |
| Elena V. | Pending | — | — | — | Zero-start test |

**Target:** ≥30 clips delivered, avg TAT ≤48hrs, ≥70% CSAT (4/5+)

*Update this table in Supabase `concierge_pilot` as episodes are received and clips are delivered.*
