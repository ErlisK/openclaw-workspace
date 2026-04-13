# Social Proof Assets — ClipSpark Beta Launch

## Asset 1: Founding Story Tweet Thread

**Tweet 1/7:**
I spent $1,500/month on a video editor just to cut clips from my podcast.

3-day turnaround. 2-3 clips per episode. "Clipworthy" moments dying in 60-minute episodes every week.

I built ClipSpark to solve this. It's been running for 6 months. Here's what I learned 🧵

**Tweet 2/7:**
The core insight: finding "clipworthy" moments doesn't require an LLM.

It requires pattern detection on 7 signals:
→ Hook words ("but here's the thing...")
→ High speech energy
→ Questions to the audience
→ Story setup language
→ Contrast phrases ("instead," "but actually")
→ Specific numbers
→ Topic density

These are the same things a good editor looks for. They're just detectable with heuristics.

**Tweet 3/7:**
The pipeline:
1. Whisper ASR transcription
2. Sliding window scoring (30-sec windows, 5-sec stride)
3. Non-overlapping top-K selection
4. ffmpeg render: 240p preview, burned SRT captions, watermark
5. Browser clip editor with trim handles
6. Direct YouTube Shorts + LinkedIn publish

No LLM per-inference costs. Total cost to process a 60-min episode: ~$0.08.

**Tweet 4/7:**
The pricing realization:

I originally thought "AI" meant LLMs, which meant high COGS, which meant $30+/month.

When I switched to heuristics, my COGS dropped 90%. Now I can charge $9/month and still have healthy margins.

The lesson: "AI" doesn't have to mean expensive inference. Explainable heuristics are often better for B2C tools.

**Tweet 5/7:**
What doesn't work yet:

→ The scoring engine treats finance and comedy equally. Domain-specific calibration would help.
→ TikTok direct upload requires their API review process (business verification). Deep-link only for now.
→ The 70% accuracy ceiling. Good editors would catch 30% I miss. That's the product gap I'm closing.

**Tweet 6/7:**
What surprised me:

The biggest time-saving wasn't the AI scoring. It was the browser clip editor.

Creators don't want to download files, open Descript, trim, re-export, re-upload. They want to approve clips from the same screen they found them on.

One-click approve with zero round-trips is the actual UX win.

**Tweet 7/7:**
Public beta is live. Free tier: 5 clips/month, no card.

If you're a podcaster, indie creator, or anyone publishing long-form content who knows you should be on Shorts but hasn't built the habit — try it.

Code TWITTER25 for 2 months Pro free.

https://clipspark-tau.vercel.app

---

## Asset 2: LinkedIn Founder Post

**Spent 18 months feeling guilty about a workflow problem. Then I just built the tool.**

Every week I'd record a podcast episode. Every week, somewhere in that hour, there was a 60-second moment that would have performed well on LinkedIn or YouTube Shorts.

Every week, nothing got posted.

The manual workflow was: 45 min scrubbing, 30 min editing, 20 min captioning, 15 min reformatting. For 5 clips: 5-8 hours. Per episode. Every week.

I hired an editor. Great work, 3-day turnaround, $1,500/month. Still not sustainable for a solo creator.

So I built ClipSpark.

It transcribes your episode, scores every 30-second segment on 7 quality signals, and gives you 5–8 draft clips with captions, title suggestions, and hashtags. You review and approve in about 10 minutes. Direct publish to LinkedIn and YouTube Shorts from the same interface.

The tech insight that made the unit economics work: you don't need LLMs for highlight detection. The signals that make content "clipworthy" — hook language, high energy, questions, story setup, specific numbers — are pattern-detectable with heuristics. Fast, cheap, explainable.

COGS per episode: ~$0.08. Price: $9/month Pro.

Public beta is live. First 100 LinkedIn connections get 3 months free with code **LINKEDIN25**.

If you publish podcasts, webinars, or long-form videos and know you should be extracting more short-form content from them — this was built for you.

[link in comments to avoid algorithm suppression]

---

## Asset 3: Short-form Twitter/X testimonial-style posts

**Post A (problem/solution format):**
The problem: you record a great podcast.
The moments that would blow up on Shorts? They stay in your full episode forever.

ClipSpark finds them automatically.

Free: clipspark-tau.vercel.app

---

**Post B (specific number hook):**
30 minutes per week.

