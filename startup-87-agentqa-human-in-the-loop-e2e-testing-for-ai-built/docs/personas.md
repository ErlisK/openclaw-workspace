# Personas & Job Stories — AgentQA

---

## Persona 1: The Vibe Coder Founder

**Name:** Alex Chen  
**Role:** Solo founder / indie hacker  
**Background:** Product person, formerly in growth/marketing. No engineering degree. Discovered Lovable/Bolt in 2025 and has shipped 3 micro-SaaS apps in 6 months. Growing one of them to $2K MRR.  
**Behavior:** Builds fast, ships fast. Iterates via prompt. Shares progress on Twitter/X. Has a small audience of early users.  
**Pain:** "I can see my app works in my browser, but I get DMs from users saying checkout is broken, or the mobile layout is messed up, or they can't log in. I have no idea how to fix these. And I definitely don't know what I'm not seeing."  
**Budget:** Pays $20–50/month for tools. Would pay $5–15 per test run for confidence before a launch.  
**Hiring habits:** Occasionally posts on Upwork for bug fixes, but doesn't know how to scope them. Wants a low-friction automated option.

---

## Persona 2: The AI Agent Operator

**Name:** Jamie Park  
**Role:** Technical founder / small CTO at a 3-person startup  
**Background:** Mid-level engineer who now orchestrates AI coding agents (Cursor, Claude Code, Devin) to ship features. Has a staging environment. Uses GitHub. Can read code.  
**Behavior:** Uses AI agents as junior devs. Merges PRs quickly. Doesn't have time to write Playwright tests for every ticket. Wants to ship confidently and catch regressions.  
**Pain:** "My agent builds the feature, I review the diff, it looks fine. But then a week later something random is broken. I can't tell if it was the latest deploy or something from 3 weeks ago. I need a human to walk through the critical flows after every major deploy."  
**Budget:** Pays $200–400/month on dev tools. Would pay $10–50/test for structured E2E validation on critical paths.  
**Key insight:** Wants results in 2 hours, not 2 days. Needs to know if it's safe to ship the next feature.

---

## Persona 3: The No-Code Startup CTO

**Name:** Morgan Bailey  
**Role:** CTO / Head of Product at a 10-person startup  
**Background:** Business background, uses Replit Agent and Cursor to manage a small engineering output. Has investors. Has real users. Getting pressure to ship quality.  
**Behavior:** Delegates feature builds to AI agents, reviews outputs at a product level. Knows that the testing gap is a liability but hasn't found a tool that doesn't require hiring a QA engineer.  
**Pain:** "We're getting investor pressure on quality. We can't afford a full-time QA hire. I need something that gives us confidence before major releases — but all the real testing tools are $50K a year and require an enterprise contract."  
**Budget:** Can authorize $200–500/month for a reliable testing service. Would pay $15/test for complex flow validation.  
**Key insight:** Wants a "stamp of quality" they can point to in board meetings or investor updates.

---

## Top 3 Job Stories (JTBD Format)

### Job Story 1 — Pre-launch confidence
**When** I finish building a new app or a major feature with an AI coding tool,  
**I want** a real human to click through all the critical flows and tell me what's broken,  
**so I can** ship confidently without fear of embarrassing myself with a broken product in front of real users.

---

### Job Story 2 — Regression safety net after AI edits
**When** my AI agent makes a large change to the codebase (new feature, refactor),  
**I want** a fast validation test that confirms nothing in the existing flows is broken,  
**so I can** merge and deploy without spending 2 hours manually testing myself — time I don't have.

---

### Job Story 3 — Structured feedback for the AI agent loop
**When** the AI agent reports it has completed the requested app,  
**I want** a test report with screenshots, network logs, console errors, and written feedback,  
**so I can** feed it back into the agent to fix real issues before anyone else sees the app.
