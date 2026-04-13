# ExpediteHub Google Search Ads — Campaign Setup Guide
# Campaign: Austin ADU Permits (3-day, $10/day = $30 total)
# Created: 2026-04-09

## STEP 1 — Create Google Ads Account

1. Go to https://ads.google.com/home/ → "Start Now"
2. Sign in with a Google account (create one at gmail.com if needed)
3. Skip the smart campaign creation wizard:
   - Click "Switch to Expert Mode" at the bottom of the first screen
4. Create campaign → Goal: "Get website visits" OR "Create campaign without goal"
5. Campaign type: **Search**

## STEP 2 — Campaign Settings

| Setting | Value |
|---------|-------|
| Campaign name | ExpediteHub-Austin-ADU-Permits |
| Networks | Google Search only (uncheck Search Partners and Display) |
| Locations | Austin, Texas + 30 mile radius |
| Languages | English |
| Budget | $10.00 / day |
| Bidding | Maximize Clicks → Set max CPC bid limit: **$4.00** |
| Ad schedule | Mon–Sun, 7am–9pm Central |
| Start date | Today |
| End date | Today + 3 days |

## STEP 3 — Ad Groups & Keywords

### Ad Group 1: "Austin ADU Permit" (Primary)
Bid: $3.50 max CPC

Keywords (exact match — use brackets):
```
[Austin ADU permit]
[Austin permit expediter ADU]
[City of Austin ADU permit expeditor]
[Austin ADU plans and permit]
```

Keywords (phrase match — use quotes):
```
"Austin ADU permit expediter"
"Austin permit expediting ADU"
"Austin ADU permit consultant"
"ADU permit Austin TX"
```

Negative keywords (add to campaign level):
```
free
DIY
[do it yourself]
Reddit
forum
job
salary
course
class
training
definition
what is
how to
Texas A&M
UT Austin
```

### Ad Group 2: "Austin ADU Plans" (Secondary)
Bid: $3.00 max CPC

Keywords:
```
[Austin ADU plans and permit]
"Austin ADU plans permit"
"ADU plans Austin"
"Austin backyard cottage permit"
"Austin garage conversion permit"
```

### Ad Group 3: "Permit Help Intent" (Broad Catch)
Bid: $2.50 max CPC

Keywords:
```
"Austin permit expediter"
"permit runner Austin"
"Austin DSD permit help"
"ADU permit Austin"
```

## STEP 4 — Responsive Search Ads (RSAs)

### RSA 1 — Ad Group 1 (Austin ADU Permit)
Final URL: https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-permit&utm_content=rsa1

Display path: expeditehub.com/austin-adu-permit

**Headlines (add all 8 — Google will test combinations):**
1. Austin ADU Permit Experts
2. 5-Day Permit Packet Guarantee
3. Licensed Austin Expediters
4. AI Pre-Fills Your DSD Forms
5. Get Quotes in 24 Hours
6. Skip the DSD Back-and-Forth
7. City of Austin ADU Specialists
8. Vetted Permit Pros — $99 Start
9. From Address to Permit-Ready
10. 97% DSD Form Auto-Fill Rate
11. Fast Austin ADU Permits
12. Beat the Permit Backlog
13. Austin SF-3 & SF-2 Zones
14. ADU Permit Packet in 5 Days
15. No Back-and-Forth With DSD

**Descriptions (add 4):**
1. Get a permit-ready ADU packet in 5 business days. AI auto-fills Austin forms, licensed pros review & submit to DSD.
2. Post your ADU project online. Vetted Austin expediters compete for your project. Deposits from $99.
3. AI pre-fills BP-001, drainage worksheet & impervious cover calc. Expert expediter submits to Austin DSD portal.
4. Licensed, vetted Austin permit expediters handle City of Austin DSD submissions. 5-day turnaround. Start for $99.

**Pin Headline 1** to position 1: "Austin ADU Permit Experts" or "Fast Austin ADU Permits"

---

### RSA 2 — Ad Group 2 (ADU Plans)
Final URL: https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-plans&utm_content=rsa2

Headlines:
1. Austin ADU Plans + Permits
2. AI-Assisted Permit Packets
3. Competitive Quotes in 24 Hrs
4. City of Austin Specialists
5. From Plans to DSD Submission
6. 97% Form Auto-Fill Rate
7. Austin ADU Code Experts
8. Beat the Permit Backlog
9. Detached ADU Permit Help
10. Garage Conversion Permits ATX
11. Backyard Cottage Permits Austin
12. Austin Land Development Code
13. ADU Permit Fast Track Austin
14. Plans + Permit — One Platform

