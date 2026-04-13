# ClipSpark — Wedge Definition
**Phase 1 — Problem Mining & Wedge Selection**
**Last Updated:** April 2026

---

## The Wedge in One Sentence

**ClipSpark wins by being the only clips tool that nano-creators (solo podcasters, coaches, founders with <10k followers) can afford and actually stick with, because it's the only one that gets them from episode upload to posted clip in under 10 minutes at $5/month.**

---

## Primary Persona

### "Marcus" — The Weekly Solo Podcaster

**Demographics:**
- 30-45 years old
- Solo creator — no team, no VA
- Runs a niche podcast (business, self-help, tech, health, finance)
- 1,500–8,000 listeners per episode
- Posts 1 episode per week (45-60 min)
- Not monetized yet (or earning <$500/mo from podcast)
- Has a day job or runs a small consulting/coaching business on the side

**Current Setup:**
- Records on Zencastr, Descript, or Zoom
- Edits (barely) in Garageband or Descript
- Distributes via Buzzsprout or Spotify/Anchor
- Social presence: LinkedIn (primary), Instagram (secondary), experimenting with TikTok
- Follows "grow your podcast" advice online — knows clips are important

**Behavior:**
- Posts clips inconsistently — maybe 2-3x per month when he has time
- Has tried Opus Clip (too expensive or quality disappointed), maybe CapCut (too manual)
- Currently repurposing workflow is: watch episode → manually pick moments → trim in iMovie/CapCut → caption manually → post
- Spends 2-3 hours on clips per week on weeks he does it — often skips

**Goals:**
- Grow from 3k to 10k listeners in the next 12 months
- Establish himself as a thought leader in his niche via social
- Eventually monetize through sponsorships or coaching offers
- Keep his entire podcast production under 4 hours per week

**Frustrations (Verbatim-Style):**
- "I know I should be posting clips every week but I just don't have the time"
- "Opus Clip picks the wrong moments and costs too much for what I get"
- "I've tried 3 different tools and always go back to doing it manually"
- "I'm not a video editor and I don't want to become one"
- "I just want to upload my episode and have it done"

**Key Job-to-Be-Done Triggers:**
- Just finished recording a new episode
- Sees another podcaster posting viral clips and getting growth
- Realizes he hasn't posted clips in 2+ weeks
- Tried Opus Clip free trial but hit the limit or hated the credit system

---

## Secondary Personas (Future Expansion)

### "Sarah" — The LinkedIn Indie Coach
- Executive/life coach, 500 followers on LinkedIn
- Records weekly insights videos (20-30 min)
- Wants professional-looking clips for LinkedIn feed
- Needs: professional look, no trendy TikTok aesthetic, quiet authority

### "Dev" — The Indie Founder + Podcast Host
- B2B SaaS founder documenting the journey
- Weekly podcast/video update, 1,200 YouTube subscribers
- Wants clips for Twitter/X and LinkedIn
- Budget-conscious, technical enough to appreciate the workflow

---

## Job-to-Be-Done (JTBD Framework)

### Primary JTBD
**Situation:** When I finish recording my weekly podcast episode and want to grow my audience on social media,

**Motivation:** I want to quickly create shareable clips that look professional and make people want to listen to my full episode,

**Outcome:** So I can consistently post on TikTok, Instagram, and LinkedIn without spending hours editing every week, and finally build the social momentum I've been trying to get.

---

### Functional Job
*The practical task being accomplished:*
"Turn my 60-minute podcast episode into 5 ready-to-post short video clips with captions, titles, and hashtags in under 10 minutes."

### Emotional Job
*The feeling the user wants to have:*
"Feel like a professional content creator even though I'm doing everything alone, and stop feeling guilty about not posting consistently."

### Social Job
*How the user wants to be perceived:*
"Be seen as an active, consistent presence in my niche — someone worth following — not just a podcaster who disappears for weeks at a time."

---

## Key Constraints

### Time Constraint
- **Budget:** Max 15 minutes per episode on clip creation (goal state)
- **Current state:** 2-3 hours or zero (inconsistent)
- **Why it matters:** If it takes more than 20 minutes, they'll skip it this week. Then next week. Then they cancel.

### Money Constraint
- **Budget:** $5-10/month hard ceiling for solo creators without monetization
- **Willingness to pay:** High at $5, moderate at $10, drops sharply at $15+
- **Why it matters:** At $29/mo (Opus Clip Pro) on a podcast earning $0, the tool is a net loss. At $5/mo, it's a rounding error in their budget.

### Skill Constraint
- **Video editing experience:** Near zero — they're writers, speakers, or subject-matter experts
- **Design experience:** None for video — they can use Canva but not Premiere
- **Why it matters:** Tools that require learning a new interface lose this user in the first session. Must work like a simple upload-and-review flow.

### Consistency Constraint
- **The real enemy:** Inconsistency, not bad quality
- **Current behavior:** 20% of weeks they post clips; 80% they skip
- **Why it matters:** Even mediocre clips posted consistently outperform great clips posted sporadically. ClipSpark's value is making "good enough" clips achievable every single week.