That's how long it takes me to ship 5 clips from my podcast now.

Was: 5–8 hours. Or $1,500/month to an editor.

Tool that changed it → [ClipSpark link]

---

**Post C (comparison):**
Opus Clip pricing: $$$
ClipSpark pricing: $9/month

Both claim to auto-clip your podcast.

The difference: ClipSpark uses heuristic scoring (fast, cheap, explainable). No LLM per-inference.

Beta open now, free tier available.

---

**Post D (educational + CTA):**
The 7 signals that make a podcast moment worth clipping:

1. Hook words (30%) — "but here's the thing..."
2. Energy (20%) — speech rate, emphasis
3. Questions (15%)
4. Story setup (12%)
5. Contrast words (10%)
6. Specific numbers (8%)
7. Topic density (5%)

ClipSpark scores these automatically. Beta free at clipspark-tau.vercel.app

---

## Asset 4: Beta user onboarding email sequence

### Email 1 — Welcome (send immediately on signup)

Subject: Welcome to ClipSpark beta — here's how to get your first clips

Hi [name],

You're in. ClipSpark beta is live and your account is ready.

**Your first session will take about 15 minutes.** Here's the fastest path:

1. Go to your dashboard → click "Upload new episode"
2. Drop in any MP3, MP4, or WAV file (up to 60 min on free tier)
3. Processing takes 5–10 minutes — you'll get a notification when clips are ready
4. Open your clips, hit play on each preview, approve the ones you like
5. Download or publish

**Quick tip:** Your best first upload is an episode you already know has a great moment somewhere in it. The AI will find it — but starting with content you believe in helps you calibrate what "good" looks like.

If anything breaks, reply to this email. I read every one.

— [Founder name], ClipSpark

P.S. If you're on Pro, try the direct YouTube Shorts publish flow. Most satisfying button I've shipped.

---

### Email 2 — Day 3 (check-in)

Subject: Did you get your first clips?

Hi [name],

Just checking in. Three days in, have you uploaded your first episode?

If yes: what did you think? Reply and tell me — especially anything that felt off or wrong.

If not yet: what's getting in the way? Sometimes it's a file format thing (I support MP3, MP4, WAV, M4A — if you have something else, let me know). Sometimes it's "I haven't had time" (valid — but try a 5-minute test upload of any short audio file just to see the output).

No pressure either way. I want to make sure the first 10 minutes of ClipSpark works for you.

— [Founder]

---

### Email 3 — Day 7 (activation)

Subject: The 30-minute weekly workflow that changed my channel

Hi [name],

One week in. Here's the exact workflow I use every week:

**Tuesday (15 min active, 10 min background):**
- Upload episode after recording (2 min)
- Let ClipSpark process while I eat lunch (10 min background)
- Review and approve 4–5 clips (8 min)
- Queue in Buffer for Wed/Thu/Fri posts (5 min)

Total active time: 15 minutes.

The compounding effect after 6 months: ~130+ indexed pieces of content, 8x channel impressions, new subscribers discovering me via Shorts who then binge my back catalog.

If you haven't started yet — try uploading one episode this week. Just to see what the AI finds. No commitment to post it.

Reply and let me know what you discover.

— [Founder]

---

## Asset 5: Invite codes + tracking

| Code | Channel | Max uses | Benefit |
|------|---------|----------|---------|
| HN2025 | Hacker News | 50 | 3 months Pro free |
| PH2025 | Product Hunt | 100 | 3 months Pro free |
| PODCAST25 | r/podcasting | 75 | 2 months Pro free |
| NEWTUBERS | r/NewTubers | 50 | 2 months Pro free |
| TWITCH25 | r/Twitch | 50 | 2 months Pro free |
| SMALLYT | r/SmallYoutubers | 50 | 2 months Pro free |
| IH2025 | Indie Hackers | 100 | 3 months Pro free |
| BETALIST25 | BetaList | 100 | 2 months Pro free |
| TWITTER25 | Twitter/X | unlimited | 2 months Pro free |
| LINKEDIN25 | LinkedIn | 100 | 3 months Pro free |
| BETAOPEN | General | unlimited | 2 months Pro free |

**Note:** These codes should map to Stripe coupons or be handled in the onboarding flow.
Implementation: check promo code at checkout, extend `trial_end` in Stripe or credit months in `subscriptions.credits_bal`.