Descriptions:
1. Upload your ADU plans and get a permit-ready packet in 5 days. We handle City of Austin DSD forms.
2. Match with licensed Austin expediters who specialize in SF-3 zones, ADUs, and garage conversions.
3. AI reads your Austin address, auto-fills all DSD forms. Expert permits your ADU faster than anyone else.
4. New Austin ADU permitting platform. AI + licensed expediters. Post your project, get quotes in 24 hours.

---

### RSA 3 — Ad Group 3 (Broad Intent)
Final URL: https://startup-73-expeditehub-lean-startup.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=austin-permit-help&utm_content=rsa3

Headlines:
1. Austin Permit Expediter Service
2. ADU Permit Help in Austin TX
3. Skip the Permit Line in Austin
4. Licensed Austin Permit Pros
5. Fast Permit Expediting Austin
6. DSD Permit Submission Help

Descriptions:
1. Get a licensed Austin permit expediter to handle your ADU, addition, or deck permit from start to finish.
2. AI pre-fills City of Austin forms. Licensed expediters submit directly to Austin DSD. Deposits from $99.

## STEP 5 — Ad Extensions

### Sitelink Extensions (Campaign Level)
| Sitelink | URL |
|----------|-----|
| How It Works | /lp/adu-permit-austin |
| For Permit Pros | /pro |
| Start My ADU Permit | /request |
| See a Sample Packet | / |

### Callout Extensions
- Licensed & Vetted Pros
- 5-Day Turnaround
- AI-Assisted DSD Forms
- Austin Permit Specialists
- $99 Deposit to Start
- No Hidden Fees

### Structured Snippet (Type: Services)
- ADU Permits
- Garage Conversions
- Backyard Cottages
- Plan Drafting
- DSD Form Auto-Fill
- Permit Corrections

## STEP 6 — Conversion Tracking

### Conversion Action 1: Form Submit (request_intent_submit)
1. Google Ads → Tools → Conversions → + New Conversion
2. Type: Website
3. Name: "ADU Request Submit"
4. Category: Submit lead form
5. Value: $0 (lead, no value yet)
6. Count: Every
7. Attribution: Last click
8. Tag setup: Copy the gtag snippet → paste into Vercel env vars:
   - `NEXT_PUBLIC_GOOGLE_TAG_ID` = AW-XXXXXXXXXX
   - `NEXT_PUBLIC_GOOGLE_CONVERSION_ID` = AW-XXXXXXXXXX
   - `NEXT_PUBLIC_GOOGLE_CONV_LABEL_INTENT` = ABC123xyz

### Conversion Action 2: Purchase (checkout_success)
1. Type: Website
2. Name: "ADU Deposit Paid"
3. Category: Purchase
4. Value: Use transaction-specific value (passed from JS)
5. Tag: same gtag, different label
   - `NEXT_PUBLIC_GOOGLE_CONV_LABEL_PURCHASE` = DEF456uvw

### After getting IDs, add to Vercel:
```
npx vercel env add NEXT_PUBLIC_GOOGLE_TAG_ID
npx vercel env add NEXT_PUBLIC_GOOGLE_CONVERSION_ID
npx vercel env add NEXT_PUBLIC_GOOGLE_CONV_LABEL_INTENT
npx vercel env add NEXT_PUBLIC_GOOGLE_CONV_LABEL_PURCHASE
```
Then redeploy: `npx vercel --prod --token $VERCEL_ACCESS_TOKEN --yes`

## STEP 7 — Billing Setup

Payment method: Credit card ending in CREDIT_CARD_1
- Card: Mastercard
- Expiry: 04/32
- CVC: 159
- Billing zip: 94564
- Name/Address: 2298 Johanna Court, Pinole, CA 94564

Budget cap settings:
- Daily budget: $10.00 (respects card's $10/day limit)
- Monthly cap: $30.00 (set via "Budget options" in campaign settings)

## STEP 8 — Monitoring

After campaign launches, check after 24h:
- Impressions, clicks, CTR, avg CPC
- Quality Score for each keyword
- Search terms report (add negatives)
- Conversions (if tagged)

Target metrics:
- CPC ≤ $4.00
- CTR ≥ 5% for exact match
- Impressions ≥ 50/day per keyword
- Conversions ≥ 1 over 3 days

## Landing Page URLs (live after deploy)

Primary (Paid LP): 
  https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin

Homepage:
  https://startup-73-expeditehub-lean-startup.vercel.app/

Request Form:
  https://startup-73-expeditehub-lean-startup.vercel.app/request

## UTM Parameters Used

| Param | Ad Group 1 | Ad Group 2 | Ad Group 3 |
|-------|-----------|-----------|-----------|
| utm_source | google | google | google |
| utm_medium | cpc | cpc | cpc |
| utm_campaign | austin-adu-permit | austin-adu-plans | austin-permit-help |
| utm_content | rsa1 | rsa2 | rsa3 |
