# ClipSpark — Sharp Wedge Hypothesis
**Version:** 2.0 (refined from 312 data points + 15 interviews)
**Phase:** 1 — Problem Mining and Wedge Selection
**Status:** ✅ Validated — proceed to MVP

---

## The Wedge Statement

> **"Weekly solo podcasters with 20–60 minute episodes want exactly 3–5 vertical 9:16 clips under 60 seconds — with burned-in captions, a title, and hashtags — exported to YouTube Shorts and LinkedIn in under 15 minutes, for $5/month flat, without learning a video editor."**

---

## Why This Specific Statement

Every word is load-bearing. Here's the evidence behind each constraint.

### "Weekly solo podcasters"
- **Not** daily streamers, not monthly shows, not team productions
- Weekly cadence = 4 episodes/month = 16-20 clips needed = a real recurring workflow problem, not a one-time project
- Solo = no editor, no VA, no team to offload to — they are the bottleneck
- **Evidence:** 12/15 interviews were weekly solo creators; 68% of the 312 data points came from self-identified solo creators

### "20–60 minute episodes"
- Under 20 min: not enough source material for good clip selection; creators don't feel the time problem as acutely
- Over 60 min: AI processing costs spike; render time frustrates; 45-60 min is the industry sweet spot for interview/solo podcasts
- **Evidence:** Interview cohort average episode length = 41 minutes. r/podcasting thread data confirms 30-60 min as dominant format for nano-creators

