# ClipSpark — Before/After Performance Tracking
**Version:** v0.1  
**Phase:** 2 — Concierge Pilot  
**Date:** April 9, 2026  
**Status:** Baselines collected. Awaiting pilot posts + stat submissions.

---

## How Data Is Collected

1. **Baseline (before):** Operator pulls from pilot interview data + creator's existing analytics
2. **After:** Creator replies with stats screenshots or pastes numbers into reply email
3. **Storage:** `performance_data` and `csat_responses` tables in Supabase `twctmwwqxvenvieijmtn`
4. **Request emails:** Sent to all 10 pilots via `hello.clipspark@agentmail.to` reply threads

---

## Supabase Schema

### `performance_data`
| Column | Type | Description |
|--------|------|-------------|
| `pilot_id` | uuid → concierge_pilot | Links to pilot record |
| `clip_index` | int | Which clip (1, 2, 3) |
| `platform` | text | YouTube Shorts / LinkedIn / TikTok / Reels |
| `metric_type` | text | views / completion_rate / impressions / engagement_rate / saves / etc |
| `value_before` | numeric | Baseline (before ClipSpark clips) |
| `value_after` | numeric | After (filled when creator reports back) |
| `unit` | text | views / % / impressions / saves |
| `measurement_date` | date | When baseline was captured |
| `notes` | text | Context for this data point |
| `screenshot_url` | text | Link to uploaded screenshot (optional) |
| `submitted_by` | text | operator / creator |

### `csat_responses`
| Column | Type | Description |
|--------|------|-------------|
| `pilot_id` | uuid | Links to pilot |
| `q1_clip_quality` | int 1-5 | Caption quality / clip look |
| `q2_right_moments` | int 1-5 | Did we pick the right moments? |
| `q3_would_post` | int 1-5 | Would you post these? |
| `q4_change_request` | text | One thing to change |
| `q5_pay_monthly` | bool | Would pay $5/mo? |
| `caption_style_chosen` | text | Which caption style they preferred |
| `thumbnail_style_chosen` | text | Which thumbnail they chose |
| `hook_style_chosen` | text | Which hook framing they used |
| `qualitative_feedback` | text | Free-form feedback |
| `permission_to_share` | bool | OK to use quote on landing page? |

---

## Baseline Performance Data (13 records in DB)

| Creator | Platform | Metric | Baseline | Expected After | Notes |
|---------|----------|--------|---------|----------------|-------|
| Marcus | YouTube Shorts | views | 142 | 200–350 | +40-140% typical for caption-optimized clips |
| Marcus | YouTube Shorts | watch_time % | 31% | 40–52% | Hook optimization target |
| Marcus | LinkedIn | impressions | 890 | 1,400–2,200 | Video 1.5-2.5x text on LinkedIn |
| James | TikTok | views | 380 | 600–1,200 | Comedy + yellow highlight + punchline timing |
| James | TikTok | completion_rate | 29% | 42–60% | Key signal: did the silence timing work? |
| Angela | Instagram Reels | plays | 1,240 | 1,400–2,000 | She has strong audience; can our clips match VA quality? |
| Angela | Instagram Reels | saves | 18 | 22–35 | Save = strong signal for parenting content |
| Lisa | LinkedIn | impressions | 1,850 | 3,000–4,500 | Text→video jump typically 1.5-2.5x |
| Lisa | LinkedIn | engagement_rate | 2.1% | 3.5–5.5% | Video engagement premium |
| Nick | Instagram Reels | plays | 520 | 700–1,200 | Restarting from cold — baseline is old |
| Elena | LinkedIn | impressions | 740 | 1,200–2,500 | Zero-start on video — any number is proof |
| Tom | LinkedIn | impressions | 1,420 | 2,000–3,500 | Compliance angle: can we make clips that don't alarm his audience? |
| Raj | YouTube Shorts | views | 215 | 300–500 | Multi-speaker detection test |

**Expected values** are projections based on:
- Published LinkedIn video vs. text benchmarks (Hootsuite 2024: video gets 3x more reach)
- TikTok completion rate benchmarks (SocialInsider 2024: avg 34%, hooks can push to 50%+)
- YouTube Shorts benchmarks (Tubics 2024: avg 142 views for sub-5k channels)
- Phase 1 interview data about current performance

