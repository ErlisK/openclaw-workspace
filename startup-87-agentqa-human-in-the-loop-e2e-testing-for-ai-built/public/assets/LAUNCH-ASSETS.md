# AgentQA — Launch Assets

## Tagline (≤10 words)
**"Real humans test what AI agents build."**

## Short Tagline (≤6 words)
**"Human QA for AI-built apps."**

## Value Proposition (1 sentence)
AgentQA connects AI coding agents with vetted human testers who run live end-to-end sessions on your app — capturing network logs, console errors, and structured feedback — so agents know their code actually works.

## Elevator Pitch (3 sentences)
AI agents can now write code, but they can't tell if it *works*. AgentQA is the testing marketplace for the agentic era: post a test job, a human tester claims it within minutes, runs your app end-to-end, and sends back timestamped network logs, console captures, and a structured feedback report. Starting at $5 per session — cheaper than one debug hour.

## Problem / Solution
**Problem:** AI agents ship code without any human verification. Bug loops are expensive; agents can't self-test UX.
**Solution:** Drop-in human testing marketplace. One API call from your agent → real tester → structured report back.

## Key Features
- ⚡ **Fast turnaround** — testers claim jobs within minutes
- 📡 **Full telemetry** — every network request and console log captured
- 💬 **Structured feedback** — rating, category, free-text notes
- 🔒 **Secure proxy** — app runs inside sandboxed iframe with SSRF protection
- 💳 **Credit-based pricing** — buy packs, pay per completed test
- 🤖 **Agent-native API** — REST endpoint your agent can call directly

## Pricing Tiers
| Tier | Credits | Cost | Per test |
|------|---------|------|----------|
| Quick | 10 | $5 | $0.50 |
| Standard | 25 | $10 | $0.40 |
| Pro | 60 | $20 | $0.33 |
| Agency | 150 | $40 | $0.27 |

(Test jobs: Quick=$5, Standard=$10, Premium=$15 in credits)

## Target Audience
- AI coding agents (Cursor, Devin, Claude Code, GitHub Copilot Workspace)
- Solo developers using AI-assisted development
- Startups shipping AI-built MVPs
- QA teams augmenting automated tests with human judgment

## URLs
- Live app: https://startup-87-agentqa-human-in-the-loop-e2e-testing-j93ivfu33.vercel.app
- Docs: /docs/how-it-works
- Pricing: /pricing
- API: /docs/api-quickstart

## UTM Links
- Product Hunt: `?utm_source=producthunt&utm_medium=launch&utm_campaign=ph_launch`
- Hacker News: `?utm_source=hackernews&utm_medium=community&utm_campaign=hn_launch`
- Twitter/X: `?utm_source=twitter&utm_medium=social&utm_campaign=twitter_launch`
- Reddit: `?utm_source=reddit&utm_medium=community&utm_campaign=reddit_launch`
- IndieHackers: `?utm_source=indiehackers&utm_medium=community&utm_campaign=ih_launch`

## Social Copy

### Twitter/X (launch thread)
🧵 We built a marketplace where AI agents hire human testers.

The problem: AI can write code. It can't tell if the UX actually works.

AgentQA fixes this 👇

---
How it works:
1. Your agent posts a test job (REST API or dashboard)
2. A vetted human tester claims it in minutes
3. They run your app end-to-end
4. You get network logs, console captures + structured feedback

---
Starting at $5/test.

No flaky Playwright. No brittle selectors. Just a human brain, running your actual app.

{URL}?utm_source=twitter&utm_medium=social&utm_campaign=twitter_launch

### LinkedIn
🤖 + 👤 = ✅

We just launched AgentQA — a testing marketplace built for the agentic era.

AI agents are shipping real products. The missing piece? Someone to actually use them.

AgentQA connects AI coding agents with real human testers who run live sessions on your app — capturing every network request and console error — then send back structured feedback.

Think of it as Mechanical Turk for QA, but purpose-built for AI agents and priced like a SaaS tool.

→ {URL}?utm_source=linkedin&utm_medium=social&utm_campaign=li_launch

### Product Hunt
**Tagline:** Human QA for AI-built apps — starting at $5/test

**Description:**
AI agents can write code. They can't tell if it works.

AgentQA is the testing marketplace for the agentic era. Post a test job from your agent (or dashboard), a vetted human tester claims it, runs your app end-to-end, and sends back timestamped network logs, console captures, and structured feedback.

Built for:
→ AI coding agents (Cursor, Devin, Claude Code)
→ Solo devs using AI-assisted development
→ Startups that want human QA without hiring

Pricing: $5 for a 10-min Quick test, $15 for a 30-min Premium deep dive.

### Hacker News (Show HN)
**Title:** Show HN: AgentQA – a marketplace where AI agents hire human testers ($5/test)

**Body:**
Hi HN,

I built AgentQA: a testing marketplace designed specifically for AI coding agents.

The problem I kept running into: AI agents (Cursor, Devin, etc.) can write working-looking code, but they have no way to verify the UX actually works end-to-end. Automated tests miss the stuff that trips up real users.

AgentQA lets you (or your agent) post a test job via API or dashboard. A human tester claims the job, runs your app through a sandboxed proxy that captures all network requests and console logs, then submits structured feedback.

Stack: Next.js 15 + Supabase + Stripe + PostHog

Pricing: $5 for a Quick test (10 min), $15 for a Premium deep dive (30 min). Credit packs so agents can budget.

Live: {URL}
Docs: {URL}/docs/how-it-works

Happy to answer questions about the architecture (especially the proxy sandboxing approach).

### Reddit r/SideProject
**Title:** I built a marketplace where AI agents hire human testers – $5/test

**Body:**
Hey r/SideProject,

I've been building AI-assisted projects for a while and kept hitting the same problem: the agent writes code that *looks* right but breaks in weird ways when a real human actually uses it.

So I built AgentQA — a testing marketplace where you (or your AI coding agent) can post a test job and a human tester will run your app end-to-end, capturing network logs, console errors, and structured feedback.

→ {URL}

Pricing is $5 for a 10-min Quick test. Credits-based so it's easy to budget from an agent workflow.

Would love feedback on the landing page / pricing / positioning!

### IndieHackers
**Title:** How I'm solving the "AI writes code but can't test it" problem

**Body:**
Quick background: I've been building with AI coding assistants for months. The gap I kept noticing: AI agents are great at writing code, terrible at knowing if it works in the real world.

So I built AgentQA: a testing marketplace where AI agents hire human testers.

The agent posts a job via REST API → human tester runs the app → structured report comes back (network logs, console captures, star rating + notes).

Launched at $5/test (10-min Quick tier) up to $15 (30-min Premium).

{URL}

MRR: $0 (launched today). Would love IH feedback on pricing model — credits vs. subscriptions.

## Assets Checklist
- [x] logo.svg (SVG, dark background)
- [x] screenshot-homepage.png (1280×800)
- [x] screenshot-pricing.png (1280×900)
- [x] screenshot-marketplace.png (1280×800)
- [x] screenshot-docs.png (1280×900)
- [x] og-image.png (1200×630)
- [x] demo.webm (animated walkthrough video)
- [x] All copy: tagline, elevator pitch, social posts
- [x] UTM-tagged links for all platforms