### "Exactly 3–5 clips"
- Not 10-15 clips (Opus Clip's default): cognitive overload, 70-90% rejection rate reported by users
- Not 1-2 clips: feels underdelivered, not worth the workflow setup
- 3-5 is the "Goldilocks number": reviewable in 2 minutes, enough to post across platforms, high acceptance rate possible
- **Evidence:** Data point #168: "I don't want 20 clips — I want 5 GREAT clips I can post immediately" (high frequency). Data point #266: "Downloaded 15 clips, posted 3, deleted 12." Interview: Dev scored 3-5 as ideal; Marcus confirmed "3-5 with high quality beats 12 with low quality."

### "Vertical 9:16"
- TikTok, Instagram Reels, YouTube Shorts, LinkedIn video — all default to vertical on mobile
- 9:16 is the universal short-form format; 16:9 clips get penalized by platform algorithms
- **Evidence:** 13/15 interviewees listed at least one vertical platform as primary target. Data point #194: "I want a vertical short AND a square post from the same clip at once" — confirms vertical as baseline, multi-format as bonus

### "Under 60 seconds"
- TikTok sweet spot: 45-60s (per creator best-practice research)
- YouTube Shorts hard cap: 60s (enforced by platform)
- Instagram Reels sweet spot: 30-90s
- LinkedIn video: 45-90s performs best
- **Evidence:** Data point #85: "AI clips are too long — good clips are 45-90s not 3 min." Data point #169: "AI tools pick long boring moments." Platform algorithm data supports <60s for discovery.

### "Burned-in captions"
- 85% of social video is watched without sound (Facebook/Meta research, widely cited)
- "Burned-in" (hardcoded) captions = no separate SRT file needed, no platform upload friction, works on every device
- **Evidence:** Data point #126: "Captions on social are make-or-break. Bad auto-captions get more comments than the actual content." 14/15 interviews mentioned captions as non-negotiable. Caption accuracy (#1 caption complaint) is about correctness, not existence.

### "Title, and hashtags"
- Each clip needs a standalone social post caption — not just the video
- Title = the first line of the caption, often the key to clicks ("The one thing that changed my podcast growth" > "Episode 47 highlight")
- Hashtags = discoverability on TikTok and LinkedIn specifically
- **Evidence:** Data point #94: "Writing captions and hashtags is another 30 min per clip." Data point #184: "AI title suggestions all sound the same — 'The secret to X that nobody tells you.'" Generic suggestions are a pain; good ones are valued.

### "YouTube Shorts and LinkedIn"
- **YouTube Shorts**: 70 billion daily views (2024); fastest growing short-form for podcast-adjacent content; existing podcast audience on YouTube
- **LinkedIn**: #1 platform for coaches, founders, B2B podcasters — the professional creator segment. LinkedIn video underserved by current tools (most are TikTok-optimized)
- These two platforms = the nano-creator's highest-ROI channels for subscriber conversion (vs pure entertainment platforms)
- **Evidence:** Interview data: 11/15 named LinkedIn as a primary or secondary platform; 10/15 named YouTube Shorts. Data point #254: "I'm a coach. My audience is LinkedIn. None of these clip tools optimize for LinkedIn specifically."

### "Under 15 minutes"
- The "magic threshold": if it takes >15 min, creators skip it this week. Then next week. Then quit.
- From interviews: average current time = 2.2 hours/episode. Even Opus Clip users spend 45-90 min.
- Target: ≤15 min total (upload + AI processing + review + export), achievable via render batching and 2-min swipe review
- **Evidence:** Data point #287: "Used to manually clip — took 3 hrs. Opus Clip cuts to 45 min. But 45 min is still too much." Data point #116: "Wish I could upload an episode and get 5 clips in under 10 minutes." 15/15 interviews confirmed time as top-3 pain.

### "$5/month flat"
- 100% of 15 interviewees said yes at $5/mo without hesitation
- 67% said yes at $10/mo
- Drops sharply at $15+ (33%)
- No credits, no per-minute charges, no surprise bills — this is as important as the price itself
- **Evidence:** Data point #300: "If a tool cost $4.99/mo I would sign up without hesitation. At $20+ I hesitate." Data point #104 (same sentiment). Data points #3, #20: Opus Clip's credit system is its #1 Trustpilot complaint.

### "Without learning a video editor"
- Target persona has zero video editing background — they are podcasters, coaches, founders
- Any tool that requires learning a timeline, keyframes, or layers loses them in session 1
- "Must work like a simple upload-and-review flow" — from interview synthesis
- **Evidence:** Data point #179: "I don't want to learn another editor. I just want: upload → clips → captions → post. 3 steps." Data point #312: "These tools make creating clips accessible but not easy. The bar needs to be lower." 7/15 interviews cited learning curve as a top-3 barrier.

---

## Hypothesis Test Criteria

The wedge hypothesis is falsified if any of the following are true after 30 days of MVP access:

| Test | Pass Threshold | Fail Threshold |
|------|---------------|----------------|
| Median time upload→export | ≤ 15 min | > 20 min |
| Week 1 retention | ≥ 75% | < 50% |
| Week 4 retention | ≥ 45% | < 30% |
| Clips accepted per session (not rejected) | ≥ 3/5 | < 2/5 |
| Paid conversion (waitlist → $5/mo) | ≥ 8% | < 4% |
| NPS after first session | ≥ 35 | < 20 |
| "Would recommend" in follow-up survey | ≥ 70% | < 50% |

---

## What ClipSpark Explicitly Does NOT Do (v1)

These are deliberate non-features for the initial wedge. Adding them dilutes focus and increases cost.

| Out of Scope (v1) | Why | When |
|-------------------|-----|------|
| 16:9 / square exports | Adds format complexity; vertical is 80% of use cases | Phase 2 |
| TikTok / Instagram direct posting | OAuth maintenance cost; scheduler bugs are top-5 complaint | Phase 2 |
| AI B-roll insertion | Buggy in all competitors; increases compute cost | Phase 2 |
| Podcast editing (Descript competitor) | Scope creep; different JTBD | Never (separate product) |
| Team / collaboration features | Not needed for solo creator; adds $$ to pricing | Phase 3 |
| Performance analytics dashboard | Valuable but needs data accumulation first | Phase 2 |
| Batch processing multiple episodes | Increases infra cost; weekly creator only needs 1/week | Phase 2 |
| Mobile app | Ship desktop-web first; validate retention | Phase 3 |
| >60 second clips | Platform algorithm penalty; against wedge | Phase 2 (opt-in) |
| Audio-only audiogram clips | Different render pipeline; real but secondary market | Phase 2 |

---

## The YC-Style One-Liner

**"ClipSpark turns a podcast episode into 5 shareable shorts in 15 minutes for $5/month — for the weekly solo creator who can't afford Opus Clip's price or failures."**

### Why now?
1. Short-form video has crossed the threshold where every podcast *needs* clips to be discovered — it's no longer optional
2. Opus Clip raised prices and introduced a confusing credit system in 2023-24, creating a large pool of churned users actively looking for an alternative
3. Whisper-based ASR (open-source, runs cheaply at scale) finally makes $5/mo unit economics viable — couldn't do this 2 years ago
4. The nano-creator segment (sub-10k followers, weekly publishers) has crossed 2M active English-language podcasters — large enough to build a sustainable business

### Why us?
- Deep research: 312 data points, 15 interviews — we understand this pain more than most competitors at founding stage
- Price advantage: $5 flat is a wedge competitors can't easily match without rearchitecting their cost structure
- Community moat: template sharing + performance feedback loop compounds value over time — a dataset that gets better the more creators use it

---

## Wedge Expansion Path

```
Phase 1 (NOW): Weekly solo podcasters → 5 clips → YouTube Shorts + LinkedIn → 15 min → $5/mo
         ↓
Phase 2: Add TikTok/Reels direct posting + performance analytics + audio-only audiograms
         ↓
Phase 3: Multi-platform batch + team accounts → indie media companies, podcast networks
         ↓
Phase 4: API + integrations (Buzzsprout, Transistor, Spotify for Podcasters) → distribution moat
         ↓
Long-term: Creator intelligence platform — knows what clip types work for YOUR audience, YOUR niche
```

---

## Evidence Summary (supporting the wedge)

| Wedge Element | Supporting Data Points | Interview Confirmations |
|---------------|----------------------|------------------------|
| Weekly solo podcasters | #109, #110, #115, #186, #231 (+ 40 more) | 12/15 interviewees |
| 3-5 clips (not 10-15) | #168, #224, #266, #269 | Dev, Marcus, Tom, James |
| Vertical 9:16 | #194, all platform export complaints | 13/15 interviewees |
| Under 60s | #85, #169, #170 | Marcus, Jamie, Mia |
| Burned-in captions | #126, #146, all caption complaints | 14/15 interviewees |
| Title + hashtags | #94, #141, #147, #183, #184 | Omar, Raj, Lisa |
| YouTube Shorts + LinkedIn | #254, #68, #99 | 11/15 LinkedIn; 10/15 Shorts |
| Under 15 minutes | #72, #116, #287, #311 + time cluster | 15/15 interviewees |
| $5/mo flat | #77, #104, #267, #289, #300 + WTP data | 15/15 interviewees |
| No editor needed | #179, #206, #312 + learning-curve cluster | 7/15 primary barrier |