### Social Platform Constraint
- **Platform mix:** Usually 2-3 platforms (LinkedIn + Instagram Reels + TikTok/Shorts)
- **Different requirements:** LinkedIn prefers square, no music; TikTok needs vertical, text hooks; YouTube Shorts needs first-3-second hook
- **Why it matters:** Multi-platform friction is the #2 manual time sink after clip selection

---

## Success Criteria for Wedge Validation

### Quantitative Signals (Pre-Launch)

| Metric | Target | Timeframe | Measurement Method |
|--------|--------|-----------|-------------------|
| Waitlist signups | ≥500 total | 60 days post-launch | Supabase waitlist table |
| Qualified nano-creator signups | ≥50 (solo creator + <10k followers) | 60 days | Persona fields on waitlist form |
| User interview completion | ≥15 interviews | 45 days | research_notes table in Supabase |
| Interview → "would pay $5/mo" | ≥70% | 45 days | Qualitative coding of notes |
| Email open rate (waitlist nurture) | ≥40% | 30 days | Agentmail/email tracking |
| Pain theme confirmation | ≥80% mention time as #1 problem | 15 interviews | Interview notes |
| Pain theme: price | ≥60% say current tools too expensive | 15 interviews | Interview notes |

### Quantitative Signals (Post-MVP Launch)

| Metric | Target | Timeframe | Measurement Method |
|--------|--------|-----------|-------------------|
| Paid conversion (waitlist → paying) | ≥10% | 30 days post-launch | Stripe + Supabase |
| Week 1 retention | ≥80% | Week 1 | Supabase activity tracking |
| Week 4 retention | ≥50% | Week 4 | Supabase activity tracking |
| Clips created per active user/week | ≥3 clips | Week 2-4 | Usage analytics |
| Time from upload to first clip | ≤10 min median | Week 1 | Usage analytics |
| NPS (post first use) | ≥40 | Week 2 | In-app survey |
| "Would recommend" (interviews) | ≥80% | Month 1 | Follow-up interviews |

### Qualitative Signals (Green Lights)

- Users describe the tool as "finally, something that just works"
- Users share clips they made and tag ClipSpark
- Community template submissions within first 30 days
- Users express frustration when they hit usage cap (proof of value)
- Inbound from YouTubers/podcasters asking to feature/review

### Qualitative Signals (Red Lights / Pivot Triggers)

- >50% of interviews don't name time as top pain point → wrong wedge
- <30% would pay at $5/mo → pricing or value prop problem
- Users churn in week 1 because AI quality is too low → need quality bar higher before launch
- No organic word-of-mouth in first 60 days → distribution/positioning problem

---

## Why This Wedge Is Defensible

### 1. Price Point Creates a New Market Segment
At $5/month, ClipSpark creates a category that hasn't existed. Opus Clip deliberately left the sub-$15 market unserved. This is not a race to the bottom — it's a different product for a different buyer.

### 2. Community Templates Are a Network Effect
Every clip template shared, every "winning" template flagged, every A/B result contributed makes the tool better. This is structural moat — competitors would need years of user data to replicate it, and they're currently not collecting it.

### 3. Niche Creator Loyalty Is Unusually Strong
Nano-creators are tight-knit. They share tools in Discord, Slack, Reddit, and IRL creator meetups. One advocate with 3k listeners can drive 50 signups in a week. The referral coefficient in this audience is high.

### 4. Incumbents Can't Easily Compete on Price
Opus Clip's cost structure (GPT-4 processing, video rendering at scale) makes it hard to drop below $15/mo profitably. ClipSpark's hybrid ASR+heuristics approach, render batching, and usage caps keep unit economics viable at $5/mo.

### 5. The Feedback Loop Compounds Over Time
Early adopters who opt into analytics feed the AI. The AI improves clip quality. Better quality increases retention. More retained users create more data. This flywheel takes years to build and is invisible to competitors until it's insurmountable.

---

## The Wedge Narrative (Elevator Pitch)

> "ClipSpark is for the podcaster with 2,000 listeners who records every week but posts clips once a month — because the tools available are either too expensive, too complex, or produce bad results. We give them 5 shareable clips from their episode in 10 minutes for $5/month. No credit system, no learning curve, no excuses. We're starting with solo podcasters because they have the clearest problem, the highest motivation, and they tell each other about tools that actually work."

---

## Next Steps (Phase 2 Priorities)

1. **Run 15 user interviews** via waitlist signups — validate JTBD, price sensitivity, platform priority
2. **Build MVP** focused on the core 10-minute workflow: upload → AI clips → captions → title → export
3. **Launch pricing at $5/mo** with a usage cap of 4 hours source video/month
4. **Community template seeding**: manually create 20 "winning" templates from research to bootstrap marketplace
5. **Instrument analytics** from day 1: time-to-first-clip, clips-per-session, rejection rate, export rate