---

## CSAT Survey (Sent to All 10 Pilots)

### Questions Asked

1. **Caption quality (1–5):** Were captions accurate and well-timed?
2. **Right moments (1–5):** Did we pick the highlights you'd have chosen?
3. **Would post (1–5):** Were clips polished enough to publish?
4. **One change:** What would you change about any clip?
5. **Pay $5/month?:** If automated: Definitely / Probably / Not yet / No
6. **Caption style:** Which of the 5 styles would you use? (shown previews)
7. **Thumbnail style:** Which of the 4 designs would you choose?

### Current CSAT Status

| Creator | Clips Received? | Stats Submitted? | CSAT Submitted? | Score |
|---------|----------------|-----------------|-----------------|-------|
| Marcus | Pending | — | — | — |
| Dev | Pending | — | — | — |
| Angela | Pending | — | — | — |
| Tom | Pending | — | — | — |
| Jamie | Pending | — | — | — |
| Lisa | Pending | — | — | — |
| Raj | Pending | — | — | — |
| James | Pending | — | — | — |
| Nick | Pending | — | — | — |
| Elena | Pending | — | — | — |

*To be updated as pilots respond. Target: ≥7/10 responses, avg CSAT ≥4.0.*

---

## What We're Looking For

### Primary Success Signals
- **CSAT Q2 ≥4/5:** "Did we pick the right moments?" — validates heuristic scoring
- **CSAT Q3 ≥4/5:** "Would you post these?" — validates overall quality bar
- **CSAT Q5 "Definitely/Probably" ≥60%:** Validates $5/mo willingness to pay
- **Views after ≥ baseline:** Clips actually perform as well as manual

### Secondary Signals (for product decisions)
- **Caption style preference distribution** → informs MVP template defaults
- **Hook style preferred** → informs AI hook generation training data
- **Q4 change requests** → top-requested changes become P0 MVP features
- **Completion rate delta (James)** → validates punchline timing heuristic

### Red Flags to Watch
- **Angela's plays < 1,000:** Would mean ClipSpark clips are worse than her VA → urgent quality issue
- **Any creator says "I wouldn't post this":** Triggers manual review of that clip type
- **Q1 < 3/5 from any creator:** Caption quality issue, check Whisper accuracy on that audio

---

## Feedback Collection Methods

### Method 1: Email Reply (Primary)
- Stats-request email sent to all 10 pilots via existing threads
- "Just reply with your numbers or screenshots"
- Operator manually enters reported numbers into Supabase

### Method 2: Waitlist Form Extension (Secondary)
- The `/api/waitlist` endpoint on `waitlist-limalabs.vercel.app` can be extended
  with a `/api/feedback` route to accept structured form submissions
- Low priority: email reply is simpler for pilot creators

### Method 3: Google Drive Screenshot Upload (Optional)
- Link provided in delivery email: `drive.google.com/drive/folders/clipspark-pilot-{name}`
- For creators who prefer to share screenshots visually

---

## Processing Incoming Responses

When a creator responds with stats, update Supabase:

```bash
# Example: Marcus reports 284 YouTube Shorts views on clip 1
PILOT_ID="bd92d1f2-722b-4749-ac7f-fd0eec5e3682"
METRIC="views"
AFTER=284

curl -s -X PATCH "$SUPABASE_URL/rest/v1/performance_data?pilot_id=eq.${PILOT_ID}&platform=eq.YouTube+Shorts&metric_type=eq.${METRIC}" \
  -H "apikey: $SKEY" \
  -H "Authorization: Bearer $SKEY" \
  -H "Content-Type: application/json" \
  -d "{\"value_after\": ${AFTER}, \"submitted_by\": \"creator\"}"
```

Then update `csat_responses`:
```bash
curl -s -X PATCH "$SUPABASE_URL/rest/v1/csat_responses?pilot_id=eq.${PILOT_ID}" \
  -H "apikey: $SKEY" \
  -H "Authorization: Bearer $SKEY" \
  -H "Content-Type: application/json" \
  -d '{"q1_clip_quality": 4, "q2_right_moments": 4, "q3_would_post": 5, "q4_change_request": "...", "q5_pay_monthly": true}'
```
