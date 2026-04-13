# ExpediteHub — Responsive Search Ad Variants
## Austin ADU Permit Campaign · Price Experiment A/B

---

## Variant A — "$199 Anchor" (Authority / Premium)
**Hypothesis:** High-intent searchers convert better with a credible price anchor that signals quality.
**UTM:** `utm_content=rsa-anchor-199`
**Landing URL:** `/lp/adu-permit-austin?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-permit&utm_content=rsa-anchor-199`

### Headlines (15 — Google picks best combos per query)
```
1. Austin ADU Permit — Done Right
2. City of Austin Permit Experts
3. $199 — Full ADU Permit Packet
4. AI-Filled BP-001 in 24 Hours
5. Licensed Austin Expediters
6. 97% Form Autofill — No Guesswork
7. Vetted DSD Specialists, Austin TX
8. Get Quoted by 3 Pros Today
9. Skip the DSD Queue — We Handle It
10. Plans + Permits for Austin ADUs
11. Austin SF-3 ADU Specialists
12. Trusted by Austin Homeowners
13. $199 Flat Fee — No Surprises
14. 5-Day Permit Packet Turnaround
15. Austin ADU Permit Marketplace
```

### Descriptions (4)
```
1. Post your ADU project and receive quotes from vetted Austin permit expediters within 24 hrs. AI auto-fills 97% of your City of Austin BP-001 packet. Starts at $199.
2. Licensed local expediters handle City of Austin DSD submission, corrections, and approvals. Milestone escrow protects your $199 deposit until work is done.
3. ExpediteHub's AI pre-fills all required Austin ADU permit documents — site plan checklist, drainage worksheet, impervious cover calc. Professional review from $199.
4. Compare quotes from 3+ vetted Austin permit pros. $199 covers AI packet prep + DSD submission. Average project saves 6–8 weeks vs. going it alone.
```

### Pin Recommendations
- Pin headline 1 or 2 to Position 1 (brand/authority)
- Pin headline 3 or 13 to Position 2 (price anchor)
- Rotate remaining 13 headlines in positions 1–3

---

## Variant B — "$99 Beta" (Urgency / Value / Early Access)
**Hypothesis:** Price-sensitive homeowners convert better on a lower beta price with urgency framing.
**UTM:** `utm_content=rsa-beta-99`
**Landing URL:** `/lp/adu-permit-austin-beta?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-permit&utm_content=rsa-beta-99`

### Headlines (15)
```
1. Austin ADU Permit — Start for $99
2. Beta Price: $99 Permit Packet
3. Limited Spots — Austin ADU Pros
4. AI-Powered Austin Permit Prep
5. $99 Gets You Permit-Ready Fast
6. City of Austin DSD Specialists
7. 97% BP-001 Autofill — $99 Flat
8. First 50 Projects — Beta Pricing
9. Austin ADU Permit Experts
10. Post Project → Get 3 Quotes
11. Vetted Expediters, Austin TX
12. $99 Now — Full Fee at Permit
13. Fast ADU Permits — Austin, TX
14. Skip the Wait — Start for $99
15. ADU Plans + Permit Help, Austin
```

### Descriptions (4)
```
1. For a limited time, post your Austin ADU project for just $99. AI pre-fills 97% of your City of Austin permit packet automatically. Get quotes from vetted local expediters in 24 hours.
2. Beta pricing: $99 secures your spot and triggers AI-assisted form prep for your Austin ADU permit. Licensed expediters review, finalize, and submit to DSD on your behalf.
3. Only 50 beta slots available at $99. Full Austin ADU permit service — BP-001, site plan, drainage worksheet, DSD submission — handled by licensed local professionals.
4. Pay $99 to get started. Our AI auto-fills your Austin permit forms; vetted local expediters do the rest. $99 is applied toward your final permit fee. Cancel anytime.
```

### Pin Recommendations
- Pin headline 1 or 14 to Position 1 (value hook)
- Pin headline 2 or 8 to Position 2 (urgency/scarcity)
- Rotate remaining headlines

---

## Ad Group Targeting

Both variants should run in **Ad Group 1: Austin-ADU-Permit** with the same keywords:
```
[Austin ADU permit]
"Austin ADU permit"
[City of Austin ADU permit expeditor]
"Austin permit expediter ADU"
[Austin ADU plans and permit]
```

**Test setup:**
- 50% impression share each (Google rotates automatically with RSAs)
- Minimum 7 days before evaluating winner
- Primary metric: `request_intent_submit` conversion rate
- Secondary: CTR (headline performance indicator)

---

## Landing Page Differences

| Element | Variant A ($199 Anchor) | Variant B ($99 Beta) |
|---------|------------------------|---------------------|
| Hero price line | "$199 flat fee — no surprises" | "Beta price: $99 — limited spots" |
| Hero CTA | "Start My Permit → $199 Flat Fee" | "Claim $99 Beta Spot →" |
| Sub-headline | "Licensed Austin expediters. Full packet." | "50 beta slots · First-come first-served" |
| Trust signal | "Trusted by 40+ Austin homeowners" | "Limited availability · Spots filling fast" |
| CTA bottom | "Get Started for $199 →" | "Lock In $99 Beta Price →" |
| Checkout | `price_1TKJ8tGt92XrRvUuMfpqSB3d` ($99) | `price_1TKJ8tGt92XrRvUuMfpqSB3d` ($99) |

Both variants use the same Stripe price ($99) — the anchor experiment is purely on ad copy + LP framing.

---

## Measurement Plan

| Metric | Source | Target |
|--------|--------|--------|
| CTR | Google Ads → utm_content | A vs B comparison |
| request_intent_submit rate | PostHog → utm_content filter | ≥10% |
| checkout_success | PostHog + Stripe | ≥1 in 3 days |
| CPC | Google Ads | ≤$4.00 |
| Clicks | Google Ads | ≥15 total |

**PostHog filter:** `utm_content = rsa-anchor-199` vs `rsa-beta-99`
