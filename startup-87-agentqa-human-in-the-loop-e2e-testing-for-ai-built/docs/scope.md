# AgentQA — v1 Scope Decision

*Status: **LOCKED** | Phase: Scope lock → Build*  
*Last updated: April 2026*

---

## Problem Statement

AI coding agents (Bolt, Lovable, Cursor, Replit Agent, Claude Code) can now generate and deploy working applications in hours. But they ship with no validation layer — no human has walked through the critical flows, no console errors have been checked, no auth bypass has been tested. 53% of AI-generated apps later reveal security issues that passed initial review. The people using these tools are non-technical founders and AI agent operators who have no access to traditional QA tooling (too expensive, too slow, too technical). The result: broken apps reach real users with no safety net.

---

## Target Customer (Ultra-Narrow)

**Primary:** Solo founders and indie hackers using vibe coding tools (Bolt, Lovable, Replit, Cursor) who are about to launch or just launched a **public web app** (no login required), and have no technical QA capacity.

**Secondary:** Technical founders / small CTOs (3–10 person startups) using AI coding agents as junior devs, who need a human regression check after each major deploy of a public-facing page.

**Explicitly NOT in v1:**
- Apps behind login walls or auth gates
- Enterprise teams
- Mobile apps (iOS, Android, React Native)
- Large QA campaigns
- Localization or accessibility testing
- Performance testing

---

## Core Use Case (The One Thing v1 Does)

A user submits their **publicly accessible** deployed web app URL + a plain-English description of what it should do. AgentQA assigns a trained human tester within minutes. The tester opens the app in a **Chrome desktop** browser session inside the AgentQA platform, which automatically captures all network requests and console output during the session.

The tester spends the allotted time walking through the app's critical flows. The session produces:
- **Screen recording** of the full session (video)
- **All network requests** (XHR/fetch — URL, method, status code, response time) — captured via platform proxy, no SDK install required
- **All console errors and warnings** — captured via Chrome DevTools protocol
- **Written bug report** in plain English (severity, repro steps, screenshot)
- **AI-generated summary** — one paragraph the founder can paste directly into their AI coding agent

The user receives the full structured report within the tier's committed turnaround window.

---

## V1 Hard Constraints (Non-Negotiable)

### App Requirements
- ✅ **Public URL only** — app must be accessible without login, signup, invite code, or VPN
- ✅ **Web app only** — must run in Chrome desktop browser
- ✅ **Live deployment required** — staging OK; localhost NOT supported in v1
- ❌ No apps requiring authentication flows to test core functionality
- ❌ No mobile-only apps or native apps
- ❌ No apps behind Cloudflare bot protection or IP allowlist

### Testing Environment
- ✅ **Chrome desktop only** (latest stable)
- ✅ **1080p viewport** (1920×1080) — single consistent environment
- ❌ No cross-browser testing (Firefox, Safari, Edge deferred to v2)
- ❌ No mobile viewport simulation
- ❌ No multi-tab or multi-window scenarios in v1

### Platform Scope
- ✅ Async testing only — tester works independently, no live moderation
- ✅ PAYG per-test pricing — no subscription, no contracts in v1
- ✅ Self-serve — no sales call required, credit card at checkout
- ❌ No SDK or script install required on tested app (proxy-based capture only)
- ❌ No CI/CD integration or API (v2)
- ❌ No tester selection / demographic matching (platform assigns testers)
- ❌ No enterprise contracts, SOW, or SLA guarantees
- ❌ No white-labeling or reseller program

---

## Test Tiers (Locked)

| Tier | Duration | Price | Flows Covered | Deliverables |
|------|----------|-------|---------------|--------------|
| **Quick** | 10 minutes | **$5** | 1 core flow | Screen recording, console errors, network requests, plain-English bug list |
| **Standard** | 20 minutes | **$10** | 3 flows | All of Quick + structured bug report with severity ratings, AI summary |
| **Deep** | 30 minutes | **$15** | 5+ flows | All of Standard + full exploratory pass, edge cases, AI summary with repro steps |

**Tester payout:**
- Quick: $3 (60% margin)
- Standard: $6 (40% margin)
- Deep: $9 (40% margin)

**Why these prices:** $5–$15 is impulse-buy range for a founder who just shipped something and wants peace of mind. It's less than an hour of freelancer time and less than the cost of the LLM tokens used to build the app.

**No subscription in v1.** Subscription / credit packs considered at v2 once repeat behavior validated.

---

## What a "Flow" Means in v1

A **flow** is one user journey from entry to completion, e.g.:
- Landing page → CTA click → pricing page
- Sign-up form → submission → confirmation screen
- Product page → add to cart → checkout initiation
- Dashboard → create item → see item in list

The buyer specifies flows in plain English when submitting. The tester follows them exactly plus notes anything obviously broken they encounter along the way.

---

## Success Criteria

1. **Turnaround SLA:** ≥80% of Quick tests delivered within 2 hours; ≥80% of Deep tests within 4 hours
2. **Report quality:** ≥85% of test reports rated "useful" or "very useful" by buyers (in-app 5-star rating)
3. **Revenue:** 10 paying customers within 60 days of launch; $1,000 MRR within 90 days
4. **Distribution:** ≥5 customers acquired from vibe coding communities (Reddit, Discord, Twitter/X) without paid ads
5. **Retention:** ≥40% of first-time buyers submit a second test within 30 days

---

## Pricing Rationale

| Comparison | Cost |
|-----------|------|
| 1 hour of Upwork QA freelancer | $15–$40 |
| UserTesting unmoderated session | ~$80–$100 |
| PlaybookUX unmoderated participant | $65 |
| AgentQA Quick (10 min) | **$5** |
| AgentQA Deep (30 min) | **$15** |

We are **5–20× cheaper** than the nearest comparable, with faster turnaround and built-in observability (network + console logs) that no competitor provides without SDK install.

---

## Go-to-Market Wedge (First 10 Customers)

1. **Vibe coding communities:** Post in r/vibecoding, r/bolt, Lovable Discord, Replit community. Offer first 10 tests free in exchange for honest feedback.
2. **Twitter/X indie hackers:** Find founders posting "just shipped with Lovable/Bolt" and DM them with a free test offer.
3. **Product Hunt launches:** Monitor daily PH launches for AI-built apps. Reach out the day of launch: "We spotted you launched — want a free QA pass?"
4. **AI agent developer communities:** Devin, Claude Code, Cursor Discord — find where founders are building.
5. **YC W25/S25 founders:** Significant cohort runs AI-generated codebases. Reach via Bookface or Twitter.

---

## V1 Build Scope (What Gets Built First)

1. **Submit form** — URL + flow descriptions + tier selection + payment (Stripe)
2. **Tester dashboard** — embedded Chrome iframe showing the app + network log panel + console log panel + screen recorder
3. **Report delivery** — structured report page (video playback, network table, console log, bug list, AI summary)
4. **Tester management** — internal admin to assign/dispatch tests to vetted testers

**Deferred to v2:**
- API / webhook for AI agent integration
- Subscription / credit packs
- Auth-required app testing (sandboxed credential injection)
- Cross-browser (Firefox, Safari)
- Mobile viewports
- Tester rating/review system

---

## Open Questions (To Validate in First 30 Days)

- Will founders pay $5 before they've experienced a bug, or only after?
- Is 2-hour turnaround for Quick fast enough, or do they want same-30-minute results?
- Does "no login required" meaningfully limit the market, or do most vibe-coded apps start public anyway?
- Can we source reliable testers from QA freelance communities (Upwork, Contra) without a vetting backlog?
- Is the AI summary the primary value to non-technical founders, or is it the video?
