# ExpediteHub — Google Ads 10-Minute Manual Setup Guide

## Before You Start (2 min)

You need:
- A Google account (personal Gmail works)
- Credit card ready: **Mastercard, expiry 04/32, CVC 159, billing zip 94564**
- This page open in another tab: https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin

---

## Step 1: Create Google Ads Account (3 min)

1. Go to: **https://ads.google.com**
2. Click **"Start now"** → Sign in with your Google account
3. When it asks for a goal, click **"Switch to Expert Mode"** (small link at bottom)
4. Click **"Create an account without a campaign"** (bottom of page)
5. Set your billing country: **United States**, timezone: **America/Chicago**
6. Click **"Submit"** — you're in!

---

## Step 2: Create the Campaign (4 min)

1. Click the **"+ New campaign"** button
2. **Goal:** Select **"Website traffic"**
3. **Campaign type:** Select **"Search"**
4. **Website:** Enter `https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin`
5. Click **"Continue"**

### Campaign Settings:
- **Campaign name:** `ExpediteHub-Austin-ADU-Permits`
- **Bidding:** Select **"Clicks"** → Set max CPC limit → enter **$4.00**
- **Budget:** `$10` per day
- **Start date:** Today
- **End date:** 3 days from today
- **Networks:** ✅ Google Search only (UNCHECK Display Network and Search Partners)
- **Locations:** Click "Enter another location" → type **"Austin, Texas"** → Add → also add **"Travis County, Texas"**
  - Set to: **"People in or regularly in these locations"**
- **Languages:** English

Click **"Next"**

---

## Step 3: Create Ad Groups (3 min)

### Ad Group 1: "Austin ADU Permit"
- **Ad group name:** `Austin ADU Permit`
- **Max CPC:** $3.50
- **Keywords** (copy-paste each on a new line, include brackets for exact match):
```
[Austin ADU permit]
[Austin ADU permit expeditor]
"Austin ADU permit"
[City of Austin ADU permit]
[Austin detached ADU permit]
```

### Ad Group 2: "Austin ADU Plans"
Click **"+ Add ad group"**
- **Ad group name:** `Austin ADU Plans`
- **Max CPC:** $3.00
- **Keywords:**
```
[Austin ADU plans and permit]
[Austin ADU plan drafter]
"ADU plans Austin TX"
[Austin ADU architect permit]
```

### Ad Group 3: "Permit Help Intent"
Click **"+ Add ad group"**
- **Ad group name:** `Permit Help Intent`
- **Max CPC:** $2.50
- **Keywords:**
```
[Austin permit expediter ADU]
"permit expediter Austin"
[Austin permit consulting ADU]
"Austin permit help ADU"
```

Click **"Next"**

---

## Step 4: Create Ads

### For Ad Group 1 — Create 1 Responsive Search Ad:

**Final URL:** 
```
https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-permit&utm_content=rsa1
```

**Headlines** (add all 15):
```
Austin ADU Permit Help
ADU Permit Expediter Austin
Get Your ADU Permit Fast
Austin ADU Permit Services
Expert ADU Permit Help TX
Skip the Permit Backlog
ADU Permits in Austin TX
AI-Powered Permit Packets
Vetted Austin Permit Pros
Free Instant ADU Estimate
Austin ADU Plans + Permit
Your ADU Permit Expedited
Permits Filed in 24 Hours
Austin DSD Permit Experts
Start Your ADU Today
```

**Descriptions** (add all 4):
```
AI fills 97% of your Austin DSD forms automatically. Get quotes from vetted permit expediters in 24h.
Stop chasing paperwork. Our permit pros handle Austin ADU applications from BP-001 to final approval.
Free AI permit packet + local expert quotes. Most Austin ADU permits submitted within 7 days.
Vetted Austin permit expediters, plan drafters & code consultants. Transparent pricing, milestone escrow.
```

Click **"Done"** → **"Next"**

---

## Step 5: Set Up Billing

1. **Account type:** Individual
2. **Name:** Alex Chen
3. **Address:** 2298 Johanna Court, Pinole, CA 94564
4. **Card number:** (enter from CREDIT_CARD_1)
5. **Expiry:** 04/32
6. **CVC:** 159
7. Click **"Submit"**

---

## Step 6: Add Negative Keywords (1 min)

After the campaign is created, go to **Keywords → Negative Keywords** and add:
```
rent
rental
multifamily
commercial
warehouse
garage
rv park
granny flat law
diy adu
adu financing
```

---

## Step 7: Verify Conversion Tracking (Optional, 2 min)

The landing page at `/lp/adu-permit-austin` links directly to `/request`. When a homeowner submits the intake form, that counts as a conversion. PostHog is already tracking `request_intent_submit` events.

To add Google conversion tracking later:
1. In Google Ads → Tools → Conversions → **+ New Conversion**
2. Choose **"Website"**  
3. Track **"Submit lead form"** on `/success` page
4. Copy the global tag ID and add to Vercel: `NEXT_PUBLIC_GOOGLE_TAG_ID`

---

## Expected Results (3-day run, $30 total)

| Metric | Target |
|--------|--------|
| Impressions | 200–500 |
| Clicks | 15–30 |
| CPC | $1.50–$3.50 |
| Landing → Request form submit | ≥10% |
| Paid deposit ($99–$149) | ≥1 |

Campaign will pause automatically after 3 days / $30 spent.

---

## Live Links
- **Landing page:** https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin
- **Request intake:** https://startup-73-expeditehub-lean-startup.vercel.app/request
- **Admin console:** https://startup-73-expeditehub-lean-startup.vercel.app/admin
  - Secret: `xh-admin-192bc149cb4377f9955b461a`

---

*Created: 2026-04-09 | Budget: $10/day × 3 days = $30 total*
