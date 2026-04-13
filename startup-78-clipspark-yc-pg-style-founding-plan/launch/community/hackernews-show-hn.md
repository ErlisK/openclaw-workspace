# Show HN: ClipSpark – AI extracts viral clips from your podcast (free for 50 HN users)

Hi HN,

I'm the founder of ClipSpark. After spending $1,500/month on a video editor just to cut clips from my own podcast, I decided to build the thing I wanted.

**What it does:**

Upload a podcast or video (up to 120 minutes). ClipSpark:
1. Transcribes with Whisper-based ASR
2. Scores every ~30-second segment across 7 heuristic signals (hook words, energy, questions, story markers, contrast, numerics, topic density)
3. Generates 5–8 draft clips with burned-in captions, AI title suggestions, and hashtags
4. Lets you trim/approve in a browser editor
5. Exports to YouTube Shorts, LinkedIn — TikTok/Instagram via download

No ML models beyond ASR. The highlight detection is pure heuristics + signal weighting. I was initially going to use an LLM for scoring but the heuristic approach is fast, cheap, explainable, and gives scores users can actually interpret ("your hook_words signal was 0.82, here's why").

**The technical stack:**
- Next.js 15 (App Router, TypeScript)
- Supabase (auth, postgres, realtime, storage)
- Python workers for ASR, scoring, and ffmpeg render pipeline
- GitHub Actions as the worker orchestration layer (cheap, predictable)
- Vercel for the frontend

**Honest limitations:**
- The AI clip selection is ~70% as accurate as a trained human editor's intuition
- Heuristics don't understand domain context (a finance podcast and a comedy podcast score differently but the weights don't know that yet)
- No mobile app, no collaborative features, no video editing with B-roll

**The target user:** solo podcasters and indie creators with <10k followers who publish weekly and have never consistently shipped short-form content because the manual workflow doesn't fit a one-person operation.

I'm offering 50 free Pro accounts (3 months, use code `HN2025`) to HN users willing to give feedback. I read everything.

Live: https://clipspark-tau.vercel.app

Happy to answer anything — especially criticism of the architecture or approach.
