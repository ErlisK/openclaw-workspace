# ClipSpark — Highlight Scoring Heuristic Spec v0.1
**Status:** Production-ready for concierge pipeline  
**Used by:** `pipeline.py`, reviewed manually in concierge workflow  
**Date:** April 9, 2026  
**Version:** 0.1.0  

---

## Overview

The heuristic scorer takes a Whisper word-timestamped transcript and returns a ranked list of clip candidates. It is intentionally fast, cheap, and transparent — no ML inference at scoring time. A score is a number; the signals that compose it are human-readable and auditable.

**Input:** `{words: [{word, start, end}], text, duration_sec}`  
**Output:** `[{start_time, end_time, duration, score, signals[], text_preview}]`

---

## 1. Scoring Architecture

### 1.1 Window Approach

- Slide a **variable-size window** over the transcript word list
- Default window: **45–65 words** ≈ 35–55 seconds of speech at 120 WPM
- Step size: **10 words** (ensures overlapping windows catch cross-boundary moments)
- Score each window independently, then rank and deduplicate

```
window_sizes = [45, 55, 65]  # try all, keep highest-scoring per start position
step = 10
min_duration_sec = 20
max_duration_sec = 65
```

### 1.2 Score Composition

Final score = sum of all signal scores for that window.  
No weights beyond signal scores — signals are the weights.

```
total_score = Σ(signal.score for signal in matched_signals)
+ boundary_bonus  (clean start/end)
+ duration_bonus  (optimal 35–60s window)
- duration_penalty (>65s)
- filler_penalty   (high filler word density)
```

### 1.3 Minimum Viable Clip

A window must pass ALL of these gates to be a candidate:
- `total_score >= 4`
- `duration_sec >= 20`
- `duration_sec <= 65`
- `word_count >= 30`
- `filler_word_density < 0.15` (less than 15% uh/um/like/you know)

---

## 2. Signal Definitions

Each signal has: `id`, `category`, `score`, `detection_method`, `examples`.

---

### CATEGORY A — HOOK SIGNALS (score: 2–4 each)

These signal the clip has a strong opening that stops scroll.

#### A1. `HOOK_OPENING` (score: 4)
The window **starts with** or **contains within first 20 words** a phrase that creates a curiosity gap or pattern interrupt.

**Keywords/phrases:**
```
"here's the thing", "here's what nobody tells you", "what nobody talks about",
"hear me out", "i know what you're thinking", "the counterintuitive",
"counterintuitive", "most people think", "everyone says", "the dirty secret",
"the truth is", "what changed everything", "the reason most", "the real reason",
"stop", "the mistake", "nobody will tell you", "before you", "the one thing"
```
**Detection:** case-insensitive substring match in first 20 words of window  
**Score:** +4

#### A2. `QUESTION_HOOK` (score: 3)
Window opens with a direct question (first 10 words contain "?").

**Detection:** First 10 words of window contain word ending in "?" OR first word is one of:
`["why", "what", "how", "when", "do", "did", "have", "can", "could", "would", "should"]`  
**Score:** +3

#### A3. `CONTRARIAN_OPENER` (score: 3)
Contradicts conventional wisdom in the first 15 words.

**Trigger phrases:**
```
"stop trying", "stop doing", "quit", "don't", "instead of", "the opposite",
"backwards", "wrong about", "myth", "actually", "plot twist"
```
**Detection:** Any phrase match within first 15 words  
**Score:** +3

---

### CATEGORY B — NARRATIVE SIGNALS (score: 2–3 each)

These signal a story arc that holds attention.

#### B1. `NARRATIVE_PEAK` (score: 3)
Window contains a story moment — personal disclosure, failure, realization, result.

**Trigger phrases:**
```
"i remember", "the day i", "i used to", "i was", "it hit me", "i realized",
"i almost", "i wasted", "i spent", "then everything changed", "that's when",
"i decided", "i finally", "i made a mistake", "i tried", "i failed",
"i almost quit", "the turning point", "i learned the hard way"
```
**Detection:** Any phrase match anywhere in window  
**Score:** +3

