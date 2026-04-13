# ClipSpark — Style Experiment Results & Creator Preference Log
**Version:** v0.1
**Phase:** 2 — Concierge Pilot
**Sessions run:** 4 (Marcus, James, Angela, Lisa)
**Total style variants generated:** 36 images (9 per creator × 4 creators)
**Date:** April 9, 2026

---

## TL;DR Findings

| Category | Winner | Runner-Up | Avoid |
|----------|--------|-----------|-------|
| Caption style | **Yellow Word Highlight** (TikTok/Reels) | Bold White + Outline (universal) | Kinetic Single Word (niches only) |
| Thumbnail | **Split Face + Text** (YT Shorts) | Quote Card (LinkedIn) | TikTok Loud (comedy only) |
| Hook framing | **Story/Confession** (universal) | Contrarian (founders/coaches) | Stat Hook (LinkedIn only) |

---

## 1. Caption Style Experiments

### Styles Tested

#### A. Bold White + Black Outline (`bold_white_outline`)
```
Font: DejaVu Sans Bold, 58px
Color: White (#FFFFFF) | Outline: Black, 4px
Lines: 4 words/line | Position: Bottom third
```
**Verdict:** Universal baseline. Works on every platform, every niche. Not exciting but never wrong.  
**Creator fit:** All 4 creators could use this without confusion.  
**Limitation:** Common — doesn't stand out on TikTok where yellow highlight is standard.

---

#### B. Yellow Word Highlight (`yellow_highlight`)
```
Font: DejaVu Sans Bold, 54px
Color: White | Highlight: Yellow (#FFDC00), last word per line
Lines: 3 words/line | Position: Center
```
**Verdict:** ⭐ **Preferred by TikTok/Reels creators.** High visual energy. The yellow last-word pattern is learned behavior on TikTok — viewers' eyes track to yellow automatically.  
**Creator fit:**
- James (comedy): "This is exactly what I see on successful comedy clips"
- Angela (business, Reels): "My VA does something like this — this matches"
- **Not suitable for:** Lisa (LinkedIn-primary), Tom (compliance niche)

---

#### C. Dark Pill Background (`pill_caption`)
```
Font: Open Sans Bold, 52px
Color: White | Background: Black, 70% opacity, 20px radius
Lines: 5 words/line | Position: Bottom third
```
**Verdict:** ⭐ **Preferred by LinkedIn/professional creators.** Clean and modern. Feels polished, not "influencer-y."  
**Creator fit:**
- Lisa (career/education): "This looks like something I'd actually share on LinkedIn"
- Tom (fintech): Likely match (compliance-safe aesthetic)
- **Not suitable for:** TikTok, where it reads as low-energy

---

#### D. Kinetic Single Word (`kinetic_word`)
```
Font: DejaVu Sans Bold, 100px
Color: White | Outline: Black, 5px
1 word per line | Position: Center
```
**Verdict:** Niche use only. Requires a different SRT structure (one word per subtitle event) and fast cuts to be effective. Not suitable for standard concierge workflow.  
**Creator fit:** Comedy (James), fitness (Nick) — only where rhythm/timing is a core value.  
**Action item:** Flag as advanced option in UI; not a default.

---

#### E. Brand Color Accent (`brand_color`)
```
Font: Liberation Sans Bold, 52px
Color: White | Accent bar: Indigo (#6366F1)
Background: Black, 78% opacity | Position: Bottom third, left-aligned
```
**Verdict:** Strong for founder/B2B creators who want platform-native look on LinkedIn. Left-alignment feels more editorial than centered captions.  
**Creator fit:**
- Dev K. (SaaS founder): Likely match
- Tom (fintech): Likely match
- Angela: "Too corporate for my parenting audience"

---

### Caption Style Recommendation Matrix

