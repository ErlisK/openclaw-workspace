# ClipSpark — Clip Selection Heuristic Spec v0.1
**Version:** 0.1 (concierge pilot — manual execution)
**Purpose:** Define exactly how a human operator (or future AI) selects and marks clip boundaries
**Feeds into:** template-v0.1.json, cost-model.md, MVP AI spec

---

## Overview

The heuristic spec answers: **given a full transcript, how do you find the 3-5 best 45-60 second clips?**

In the concierge pilot, a human operator follows these rules. In the MVP, they become the training signal for the AI model.

---

## Step 1: Transcript Pre-processing

### 1a. Obtain Transcript
Priority order:
1. Upload to OpenAI Whisper API (`whisper-1`, `language: en`) — returns word-level timestamps
2. Fallback: AssemblyAI (better for multiple speakers)
3. Manual if episode is <30 min and operator has time

### 1b. Structure Check
Before clip selection, identify:
- `[INTRO]` — first 2 minutes (usually not clippable — context-heavy)
- `[OUTRO]` — last 1 minute (calls to action, not clippable)
- `[AD_BREAK]` — any sponsor read (mark, skip during clip selection)
- `[CROSSTALK]` — overlapping speech (flag for operator, avoid as clip start/end)

### 1c. Speaker Labels (interview episodes)
- Mark Speaker A (host) and Speaker B (guest) via diarization if multi-speaker
- Solo episodes: skip

---

## Step 2: Clip Candidate Detection (5 Signal Types)

Score each 45-120 second window on the 5 signals below. Top-scoring windows become clip candidates.

### Signal 1: HOOK_OPENING (weight: 3)
**Definition:** The window starts with a statement that creates immediate curiosity or makes a strong claim — no context needed to understand it.

**Positive indicators:**
- Starts with "The reason why...", "Here's the thing...", "Nobody talks about..."
- Poses a provocative question the listener wants answered
- Makes a surprising or counterintuitive claim
- Begins with a specific number: "3 things I learned after 500 episodes..."

**Negative indicators:**
- Starts with "So as I was saying earlier..." (requires prior context)
- Starts with "Let me back up..." (needs setup)
- Starts with a question being asked, not answered (creates confused opening)

**Operator action:** Mark start timestamp 0.5 seconds before the hook begins.

---

### Signal 2: NARRATIVE_PEAK (weight: 3)
**Definition:** The window contains a moment of emotional or narrative intensity — a story reaching its climax, a hard lesson learned, a pivotal moment shared.

**Positive indicators:**
- Language shift to past tense + first-person ("I remember when...", "The day I...")
- Sensory or specific detail ("It was 2am. I was alone. I had $12 in my bank account.")
- Emotional vocabulary ("terrifying", "the moment everything changed", "I almost quit")
- Explicit lesson following a story ("And that's when I realized...")

**Negative indicators:**
- Lists of features or frameworks (educational but not narrative)
- Data dump without story context
- Circular/abstract concepts without grounding

**Operator action:** Mark the narrative arc — start just before the setup, end 1-2 seconds after the resolution/lesson lands.

---

### Signal 3: QUOTABLE_INSIGHT (weight: 2)
**Definition:** A single sentence or short exchange that could be tweeted or shared as a standalone insight — a "mic drop" moment.

**Positive indicators:**
- Short declarative sentence: "You don't have a marketing problem. You have a clarity problem."
- Counterintuitive framing: "The more you try to go viral, the less you will."
- Clean aphorism or reframe that works without context
- A moment that would be screenshot-quoted on Twitter/LinkedIn

**Negative indicators:**
- Sentence requires preceding explanation to make sense
- Contains "as I mentioned earlier" or "like I said"
- Technical jargon without explanation

**Operator action:** Find the sentence, then expand backward/forward to include minimal context (aim for 30-45 seconds total).

---

### Signal 4: PUNCHLINE_MOMENT (weight: 2, comedy/entertainment only)
**Definition:** A comedic payoff — the moment after setup where the laugh/twist lands.

**Rules:**
- Clip must include FULL setup + punchline (never cut setup)
- Add 1.5 seconds AFTER punchline to preserve reaction beat / intentional silence
- If punchline leads to laughter, include 1 full second of the laugh
- Never cold-start a clip AT the punchline — always include 5-10s of setup

**Negative indicators:**
- Clip that starts mid-joke
- Clip that ends before punchline

---

### Signal 5: PRACTICAL_TAKEAWAY (weight: 1)
**Definition:** A specific, actionable piece of advice or a numbered framework. Good for LinkedIn/education-format clips.

**Positive indicators:**
- "Here are the 3 things I do every week..."
- "The framework I use is..."
- Step-by-step with clear enumeration
- Direct advice: "If you're a solo podcaster, stop doing X and start doing Y"

**Negative indicators:**
- Advice that is obvious or generic ("just be consistent!")
- Framework without specifics

---

## Step 3: Clip Boundary Rules

