# ExpediteHub — Paid Ads Launch Brief
## 5-Minute Setup for Google / Microsoft Ads

### Campaign: ExpediteHub-Austin-ADU-Permits

**Goal:** ≥15 qualified clicks · ≥10% request_intent_submit rate · CPC ≤$4  
**Budget:** $10/day × 3 days = $30 (card daily limit $10)  
**Schedule:** 8 AM – 8 PM CST  
**Geo:** Austin, TX + 25-mile radius  

---

## Option A — Google Search Ads (preferred)

### 1. Sign In / Create Account
- Go to https://ads.google.com/
- Sign in with any Google account (Gmail, Workspace, etc.)
- If new: choose **Switch to Expert Mode** when prompted (skips auto-campaign wizard)

### 2. New Campaign
- Click **+ New campaign**
- Goal: **Website traffic**
- Campaign type: **Search**
- Website: `https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin`

### 3. Campaign Settings
```
Campaign name: ExpediteHub-Austin-ADU-Permits
Bidding: Manual CPC (turn off Enhanced CPC)
Default max CPC: $3.50
Daily budget: $10.00
Networks: Search Network only (uncheck Display)
Start/end: Start today, no end date
Ad schedule: Mon–Sun, 8:00 AM – 8:00 PM (Central time)
Location: Austin, Texas, United States + 25 miles
Language: English
```

### 4. Ad Groups & Keywords

**Ad Group 1: Austin-ADU-Permit** (Max CPC: $3.50)
```
[Austin ADU permit]
"Austin ADU permit"
[City of Austin ADU permit expeditor]
"City of Austin ADU permit"
[Austin permit expediter ADU]
"Austin permit expediter"
```

**Ad Group 2: Austin-ADU-Plans** (Max CPC: $3.00)
```
[Austin ADU plans and permit]
"Austin ADU plans and permits"
"ADU permit consultant Austin"
[Austin ADU architect permit]
```

**Ad Group 3: Permit-Help-Intent** (Max CPC: $2.50)
```
"ADU permit help Austin Texas"
"Austin building permit ADU help"
"how to permit an ADU in Austin"
```

**Negative keywords (add at campaign level):**
```
free, DIY, how to do it yourself, jobs, salary, hiring, school, course, class
```

### 5. Responsive Search Ad (copy-paste for Ad Group 1)

**Headlines (write all 15, Google picks best combos):**
```
1. Austin ADU Permits — Done Fast
2. Skip the DSD Queue — We Handle It
3. 97% AI-Autofilled Permit Packets
4. Vetted Austin Permit Expediters
5. Get Quotes in 24 Hours
6. ADU Permit Experts, Austin TX
7. From $99 — ADU Permit Help
8. City of Austin Permit Specialists
9. Plans + Permits for Your ADU
10. Licensed Expediters, Fast Turnaround
11. AI-Powered Permit Prep
12. Free Instant Permit Packet
13. Austin SF-3 ADU Specialists
14. Quote 3 Pros, Pick the Best
15. Start Your ADU Permit Today
```

**Descriptions (write 4):**
```
1. Post your ADU project and get quotes from vetted Austin permit expediters in 24 hrs. AI pre-fills 97% of your BP-001 packet automatically.
2. Licensed local expediters handle City of Austin DSD submission, corrections, and approvals. No back-and-forth — just results.
3. Get a free draft permit packet for your Austin ADU instantly. Compare quotes from vetted pros. Milestone escrow protects your deposit.
4. Over 30 Austin-area permit professionals ready to quote your ADU, addition, or deck project. Typical first response within 24 hours.
```

**Final URL:**
```
https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-permit&utm_content=rsa1
```

### 6. Conversion Tracking
- Set up conversion action → **Website**
- URL: contains `/success` → name `checkout_success`
- URL: contains `/request` → name `request_intent_submit` (page load; secondary)
- Tag the site OR use Google Tag Manager (Tag ID will be given after setup)

---

## Option B — Microsoft Advertising (Bing Ads)

Same settings, slightly lower CPCs. The Microsoft Ads UI is at https://ui.ads.microsoft.com/

**Differences:**
- Max CPC $2.50–$3.00 (Bing CPCs ~30% lower)
- Add LinkedIn Profile targeting: Job function = "Real Estate", "Architecture/Planning"
- Same ad copy works

---

## Option C — Reddit Ads (fastest to launch, no bot-block)

1. Go to https://ads.reddit.com/ → **Create Campaign**
2. **Campaign objective:** Traffic
3. **Budget:** $10/day
4. **Subreddit targeting:** r/Austin, r/austinhousingmarket, r/homeimprovement, r/REBubble
5. **Keyword targeting:** "ADU", "permit", "Austin Texas"
6. **Schedule:** 8 AM–8 PM CST

**Ad creative:**
```
Title: Skip the Austin DSD permit queue — AI-filled packet + vetted expediters

Body: Planning an ADU or addition in Austin? Our AI pre-fills 97% of your City of Austin permit packet automatically. Post your project and get quotes from 3+ vetted local expediters in 24 hours. First draft permit packet is free.

CTA: Get Free Permit Packet
URL: https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin?utm_source=reddit&utm_medium=cpc&utm_campaign=austin-adu-permit
```

---

## UTM + PostHog Attribution

All paid UTM parameters to use:
```
Google: ?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-permit
Bing:   ?utm_source=bing&utm_medium=cpc&utm_campaign=austin-adu-permit
Reddit: ?utm_source=reddit&utm_medium=cpc&utm_campaign=austin-adu-reddit
```

PostHog dashboard: https://us.posthog.com (project `phc_vFwCJti5FV7SzBjn3wcwHYciM7FAEdBaNaz7gZzfRsgq`)
- Filter by `utm_campaign = austin-adu-permit`
- Key events: `request_intent_submit`, `checkout_success`, `pageview`

---

## Daily Check (Admin Console)
Admin URL: https://startup-73-expeditehub-lean-startup.vercel.app/admin  
Secret: `xh-admin-192bc149cb4377f9955b461a`

Check: Projects tab (new leads), Pros tab (signups), Audit tab (activity)