#### B2. `PERSONAL_STORY` (score: 2)
First-person narrative using time markers.

**Trigger patterns:**
```
"for [X] months", "for [X] years", "for [X] weeks", "for [X] days",
"every single [day/week]", "every time i", "back when i", "six months ago",
"last year", "a year ago", "two years"
```
**Detection:** regex `\bfor \d+ (months?|years?|weeks?|days?)\b` or phrase match  
**Score:** +2

#### B3. `CONFLICT_TENSION` (score: 2)
Window contains a conflict or problem statement.

**Trigger phrases:**
```
"the problem is", "the issue is", "what frustrated me", "what I kept getting wrong",
"nobody could explain", "couldn't figure out", "kept failing", "never worked",
"wasn't working", "wasn't good enough", "losing", "giving up", "desperate"
```
**Score:** +2

---

### CATEGORY C — INSIGHT SIGNALS (score: 2–4 each)

These signal an "aha" moment — the payoff viewers stay for.

#### C1. `QUOTABLE_INSIGHT` (score: 4)
A highly quotable, tweetable statement. Concise, opinionated, surprising.

**Trigger phrases:**
```
"the best [X] don't", "the secret to", "the difference between", "the key is",
"the one thing", "the only thing that", "consistency beats", "quality beats",
"what separates", "the reason why [X] works", "not about [X] it's about [Y]",
"forget [X]", "it's not [X] it's [Y]", "the truth about", "the real [X] is"
```
**Detection:** Any phrase match  
**Score:** +4

#### C2. `PRACTICAL_TAKEAWAY` (score: 3)
Concrete, actionable advice. Viewers stay for "what I can do."

**Trigger phrases:**
```
"here's how", "here's what to do", "the trick is", "what actually works",
"step one", "step two", "the first thing", "the simplest way",
"all you need to", "you just need to", "the fastest way", "try this",
"do this instead", "what i do now", "my process", "my system",
"start by", "begin with", "the framework"
```
**Score:** +3

#### C3. `STAT_OR_RESULT` (score: 3)
A specific number or measurable outcome — proof that creates credibility.

**Detection:** regex patterns:
```
\b\d+[\.\d]*x\b           # "3x", "10x"
\b\d+%\b                  # "68%", "300%"
\btripled\b|\bdoubled\b|\bquadrupled\b
\b\d+ (times|fold)\b
\bfrom \d+ to \d+\b        # "from 30 to 68"
\bin \d+ (days?|weeks?|months?)\b  # "in 90 days"
```
**Score:** +3

#### C4. `STRONG_OPINION` (score: 2)
Confident, polarizing statement. Draws engagement from agree/disagree.

**Trigger phrases:**
```
"you should never", "you should always", "the worst", "the best", "the only",
"period", "full stop", "i promise", "i guarantee", "100%", "without exception",
"no exceptions", "unpopular opinion", "hot take", "controversial",
"most people are wrong", "i disagree"
```
**Score:** +2

---

### CATEGORY D — PUNCHLINE / COMEDY SIGNALS (score: 3–5 each)

For comedy, fitness-motivation, and entertainment niches.

#### D1. `PUNCHLINE_MOMENT` (score: 5)
The payoff of a setup. A silence gap (≥0.8s) follows a sentence ending with an exclamation or ironic statement.

**Detection:**
1. Find a word ending with `.` or `!` or `?`
2. Check: next word start - current word end ≥ 0.8s (silence gap)
3. The preceding 5 words contain at least 1 trigger phrase:

```
"and that's when", "turns out", "spoiler", "funny thing",
"here's the punchline", "the joke is", "i laughed", "the twist",
"and it worked", "and they", "so naturally", "obviously",
"of course", "genius", "brilliant"
```
**Score:** +5 if all conditions met, +3 if only silence gap condition met

#### D2. `CALLBACK_SETUP` (score: 2)
Window references something mentioned earlier in the episode ("which I mentioned", "remember when I said", "earlier I talked about").

**Score:** +2 (rare but high engagement when it lands)

