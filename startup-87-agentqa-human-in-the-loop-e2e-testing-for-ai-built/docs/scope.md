# AgentQA — v1 Scope Decision

*Status: Draft for validation | Phase: Problem mining → Scope lock*

---

## Problem Statement

AI coding agents (Bolt, Lovable, Cursor, Replit Agent, Claude Code) can now generate and deploy working applications in hours. But they ship with no validation layer — no human has walked through the critical flows, no console errors have been checked, no auth bypass has been tested. 53% of AI-generated apps later reveal security issues that passed initial review. The people using these tools are non-technical founders and AI agent operators who have no access to traditional QA tooling (too expensive, too slow, too technical). The result: broken apps reach real users with no safety net.

---

## Target Customer (Ultra-Narrow)

**Primary:** Solo founders and indie hackers using vibe coding tools (Bolt, Lovable, Replit, Cursor) who are about to launch or just launched a web app, and have no technical QA capacity.

**Secondary:** Technical founders / small CTOs (3–10 person startups) using AI coding agents as junior devs, who need a human regression check after each major deploy.

**Explicitly NOT in v1:** Enterprise teams, mobile app testing, large QA campaigns, localization testing, performance testing.

---

## Core Use Case (The One Thing v1 Does)

A user submits their deployed web app URL + a plain-English description of what it should do. AgentQA assigns a trained human tester within minutes. The tester spends 10–30 minutes walking through the app's critical flows, capturing:
- Screen recording of the full session
- All network requests (captured via browser proxy)
- All console errors and warnings
- Written bug report in plain English

The user receives a structured test report (pass/fail per flow, bugs found, severity) within 2–4 hours. They can paste the report directly into their AI coding agent to fix issues.

---

## Explicit Constraints (What v1 Does NOT Do)

- ❌ No mobile testing (web only in v1)
- ❌ No automated test scripts or CI/CD integration
- ❌ No moderated live sessions (async only)
- ❌ No custom tester recruitment or demographic matching
- ❌ No performance / load testing
- ❌ No security audits (out of scope; security is a future tier)
- ❌ No enterprise contracts, SOW, or SLA guarantees
- ❌ No direct integration with coding tools (API comes in v2)
- ❌ No white-labeling or reseller program

---

## Success Criteria

1. **Turnaround:** ≥80% of tests delivered within 4 hours of submission
2. **Quality:** ≥85% of test reports rated "useful" or "very useful" by buyers (in-app rating)
3. **Revenue:** 10 paying customers within 60 days of launch, $1,000 MRR within 90 days
4. **Distribution:** Acquired at least 5 customers from vibe coding communities (Reddit, Discord, Twitter/X) without paid ads
5. **Retention:** ≥40% of first-time buyers submit a second test within 30 days

---

## Pricing Hypothesis

| Tier | Price | What's Included |
|------|-------|-----------------|
| **Basic** | $9/test | 10 min session, 1 core flow, written bug list, screen recording |
| **Standard** | $19/test | 20 min session, up to 3 flows, network + console logs, written report |
| **Deep** | $39/test | 30 min session, 5 flows, full structured report, severity ratings |

**Tester payout:** $8–15/session (depending on complexity). Margin: 40–60%.

**Volume:** No subscription in v1 — pure PAYG. Subscription considered at v2 once repeat behavior is validated.

---

## Go-to-Market Wedge (First 10 Customers)

1. **Vibe coding communities:** Post in r/vibecoding, r/bolt, Lovable Discord, Replit community. Offer first 10 tests free in exchange for honest feedback.
2. **Twitter/X indie hackers:** Find founders posting "just shipped with Lovable/Bolt" and DM them with a free test offer.
3. **Product Hunt launches:** Monitor daily PH launches for AI-built apps. Reach out the day of launch: "We spotted you launched — want a free QA pass?"
4. **AI agent developer Discord communities:** Devin, Claude Code, Cursor — find the channels where founders are building.
5. **YC W25/S25 founders:** A significant cohort is running AI-generated codebases. Reach out via Bookface or Twitter.

---

## Open Questions (To Validate in First 30 Days)

- Will founders pay before they've experienced a bug, or only after?
- Is 4-hour turnaround fast enough, or do they want same-hour results?
- Should the AI agent be the buyer, or the human overseeing the agent?
- Can we build a tester supply chain with freelance QA talent or does it require dedicated training?
- Is the primary value the bug report, or the "stamp of approval" / confidence?
