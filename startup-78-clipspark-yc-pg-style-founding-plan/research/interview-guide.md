# ClipSpark — User Interview Guide
**Version:** 1.0 | **Duration:** 30-40 min | **Format:** Video or Audio call

---

## Pre-Interview Setup

1. Send calendar invite with Zoom/Google Meet link
2. Ask permission to record (for notes in Supabase `research_notes`)
3. Confirm they fit persona: solo creator, <10k followers, posts weekly (or wants to)

---

## Opening (2 min)

> "Thanks for chatting! I'm building a tool for podcast/content creators and I just want to understand your experience — there are no right or wrong answers. I'm going to learn from you, not sell to you. Cool if I take notes?"

---

## Section 1: Context & Persona (5 min)

1. **Tell me about your show/content.** What's it about? How long have you been doing it?
2. **How often do you publish?** Weekly, bi-weekly, monthly?
3. **Where does your audience live?** (YouTube, Spotify, LinkedIn, etc.)
4. **Rough listener/follower count?** (Doesn't need to be exact)
5. **Is this a side project or main thing?** How much time do you spend on it total per week?

*Tag: `persona`, `frequency`*

---

## Section 2: Current Repurposing Workflow (8 min)

6. **Walk me through what happens after you hit 'publish' on an episode.** Do you create clips? How?
7. **How long does the clip creation process take you?** Per episode?
8. **What tools do you use?** (Probe: anything for video editing, captions, scheduling, design?)
9. **How much do you spend per month on these tools combined?**
10. **What does 'done' look like?** What's your goal for each clip?

*Tag: `workflow`, `current_tools`, `spend`*

---

## Section 3: Pain Points (10 min)

11. **What's the most frustrating part of creating clips?** (Let them talk)
12. **Have you tried automating this?** What happened?
13. **If you had a magic wand, what would the ideal workflow look like?** Time/effort/tools?
14. **Have you ever given up on clips for a period?** What made you stop? What brought you back?
15. **What's the #1 reason you don't post clips more consistently?**

*Tag: `pains`*

---

## Section 4: Tool Experience (5 min)

16. **Have you tried [Opus Clip / Descript / Riverside / CapCut]?** (Ask about each they mentioned)
   - What worked?
   - What didn't work?
   - Why did you stop (if they did)?
17. **What's the most you'd pay per month for a tool that solved your clips problem?**

*Tag: `current_tools`, `spend`*

---

## Section 5: Desired Outcome (5 min)

18. **Imagine your ideal clips workflow — what does it look like?**
19. **What would "success" look like 6 months from now if clips were going well?**
20. **If clips were automated — what would you do with the saved time?**

*Tag: `desired_outcome`*

---

## Section 6: ClipSpark Concept Test (5 min)

> "I'm building something called ClipSpark. Here's the idea: you upload your episode, AI picks the best 5-7 moments, auto-captions them, suggests a title and hashtags, and you can export to TikTok/Reels/Shorts/LinkedIn in about 10 minutes. It would be $5/month flat, no credit system."

21. **What's your first reaction?**
22. **What concerns you about this?**
23. **What would make you sign up vs hold off?**
24. **Would you pay $5/month for this? $10/month?**
25. **Who else would you tell about this if it worked really well?**

---

## Closing (2 min)

> "This is super helpful. Last question — is there anyone else in your creator network I should talk to? Anyone with similar frustrations?"

- Collect: email for waitlist, permission to follow up
- Offer: early access / 3 months free at launch
- Confirm: OK to store notes in our research database

---

## Scoring Rubric (fill out after call)

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Pain intensity | | Is clips really their #1 content problem? |
| Price fit | | Would they pay $5/mo without hesitation? |
| Workflow match | | Weekly publisher, <10k followers? |
| Referral potential | | Would they tell 3+ people? |
| Adoption risk | | Any blockers (technical, behavioral)? |

**Total score:** /25 — ≥18 = strong signal, 12-17 = moderate, <12 = weak fit

---

## Data to Capture in Supabase `research_notes`

```json
{
  "participant_email": "...",
  "interview_date": "YYYY-MM-DD",
  "summary": "One-paragraph summary of key findings",
  "pain_points": {
    "primary": "time-too-high",
    "secondary": ["pricing-mismatch", "ai-quality"],
    "verbatim_quote": "exact quote from interviewee",
    "current_tools": ["Opus Clip", "CapCut"],
    "spend_monthly": 29,
    "episodes_per_week": 1,
    "would_pay_5": true,
    "would_pay_10": false,
    "referral_potential": "high",
    "fit_score": 21
  },
  "notes": "Free-form notes from call"
}
```