---

### CATEGORY E — STRUCTURAL / AUDIO SIGNALS (score: 1–3 each)

Derived from audio characteristics, not just text.

#### E1. `SILENCE_GAP` (score: 2 per gap, max 4)
Intentional pause ≥ 0.8 seconds within the window (excluding natural sentence boundaries).

**Detection:** 
```
for each consecutive word pair (w[i], w[i+1]):
    gap = w[i+1].start - w[i].end
    if gap >= 0.8 and not sentence_boundary(w[i]):
        silence_count += 1
```
**Score:** +2 per qualifying silence, capped at +4  
**Rationale:** Intentional pauses = rhetorical weight = memorable moments

#### E2. `SPEAKER_ENERGY_PEAK` (score: 3)
High amplitude variance in the audio segment — speaker is excited or emphatic.

**Detection:** Computed from audio waveform:
```
rms_window = RMS(audio[start:end])
rms_episode_mean = RMS(full_episode)
if rms_window > rms_episode_mean * 1.35:
    → SPEAKER_ENERGY_PEAK
```
**Score:** +3  
**Note:** Requires audio analysis pass (not just text). Run optionally when waveform data is available.

#### E3. `SPEAKER_CHANGE` (score: 2)
A speaker transition within the window (from diarization or heuristic pitch change).

**Detection:** If diarization data available:
```
if speakers_in_window >= 2: → SPEAKER_CHANGE
```
If no diarization: detect using pitch variance spike (RMS stddev > 2.5× baseline)  
**Score:** +2  
**Rationale:** Speaker changes signal dialogue → more dynamic, higher retention

#### E4. `EMPHASIS_CLUSTER` (score: 2)
Multiple high-emphasis words in close proximity.

**Detection:** Count words in the window that:
- Are in ALL_CAPS in the transcript (Whisper sometimes does this)
- OR are surrounded by 0.1s+ micro-pauses on both sides
- OR are preceded by a 0.4s+ pause (emphatic delivery marker)

**Threshold:** ≥ 3 such words within any 20-word span  
**Score:** +2

---

### CATEGORY F — BOUNDARY QUALITY SIGNALS (score: ±1–3)

These adjust the score based on how cleanly the clip starts and ends.

#### F1. `CLEAN_START` (score: +2)
The first word of the window is NOT a filler or mid-sentence connector.

**Penalized starts:**
```
["uh", "um", "so", "like", "you know", "anyway", "but", "and",
 "well", "right", "okay", "now", "yeah", "yes", "no"]
```
**Score:** +2 if first word is not in this list

#### F2. `STRONG_END` (score: +2)
The last word of the window ends with `.`, `!`, or `?` AND is followed by a ≥ 0.5s silence.

**Score:** +2 if both conditions met, +1 if sentence-ending word only

#### F3. `MID_SENTENCE_START` (score: -3)
Window starts in the middle of an ongoing sentence with no natural entry point.

**Detection:** First 5 words are all lowercase AND contain no sentence-final punctuation in the 3 words before window start  
**Score:** -3

#### F4. `ABRUPT_END` (score: -2)
Window ends mid-sentence with no natural stopping point.

**Detection:** Last word does not end sentence AND next word in transcript exists AND gap to next word < 0.3s  
**Score:** -2

---

### CATEGORY G — DURATION SIGNALS (score: ±1–3)

#### G1. `OPTIMAL_DURATION` (score: +2)
Window duration is 35–55 seconds — the sweet spot for all platforms.

#### G2. `GOOD_DURATION_LONG` (score: +1)
Window duration is 55–65 seconds — acceptable for LinkedIn/YT Shorts.

#### G3. `TOO_SHORT` (score: -2)
Window duration < 20 seconds — almost never worth delivering.

#### G4. `TOO_LONG` (score: -2)
Window duration > 65 seconds — likely needs trimming.

---

## 3. Deduplication Rules

After scoring all windows, select top N non-overlapping clips:

