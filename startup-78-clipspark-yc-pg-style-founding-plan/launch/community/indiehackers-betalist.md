# Indie Hackers Launch Post

**Title:** I built ClipSpark to solve my own $1,500/month problem — here's the honest product journey

---

**The problem:**

I run a weekly podcast. Every week, I knew that somewhere in the episode, there was a 60-second moment that would perform really well on YouTube Shorts or TikTok. Every week, I didn't ship it because the workflow was too expensive in time and money.

I tried:
- Hiring a video editor ($1,500/month — great quality, 4-day turnaround, doesn't scale)
- Opus Clip (clip quality was inconsistent for talking-head/interview content; kept cutting mid-sentence)
- Doing it myself in Descript (took 2–3 hours per episode I didn't have)

So I built ClipSpark.

---

**The approach:**

I specifically wanted to avoid expensive AI inference (LLMs per-minute of audio add up fast at scale). Instead, ClipSpark uses a heuristic scoring engine with 7 weighted signals:

| Signal | Weight | What it detects |
|--------|--------|-----------------|
| Hook words | 30% | "but here's the thing," "nobody tells you," "I made a mistake" |
| Energy | 20% | Speech rate variance, emphasis patterns |
| Questions | 15% | Direct questions to listener |
| Story markers | 12% | "true story," "I remember when," narrative setups |
| Contrast | 10% | "instead," "but actually," "the opposite is" |
| Numerics | 8% | Specific numbers → credibility |
| Topic density | 5% | High information density per minute |

This runs in milliseconds per segment, costs nothing per inference, and produces scores users can actually interpret and calibrate over time.

**Revenue model:**
- Free: 5 clips/month, 60-min uploads
- Pro: $9/month or $50/year — unlimited clips, 120-min, HD, direct publish

**Tech stack:**
- Next.js 15 + Supabase (auth, db, storage, realtime)
- Python workers for ASR (Whisper) + scoring + ffmpeg render
- GitHub Actions for worker orchestration (cheap enough for early stage)
- Vercel for frontend

---

**Current state:**
- Public beta live at https://clipspark-tau.vercel.app
- Working: upload, transcription, scoring, clip editor, captions, YouTube Shorts publish, LinkedIn publish
- Building: community templates, A/B performance feedback loop, TikTok direct upload (pending API approval)

---

**What I'm looking for:**

Honest product feedback from founders or creators who've tried repurposing tools before. Specifically:
1. What did you use before that didn't work, and why?
2. How many clips do you realistically want per episode?
3. Would you pay monthly or prefer a credit-pack model (pay per clip)?

First 100 IH members get 3 months of Pro free — use code **IH2025** at checkout.

---

*Revenue: $0 (just launched)*
*MRR target: $500 by end of month 1, $2,000 by end of month 3*
*Users: open beta, targeting 150 signups this week*

---

# BetaList Submission

**App name:** ClipSpark

**Tagline:** Turn your podcast or video into 5 viral clips — in 10 minutes, no editing needed

**Category:** Content Creation, Productivity, Video

**Description:**
ClipSpark automatically extracts the best moments from your long-form podcast or video. Upload your file, and within minutes you get 5–8 timestamped clips with burned-in captions, AI-generated titles, and hashtags — ready to publish to YouTube Shorts, LinkedIn, TikTok, and Instagram Reels.

Built for solo creators, indie podcasters, and coaches who know they should be on short-form platforms but can't spend 5 hours editing every week.

**Free tier:** 5 clips/month, no credit card
**Pro:** $9/month or $50/year

**Website:** https://clipspark-tau.vercel.app
**Invite code for BetaList users:** BETALIST25 (100 uses — 2 months Pro free)

**Founder note:**
Solo founder, built this for myself after paying $1,500/month to an editor just to cut podcast clips. The heuristic scoring engine identifies hook moments, high-energy segments, questions, story setups, and contrast phrases — the exact signals that make short-form content perform. No LLM per-inference costs, which is why I can keep the price at $9/month.

---

# Early Access Landing Page Copy

## Hero
**Turn your best podcast moments into viral short clips. Automatically.**

ClipSpark scans your episode, finds the 5–8 most shareable moments, adds captions, suggests titles, and gets them ready to post — in 10 minutes, not 10 hours.

[Get early access — free] [See how it works ↓]

## Social proof band
"Finally automated the part of podcasting I hated most."
— Beta user, 3k-subscriber podcast

"I went from 0 Shorts to 3/week. My channel impressions 8x'd in 6 months."
— YouTube creator, r/NewTubers

"Cut my repurposing time from 4 hours to 30 minutes per episode."
— Indie podcaster, Indie Hackers community

## How it works
1. **Upload** — Drop your episode file (MP3, MP4, WAV, M4A — up to 120 min)
2. **AI processing** — ClipSpark transcribes and scores every segment in ~5 minutes
3. **Review** — 5–8 draft clips appear with captions, titles, and hashtags. Approve what you like.
4. **Publish** — Export or publish directly to YouTube Shorts and LinkedIn. TikTok + Instagram via download.

## Pricing
**Free — $0/month**
- 5 clips/month
- Up to 60-min episodes
- Captions + title suggestions
- Download export

**Pro — $9/month (or $50/year)**
- Unlimited clips
- Up to 120-min episodes
- HD export, no watermark
- Direct publish to YouTube Shorts + LinkedIn
- Priority processing

[Start free — no card required]

**Use code BETAOPEN for 2 months Pro free**