### Hard Rules (must not violate)
1. **Minimum duration:** 35 seconds
2. **Maximum duration:** 60 seconds for TikTok/Shorts; 90 seconds for LinkedIn/Reels
3. **No cold start in mid-sentence.** If the clip starts at a period, start 0.3s before it.
4. **No abrupt end in mid-sentence.** End must be at a period, question mark, or natural pause ≥0.5s
5. **Never start with "So," "Um," "Uh," or filler words** — trim to the first real word
6. **No overlapping content** between clips from the same episode
7. **Minimum gap between clips:** 30 seconds of source material

### Soft Rules (apply when possible)
- Prefer clips that begin with subject + strong verb ("Most creators...", "I spent...", "The problem with...")
- Prefer clips where the speaker's energy is highest (detectable via speech rate + volume)
- For multi-speaker: prefer clips where one speaker dominates (avoid equal back-and-forth for 9:16 format)
- Prefer early episode (first 40%): better story density, fewer tangents
- Avoid clips immediately following an ad break (energy is usually lower)

---

## Step 4: Caption Generation Rules

### Accuracy
- Use Whisper word-level timestamps — do NOT adjust timing manually unless error rate >15%
- For niche vocabulary: create a `custom_vocabulary` file before transcription (see below)
- Acceptable error rate for delivery: ≤5 errors per 60-second clip
- Flag for re-transcription if: names misspelled, key niche terms wrong, numbers wrong

### Custom Vocabulary (niche-specific)
Before transcribing, create a prompt hint for Whisper:
```
"This is a podcast about [niche]. Common terms: [term1], [term2], [term3]. 
Speaker's name is [name]. Guest's name is [name]."
```

### Caption Formatting Rules
1. Max 4 words per caption line (3 for TikTok)
2. Never break a phrase in the middle of a semantic unit ("the most important" stays together)
3. Highlight 1-2 keywords per sentence (nouns/verbs with high semantic weight)
4. Do not capitalize mid-sentence unless proper noun
5. Numbers: spell out 1-10, use numerals 11+
6. Filler words in source: omit from captions ("uh", "um", "you know", "like")

---

## Step 5: Title + Hashtag Generation Rules

### Title Formula
Each clip gets ONE title in one of these formats:

| Format | Template | Example |
|--------|----------|---------|
| Revelation | "The [adj] truth about [X]" | "The uncomfortable truth about podcast growth" |
| Contrast | "[Common belief] vs [reality]" | "Consistency vs. quality — which one actually grows your show" |
| Specific claim | "[Number] [X] that [outcome]" | "3 mistakes that killed my podcast reach" |
| Question | "Why [counterintuitive statement]?" | "Why posting less grew my audience faster" |
| Story hook | "The day I [pivotal moment]" | "The day I almost quit my podcast" |

**Anti-patterns to avoid:**
- Clickbait with no payoff in the clip
- Generic titles: "Episode 47 Highlight", "Check this out", "Wow!"
- Titles that require watching the full clip to understand: "You won't believe what happens next"

### Hashtag Rules by Platform

**YouTube Shorts:** 3 hashtags — 1 niche (#PodcastGrowth), 1 broad (#Podcast), 1 topical (#ContentCreator)

**LinkedIn:** 5 hashtags — 2 professional (#Podcasting #ContentStrategy), 2 niche-specific, 1 community (#LinkedInCreator)

**TikTok:** 5-7 hashtags — mix trending (#PodcastTok #LearnOnTikTok) + niche + one viral (#viral #fyp)

**Instagram Reels:** 8-10 hashtags — broader mix, include location-neutral tags, mix sizes (large/medium/niche)

---

## Step 6: Operator Delivery Checklist

Before delivering clips to pilot participant:

- [ ] 3-5 clips, each within duration target for platform
- [ ] Captions verified — read while watching, catch any errors
- [ ] Clip starts cleanly (no filler word, mid-sentence start)
- [ ] Clip ends cleanly (at a period or natural pause)
- [ ] Each clip has a title and platform-appropriate hashtags
- [ ] Files named: `[creator_name]_clip[N]_[platform].mp4`
- [ ] Delivered via reply to participant email with download link (Google Drive folder)
- [ ] CSAT survey link included in delivery email

---

## Step 7: CSAT Collection

After delivery, send this survey (one reply-to-email):

```
Hi [Name],

Your clips are ready! Here's the download link: [LINK]

Quick feedback request (takes 30 seconds):

1. How would you rate the quality of these clips? (1=terrible, 5=excellent)
2. Did the clips capture the right moments from your episode? (yes / sort of / no)
3. Would you post these clips to your social accounts? (yes / maybe / no)
4. What would you change? (free text)
5. Would you pay $5/month for this automatically? (definitely / probably / probably not / no)

Reply to this email with your answers or click: [TYPEFORM_LINK]

Thank you!
Alex @ ClipSpark
```

**Minimum passing scores:**
- Q1 ≥ 4/5 average across all 10 pilots = CSAT pass
- Q3 "yes" ≥ 70% = content quality pass
- Q5 "definitely" ≥ 60% = commercial signal pass
