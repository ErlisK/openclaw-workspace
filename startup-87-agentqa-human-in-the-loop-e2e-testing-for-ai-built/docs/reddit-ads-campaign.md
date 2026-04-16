# BetaWindow — Reddit Ads Campaign

**Product:** BetaWindow.com — Human QA testing for AI-built apps  
**Goal:** Drive developer signups (first test submission)  
**Budget:** $300–$600/month | Daily cap: ~$20/day to start  
**Duration:** 14-day initial burst → evaluate → extend if CPA < $25  

---

## Campaign Structure

### Campaign: `BetaWindow_DevTarget_Q3`
- **Objective:** Conversions (Sign-ups / First Test Submission)
- **Budget type:** Daily — $20/day
- **Flight:** 14 days from launch
- **Device:** Desktop only (Chrome desktop required)

---

## Ad Groups

### Ad Group 1: `AI_Builders_Core`
**Targeting:**
- Subreddits: r/LocalLLaMA, r/MachineLearning, r/ChatGPT
- Interest: Artificial Intelligence, Technology
- Device: Desktop
- Bid type: CPC target — $1.20

### Ad Group 2: `Vibe_Coders_IndieHackers`
**Targeting:**
- Subreddits: r/SideProject, r/webdev, r/reactjs, r/nextjs
- Interest: Programming, Technology
- Device: Desktop
- Bid type: CPC target — $1.00

### Ad Group 3: `Learners_Broad`
**Targeting:**
- Subreddits: r/learnprogramming, r/webdev
- Interest: Programming
- Device: Desktop
- Bid type: CPC target — $0.80

---

## Ad Creatives

### Creative 1 — Pain Point Hook (Best performer prediction)
**Format:** Image Ad (1200×628px) + Link  
**Headline:** `Your AI built the app. Did it actually work?`  
**Body Text:**  
> AI agents are shipping code fast — but are they shipping *correct* code?  
> BetaWindow connects your AI-built app with real human testers in minutes.  
> 10–30 min tests. Detailed feedback. Network logs captured automatically.  
> From $5 per test.

**CTA:** Try BetaWindow Free  
**URL:** https://betawindow.com  
**Image concept:** Split screen — AI coding agent on left, real human tester giving thumbs up/down on right. Clean, dark dev aesthetic.

---

### Creative 2 — Direct Value Prop
**Format:** Image Ad (1200×628px) + Link  
**Headline:** `Human QA for AI-built apps. $5–$15 per test.`  
**Body Text:**  
> Built something with Cursor, Copilot, or an AI agent? Get a real human to test it end-to-end before your users do.  
> ✓ Console logs captured  
> ✓ Network requests logged  
> ✓ Video + written feedback  
> Ship with confidence.

**CTA:** Get Your First Test  
**URL:** https://betawindow.com  
**Image concept:** Browser window showing a web app with a checklist overlay. Green checkmarks. BetaWindow logo watermark.

---

### Creative 3 — Community/Relatable (r/SideProject, r/learnprogramming)
**Format:** Image Ad (1200×628px) + Link  
**Headline:** `"The AI said it works." — Famous last words.`  
**Body Text:**  
> We've all been there. The AI agent confidently ships a broken checkout, a login that doesn't log in, or a form that silently eats data.  
> BetaWindow hires real humans to test your AI-built apps before your users do.  
> 10–30 min sessions. Detailed reports. Under $15.

**CTA:** Test My App  
**URL:** https://betawindow.com  
**Image concept:** Meme-style image — developer looking at "works on my machine" joke + BetaWindow logo. Relatable, self-aware humor.

---

### Creative 4 — Feature Callout (r/webdev, r/reactjs, r/nextjs)
**Format:** Image Ad (1200×628px) + Link  
**Headline:** `Real user testing. Network logs included. Under $15.`  
**Body Text:**  
> BetaWindow doesn't just give you feedback — it shows you what broke and why.  
> Every session captures:  
> 📋 Console errors  
> 🌐 Network requests  
> 🎥 Screen recording  
> 💬 Written tester notes  
> Perfect for AI-built apps, side projects, and MVPs.

**CTA:** Start Testing  
**URL:** https://betawindow.com  
**Image concept:** Terminal/DevTools style UI showing captured logs + a chat bubble with tester feedback. Technical, clean.

---

## UTM Parameters

All ad URLs should use UTM tracking:

| Ad Group | UTM Source | UTM Medium | UTM Campaign | UTM Content |
|---|---|---|---|---|
| AI_Builders_Core | reddit | paid | ai_builders_q3 | pain_point / value_prop |
| Vibe_Coders | reddit | paid | vibe_coders_q3 | pain_point / community |
| Learners_Broad | reddit | paid | learners_q3 | value_prop / feature |

**Example URL:**  
`https://betawindow.com?utm_source=reddit&utm_medium=paid&utm_campaign=ai_builders_q3&utm_content=pain_point`

---

## Success Metrics (14-day check)

| Metric | Target | Kill switch |
|---|---|---|
| CTR | 0.3–0.8% | < 0.1% after 5 days |
| CPC | $0.60–$1.50 | > $3.00 sustained |
| CPA (signup) | < $25 | > $50 after 100 clicks |
| Daily spend | $15–$20 | Auto-cap at $20/day |

**After 14 days:**  
- Pause bottom-performing ad group  
- Double budget on top performer  
- A/B test new creative in surviving ad group  

---

## Setup Instructions (Manual via ads.reddit.com)

1. Go to https://ads.reddit.com → Create Campaign
2. Objective: **Conversions** (if pixel installed) or **Traffic** (simpler to start)
3. Campaign name: `BetaWindow_DevTarget_Q3`
4. Daily budget: **$20**
5. Create 3 Ad Groups per structure above
6. For each ad group, set subreddit targeting (Community Targeting)
7. Upload 4 creatives (1200×628px images required)
8. Set CTA buttons and URLs with UTM params
9. **Set end date: 14 days from today**
10. Submit for review (typically 24–48h review time)

---

## Pixel / Conversion Tracking

Install Reddit Pixel on betawindow.com for conversion tracking:
1. Reddit Ads → Tools → Reddit Pixel
2. Copy base pixel code → add to `app/layout.tsx` or via Google Tag Manager
3. Create conversion event: "Sign Up" / "Submit Test Request"
4. Use this to optimize toward CPA once you have 20+ conversions

---

## Budget Note

With $20/day cap and 14-day flight = **$280 total max spend**.  
This is within the $300–$600/month target and within the credit card daily limit.  
After day 14, evaluate before enabling continuation.