```python
selected = []
for candidate in sorted(all_windows, key=lambda x: -x.score):
    # Minimum 15 second gap between clips
    overlaps = any(
        not (candidate.end + 15 < sel.start or candidate.start - 15 > sel.end)
        for sel in selected
    )
    if not overlaps:
        selected.append(candidate)
    if len(selected) >= n_clips_requested:
        break
```

### Fallback for Sparse Content
If fewer than `n_clips` candidates score ≥ 4 after deduplication:
1. Lower threshold to ≥ 2 and retry
2. Add time-spaced fallbacks at 25%, 50%, 75% of episode duration
3. Mark fallback clips with `"fallback": true` in output

---

## 4. Niche-Specific Scoring Adjustments

Adjust signal weights based on niche metadata:

| Niche | Amplify | Reduce |
|-------|---------|--------|
| `comedy` | `PUNCHLINE_MOMENT` × 1.5, `SILENCE_GAP` × 1.3 | `STAT_OR_RESULT` × 0.5 |
| `education` | `PRACTICAL_TAKEAWAY` × 1.3, `QUOTABLE_INSIGHT` × 1.2 | `PUNCHLINE_MOMENT` × 0.5 |
| `founder_b2b` | `STAT_OR_RESULT` × 1.5, `STRONG_OPINION` × 1.3 | `PUNCHLINE_MOMENT` × 0.3 |
| `fitness` | `HOOK_OPENING` × 1.3, `SPEAKER_ENERGY_PEAK` × 1.5 | `PRACTICAL_TAKEAWAY` × 0.8 |
| `true_crime` | `NARRATIVE_PEAK` × 1.4, `CONFLICT_TENSION` × 1.3 | `PRACTICAL_TAKEAWAY` × 0.3 |
| `coaching` | `QUOTABLE_INSIGHT` × 1.5, `PERSONAL_STORY` × 1.3 | — |

---

## 5. Boundary Adjustment Rules

After a window is selected, fine-tune boundaries:

### Start Boundary
1. If `CLEAN_START` was not scored: search ±5 words for nearest sentence start
2. If found: adjust start to sentence start (`window.start += delta_words`)
3. Max adjustment: 8 words back, 3 words forward
4. Add 0.15s padding before first word (prevents abrupt audio start)

### End Boundary
1. If `STRONG_END` was not scored: extend to nearest sentence end
2. For `PUNCHLINE_MOMENT` clips: add `punchline_buffer_sec` (default 1.5s) after last word
3. For `QUESTION_HOOK` clips: do not cut before the answer begins
4. Add 0.25s padding after last word (prevents audio clipping)

---

## 6. Caption Word Grouping

After clip selection, generate SRT-compatible word groups:

```
group_rules:
  max_words_per_line: [template.caption.max_words_per_line]  # typically 3-5
  break_on_punctuation: [".", "!", "?", ","]
  break_after_conjunctions: true  # break before "and", "but", "so", "because"
  min_line_duration_sec: 0.8
  max_line_duration_sec: 3.0
  never_split_idioms: ["you know", "i mean", "that is", "in other words"]
  filler_removal:
    enabled: true
    remove: ["uh", "um", "hmm", "like... like"]
    replace_with: null  # hard remove, don't substitute
```

**Highlight word selection** (for `highlight_mode: keyword_color`):
- Last word of each line (most punch): always highlight
- First word of line if it's a HOOK_OPENING trigger word
- Any word matching QUOTABLE_INSIGHT trigger phrases

---

## 7. Title and Hashtag Generation Prompts

### Title Formula by Hook Type

| Hook Signal Present | Title Template |
|--------------------|---------------|
| `CONTRARIAN_OPENER` | "Stop [conventional_thing]. Do [real_thing] instead." |
| `STAT_OR_RESULT` | "[Metric] [verb] [number] in [time]. Here's what changed." |
| `QUOTABLE_INSIGHT` | "[Quote verbatim, max 12 words]" |
| `PERSONAL_STORY` | "I [did thing] for [time]. Then [insight]." |
| `PRACTICAL_TAKEAWAY` | "The [fastest/easiest/only] way to [outcome]" |
| `QUESTION_HOOK` | "[Question verbatim, keep ?]" |
| *(none)* | "[Most memorable 10-word phrase from transcript]" |