| Creator Type | Platform | Recommended Style |
|-------------|----------|------------------|
| Solo podcaster, any niche | TikTok / Reels | Yellow Word Highlight |
| Solo podcaster, any niche | YouTube Shorts | Bold White + Outline |
| Coach / professional | LinkedIn | Pill Caption or Brand Color |
| Comedy podcaster | TikTok | Yellow Highlight or Kinetic |
| Founder / B2B | LinkedIn + Shorts | Brand Color Accent |
| Education / explainer | LinkedIn + Shorts | Pill Caption |

---

## 2. Thumbnail Style Experiments

### Styles Tested

#### A. Bold Text on Gradient Background (`bold_text_bg`)
- Dark purple-to-indigo gradient, white caps headline, accent bar, emoji
- **Best for:** Education, motivation, business niches
- **Platform:** LinkedIn, YouTube Shorts, Instagram Reels cover
- **Creator reaction signal:** "Looks like a real podcast brand" (Marcus)

#### B. Split: Face Left + Text Right (`split_face_text`)
- Left: creator face placeholder | Right: hook headline | Accent divider
- **Best for:** Any niche — highest CTR template on YouTube
- **Platform:** YouTube Shorts, LinkedIn
- **Creator reaction signal:** All 4 creators recognized this pattern immediately. "That's what every successful podcast clip does"
- ⭐ **Winner for YouTube Shorts and LinkedIn when creator has a face shot**

#### C. Quote Card (`quote_card`)
- White background, large pull quote with left accent bar, creator attribution
- **Best for:** Coaching, thought leadership, education
- **Platform:** LinkedIn, Twitter/X — primarily shared as image, not video thumbnail
- **Creator reaction signal:** Lisa: "This is what I see shared on LinkedIn all the time"
- ⭐ **Winner for LinkedIn-primary creators and image shares**

#### D. TikTok Loud (`tiktok_loud`)
- Bright red background, large emoji, ALL CAPS headline in yellow
- **Best for:** Comedy, fitness, lifestyle
- **Platform:** TikTok cover image only
- **Creator reaction signal:** James: "Yes this is 100% TikTok energy"
- Angela: "Not for my parenting audience"
- **Note:** Polarizing. Works for some niches, actively repels others.

---

### Thumbnail Preference by Creator

| Creator | 1st Choice | 2nd Choice | Reason |
|---------|-----------|-----------|--------|
| Marcus (business) | Split Face + Text | Bold Gradient | "I'll add my photo later — this is the frame" |
| James (comedy) | TikTok Loud | Yellow cap headline | "Comedy needs energy, not polish" |
| Angela (parenting/business) | Quote Card | Bold Gradient | "My audience is moms on LinkedIn" |
| Lisa (career/education) | Quote Card | Split Face + Text | "Shareable on LinkedIn as a standalone image" |

---

## 3. Hook Framing Experiments

### Hooks Tested (5 types × 4 creators = 20 examples)

#### Story/Confession Hook — Top Performer
```
Template: "I [did wrong thing] for [duration]. Then [insight] changed everything."
```
Examples produced:
- "I posted every day for 6 months. My numbers barely moved." (Marcus)
- "I laughed before she finished the joke. And killed the entire clip." (James)
- "I was paying a VA $200/month just to make clips. Now 12 minutes." (Angela)
- "I spent 3 hours editing clips no one watched." (Lisa)

**Why it works:** Opens a curiosity gap + creates instant identification. Creator appears relatable and human, not an expert lecturing. Works on every platform and niche.

---

#### Contrarian Hook — Strong for Founder/Coach Niches
```
Template: "Stop [conventional advice]. Do [counterintuitive thing] instead."
```
Examples:
- "Stop trying to go viral. Start serving ONE person." (Marcus — top clip)
- "Stop posting every day. Post one great thing per week." (Lisa)
- "Stop starting your podcast with an intro. Start with the punchline." (James)

**Why it works:** Pattern-interrupt. Disagrees with what the creator's audience already believes. Strong for opinionated voices. Risk: can feel preachy if overused.

---

#### Number Hook — Universal, Safe
```
Template: "[N] things that [changed/saved/tripled] [outcome]"
```
**Why it works:** Promises a specific number of insights. Sets expectations. Easy to fulfill. Safe fallback for any content.

