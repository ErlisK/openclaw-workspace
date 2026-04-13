# Hypothesis Grid v0.1 — Change Risk Radar
**Phase 1 Customer Discovery · January 2025**

---

## Ideal Customer Profiles (ICPs)

### ICP-1: E-commerce Growth Teams 🛒 [PRIMARY]
- **Profile**: DTC/marketplace brands $1M–$50M ARR, Shopify + Stripe + logistics stack, lean ops team
- **Key Tools**: Shopify, Stripe, ShipBob, Klaviyo, Meta Ads, Google Ads
- **Pain**: Shopify checkout changes break conversion flows; Stripe fee changes erode margins silently
- **Willingness to Pay**: $99–$299/mo hypothesis

### ICP-2: B2B SaaS Ops/Engineering 🔧 [PRIMARY]
- **Profile**: SaaS companies 10–200 employees, engineering/ops owns vendor stack
- **Key Tools**: AWS, GitHub, Stripe, Twilio, Okta, Datadog, PagerDuty
- **Pain**: AWS API deprecations discovered when things break; Okta changes cause production incidents
- **Willingness to Pay**: $199–$499/mo hypothesis

### ICP-3: Multi-Client Agencies 🏢 [SECONDARY]
- **Profile**: Digital agencies managing 10–50 client tech stacks
- **Key Tools**: Shopify, Google Workspace, Meta Ads, HubSpot, Mailchimp
- **Pain**: Can't track vendor changes across 30+ client stacks; client finds issue before agency = trust damage
- **Willingness to Pay**: $299–$999/mo (multi-client pricing) hypothesis

### ICP-4: CFO/Finance-Led Compliance ⚖️ [SECONDARY]
- **Profile**: Finance/legal teams at mid-market companies owning SaaS spend + compliance
- **Key Tools**: Stripe, QuickBooks, Xero, Chargebee, Salesforce, DocuSign
- **Pain**: Payment processor fee changes hit P&L without warning; ToS updates create undetected compliance exposure
- **Willingness to Pay**: $199–$499/mo hypothesis

### ICP-5: Startup CTOs 🚀 [TERTIARY]
- **Profile**: Technical co-founders at seed–Series A startups
- **Key Tools**: Vercel, Supabase, Stripe, AWS, GitHub, Cloudflare
- **Pain**: Too busy to read every changelog; pricing changes hit burn rate without notice
- **Willingness to Pay**: $49–$99/mo hypothesis

---

## Problem Hypotheses

| ID | Problem Statement | Severity | Status |
|----|-------------------|----------|--------|
| P-1 | Companies discover vendor changes reactively—only when something breaks | Critical | Hypothesis |
| P-2 | No cross-vendor change monitoring tool exists | High | Hypothesis |
| P-3 | Pricing/ToS changes are most damaging but least tracked | High | Hypothesis |
| P-4 | Operations teams lack shared view of vendor change risk | High | Hypothesis |
| P-5 | API deprecations cost mid-market avg $47K per incident | Critical | To Validate |
| P-6 | Security policy changes create undiscovered compliance gaps | Critical | Hypothesis |
| P-7 | Agencies waste significant time manually checking vendor updates | Medium | To Validate |

---

## Value Proposition Hypotheses

| ICP | Value Prop | Confidence |
|-----|-----------|------------|
| All | Early warning in plain English (not developer jargon) | High |
| E-commerce + CFO | Pricing & margin protection alerts | High |
| B2B SaaS + CTOs | Security posture awareness for auth changes | Medium |
| CFO/Legal | Compliance & legal risk detection via ToS diffs | Medium |
| Agencies | Multi-client risk dashboard | Medium |
| B2B SaaS | Cross-vendor risk correlation | Low |

---

## Go-to-Market Channel Hypotheses

| Channel | Priority | Cost | Time to Results |
|---------|----------|------|-----------------|
| LinkedIn founder outreach to CTOs/Ops Heads | Primary | Time only | 1–2 weeks |
| Hacker News (Show HN + Observatory as free tool) | Primary | Time only | 1 day |
| SEO content (vendor change summaries) | Primary | Low | 4–8 weeks |
| Twitter/X tech community | Secondary | Time only | 2–4 weeks |
| Slack/Discord communities (IH, SaaS founders) | Secondary | Time only | 1–2 weeks |
| Agency & consultant partnerships | Tertiary | Medium | 4–8 weeks |

---

## Pricing Hypotheses

| Tier | Price | ICP | WTP Signal | Status |
|------|-------|-----|-----------|--------|
| Starter | $99/mo | Startup CTOs | Needs 5 interviews | Hypothesis |
| Growth | $299/mo | B2B SaaS Ops | Needs 10 interviews + 10 deposits | Hypothesis |
| Enterprise | Custom ($2–5K/mo) | Enterprise Ops | Needs 3 enterprise conversations | Hypothesis |

**Refundable Deposit**: $50 deposit to lock in founding-member pricing (30% off forever)

---

## Validation Plan

### Interviews Needed
- 5× ICP-1 (E-commerce ops leads at Shopify-based brands)
- 5× ICP-2 (Engineering/CTO at 10–100 person SaaS)
- 3× ICP-3 (Agency owners managing multi-client stacks)
- 3× ICP-4 (CFO/Finance at $10M+ ARR companies)

### Key Questions
1. "When did you last discover a vendor change the hard way?"
2. "How do you currently monitor your tool stack for changes?"
3. "Which vendor change would be most painful to miss?"
4. "Would you pay $X/mo for an automated alert system?"

### Validation Criteria
- ≥7/10 interviewees confirm P-1 (reactive discovery) as real
- ≥5/10 express willingness to pay $99–$299/mo
- ≥10 refundable deposits collected