### Hashtag Selection Rules
- Platform hashtag counts: YT Shorts: 3, TikTok: 5-7, LinkedIn: 5, Reels: 8-10
- Always include: 1 niche hashtag + 1 broad (#Podcast or #Creator) + 1 topical
- Never include: generic spam tags (#fyp alone, #viral alone, #trending)
- TikTok: include `#PodcastTok` if niche=podcast

---

## 8. Score Reference Card

| Signal | Score |
|--------|-------|
| `HOOK_OPENING` | +4 |
| `QUOTABLE_INSIGHT` | +4 |
| `PUNCHLINE_MOMENT` (full) | +5 |
| `PUNCHLINE_MOMENT` (silence only) | +3 |
| `QUESTION_HOOK` | +3 |
| `CONTRARIAN_OPENER` | +3 |
| `NARRATIVE_PEAK` | +3 |
| `PRACTICAL_TAKEAWAY` | +3 |
| `STAT_OR_RESULT` | +3 |
| `SPEAKER_ENERGY_PEAK` | +3 |
| `CLEAN_START` | +2 |
| `STRONG_END` | +2 |
| `PERSONAL_STORY` | +2 |
| `CONFLICT_TENSION` | +2 |
| `STRONG_OPINION` | +2 |
| `SILENCE_GAP` (per gap, max 2) | +2 |
| `SPEAKER_CHANGE` | +2 |
| `EMPHASIS_CLUSTER` | +2 |
| `OPTIMAL_DURATION` (35-55s) | +2 |
| `CALLBACK_SETUP` | +2 |
| `GOOD_DURATION_LONG` (55-65s) | +1 |
| `STRONG_END` (sentence only) | +1 |
| `MID_SENTENCE_START` | -3 |
| `ABRUPT_END` | -2 |
| `TOO_SHORT` (<20s) | -2 |
| `TOO_LONG` (>65s) | -2 |

**Minimum qualifying score:** 4  
**Typical strong clip:** 8–16  
**Exceptional clip:** 17+

---

## 9. Worked Example

**Episode:** Marcus, business podcast, "3 things that changed my growth"  
**Clip window:** 38.0s – 56.2s (18.2s source duration)  
**Text:** "Stop trying to go viral and start trying to be useful to a specific person. I have a listener named Sarah. She's a freelance designer trying to build a podcast about creative burnout. I make every episode for Sarah. Not for the algorithm. Not for the charts. For Sarah."

**Scoring:**

| Signal | Match | Score |
|--------|-------|-------|
| `CONTRARIAN_OPENER` | "stop trying" in first 15 words | +3 |
| `HOOK_OPENING` | "the one thing" / "stop" pattern | +4 |
| `PERSONAL_STORY` | "I have a listener" (personal disclosure) | +2 |
| `QUOTABLE_INSIGHT` | "not about [X] it's about [Y]" pattern | +4 |
| `SILENCE_GAP` | pause before "Not for the algorithm" | +2 |
| `SILENCE_GAP` | pause before "Not for the charts" | +2 |
| `CLEAN_START` | "Stop" is not a filler | +2 |
| `STRONG_END` | ends with "For Sarah." + 1.2s silence | +2 |
| `OPTIMAL_DURATION` | 18s — too short | -2 |
| `TOO_SHORT` | <20s | -2 |

**Total: 17** → Exceptional clip ✅  
(Duration too short was offset by signal density — worth manual boundary expansion)

---

## 10. Versioning and Evolution

| Version | Change |
|---------|--------|
| `0.1.0` | Initial spec: 7 signal categories, 20 signals, niche adjustments |
| `0.2.0` (planned) | Add ML-based `SPEAKER_ENERGY_PEAK` from Whisper confidence scores |
| `0.3.0` (planned) | Feedback loop: CSAT data adjusts signal weights per niche |
| `1.0.0` (planned) | Per-creator signal calibration from 30+ episode history |