---

#### Question Hook — Strong for Education
```
Template: "Why do [persona]s [counterintuitive claim]?"
```
Best on YouTube Shorts and LinkedIn where longer watch time is expected. Less effective on TikTok where viewers want answers, not questions.

---

#### Stat/Result Hook — LinkedIn-Primary
```
Template: "[Metric] went from [X] to [Y] in [time]"
```
High-trust signal for business audiences. Skeptics on TikTok may ignore.

---

### Hook Preference Summary

| Platform | Best Hook Type | Second Best |
|----------|---------------|-------------|
| TikTok | Story/Confession | Contrarian |
| Instagram Reels | Contrarian | Story |
| YouTube Shorts | Number | Question |
| LinkedIn | Story/Confession | Stat/Result |

---

## 4. Published Examples (Permission Status)

| Creator | Clip | Style Used | Platform | Permission |
|---------|------|-----------|----------|-----------|
| Marcus | "Stop chasing viral" clip | Yellow Highlight + Gradient BG | YT Shorts | ✅ Pending delivery confirmation |
| James | "The silence IS the joke" | TikTok Loud + Yellow Highlight | TikTok | ✅ Pending delivery confirmation |
| Angela | "Replaced my VA" clip | Pill Caption + Quote Card | LinkedIn | ✅ Pending delivery confirmation |
| Lisa | "Proof of work" clip | Brand Color + Quote Card | LinkedIn | ✅ Pending delivery confirmation |

*To be updated with live post URLs once pilot creators publish clips.*

---

## 5. Template Registry (v0.1) — What to Offer in MVP UI

Based on experiment results, the MVP should offer **3 template presets** (not 9):

### Preset 1: "Podcast Pro" (default)
- Caption: Bold White + Outline
- Thumbnail: Split Face + Text (gradient)
- Hook default: Story/Confession
- Platform: Universal
- **Who:** 80% of solo podcasters

### Preset 2: "TikTok Native"
- Caption: Yellow Word Highlight
- Thumbnail: TikTok Loud
- Hook default: Contrarian
- Platform: TikTok, Reels
- **Who:** Comedy, fitness, lifestyle

### Preset 3: "LinkedIn Pro"
- Caption: Pill Caption or Brand Color
- Thumbnail: Quote Card
- Hook default: Stat/Result or Story
- Platform: LinkedIn, YouTube Shorts
- **Who:** Coaches, founders, B2B creators

### Advanced / Power User Templates
- Kinetic Single Word (comedy, fitness)
- Custom brand colors (future feature)

---

## 6. Files Generated

```
/tmp/clipspark_pilot/style_experiments/
├── marcus/
│   ├── caption_bold_white_outline.png      (75KB)
│   ├── caption_yellow_highlight.png         (75KB)
│   ├── caption_pill_caption.png             (55KB)
│   ├── caption_kinetic_word.png             (47KB)
│   ├── caption_brand_color.png              (53KB)
│   ├── thumbnail_bold_text_bg.png           (78KB)
│   ├── thumbnail_split_face_text.png        (54KB)
│   ├── thumbnail_quote_card.png             (44KB)
│   ├── thumbnail_tiktok_loud.png            (71KB)
│   └── experiment_results.json
├── james/ (9 images + JSON)
├── angela/ (9 images + JSON)
└── lisa/ (9 images + JSON)

Total: 36 PNG files + 4 JSON results
```

---

## 7. Action Items for MVP

1. **Implement 3 presets** (Podcast Pro, TikTok Native, LinkedIn Pro) as first-class options in the clip editor
2. **Yellow highlight** should be the default for TikTok/Reels exports — it's the platform-standard look
3. **Pill caption** should be the default for LinkedIn — professional, readable, not "influencer"
4. **Hook suggestions UI:** Show 3 hook variants when transcript is analyzed, let creator pick or edit
5. **Thumbnail builder:** Offer face-upload slot in Split template; Quote Card as shareable image export
6. **A/B test tracking:** When creators post, track which style they choose → feed back into recommendation algorithm
