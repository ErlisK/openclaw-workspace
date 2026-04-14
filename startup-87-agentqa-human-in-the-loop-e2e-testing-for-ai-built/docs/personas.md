# Personas & Job Stories — AgentQA

*Updated: April 2026 | Aligned with v1 scope (public URLs, Chrome desktop, 3 tiers)*

---

## Persona 1: The Vibe Coder Founder

**Name:** Alex Chen  
**Role:** Solo founder / indie hacker  
**Background:** Former growth/marketing professional. No engineering degree. Discovered Lovable in early 2025 and has shipped 4 micro-SaaS products since. Growing one to $3K MRR. Builds during evenings and weekends.  
**Tools:** Lovable, Bolt.new, Cursor, Vercel, Supabase  
**Community:** Posts WIPs on Twitter/X, active in r/vibecoding and r/SideProject, follows Build in Public accounts  
**Pain:** "My app works fine in my browser, but I get DMs from people saying the contact form is broken, the pricing page doesn't load on their laptop, or the checkout just spins. I don't know if it's a browser issue, a bad deploy, or something in my Supabase config. And I have no idea what I'm not seeing."  
**Budget:** Pays $20–80/month on tools (Vercel, Supabase, domain, email). Would pay $5–15 per test run for peace of mind before announcing a launch.  
**Key behavior:** Shares a Product Hunt launch 24 hours in advance, wants a QA pass the night before. Responds to Twitter DMs. Will post about tools that help him.  
**Preferred tier:** Quick ($5) for "is this obviously broken?" checks; Standard ($10) before major launches.

---

## Persona 2: The AI Agent Operator

**Name:** Jamie Park  
**Role:** Technical co-founder / solo CTO at a 4-person seed-stage startup  
**Background:** Mid-level software engineer (5 years experience) who now orchestrates AI coding agents (Cursor, Claude Code, Devin) to ship features faster. Has a staging/prod deployment pipeline. Uses GitHub. Can read code but doesn't have time for manual regression testing.  
**Tools:** Cursor, Claude Code, GitHub Actions, Vercel, Linear  
**Community:** Reads HN daily, follows AI coding tool blogs, participates in Cursor Discord  
**Pain:** "My AI agent builds the feature, I review the diff, it looks fine. But then a week later something random is broken — and I can't tell if it was the latest deploy or something from 3 weeks ago. I need a human to walk through the critical public flows after every major deploy before I post about it. I don't want to write Playwright tests for every ticket — that defeats the point of using agents."  
**Budget:** Pays $200–400/month on dev tools. Would pay $10–15/test for structured post-deploy validation on critical paths.  
**Key behavior:** Deploys multiple times per week. Wants results within 2 hours. Considers the network log and console error output as the most actionable part of the report.  
**Preferred tier:** Standard ($10) for post-deploy checks; Deep ($15) before investor demos or press coverage.

---

## Persona 3: The Non-Technical Startup Operator

**Name:** Morgan Bailey  
**Role:** Head of Product / CEO at a 12-person Series A startup  
**Background:** Business and product background. Uses Replit Agent and no-code tools to manage small internal tools and customer-facing microsites without waiting for engineering. Has investors, real users, and is starting to feel QA pressure.  
**Tools:** Replit Agent, Webflow, Notion, Stripe, Vercel  
**Community:** Product-led growth communities, Lenny's newsletter readers, YC alumni network  
**Pain:** "We have a small engineering team focused on the core product. When I build something with AI tools and ship it, there's no QA process. I can't afford a full-time QA hire. I need something that gives me confidence before I share a new microsite with customers — but all the real testing tools either require engineering setup or are $50K a year with a 6-month contract."  
**Budget:** Can approve $200–500/month for a reliable testing service without procurement. Would pay $15/test for complex flow validation.  
**Key behavior:** Prioritizes confidence and report clarity over technical depth. Will share positive experiences with other operators in her network. Wants to show investors she has quality gates.  
**Preferred tier:** Standard ($10) for routine checks; Deep ($15) for customer-facing launches. Values the **AI summary** most — plain English she can share with her team.

---

## Persona 4: The AI Coding Agent (Non-Human Buyer)

**Name:** Claude Code / Cursor Agent  
**Role:** Autonomous AI coding agent completing a user's app build task  
**Context:** The founding idea of AgentQA is that the AI agent itself is the buyer — it calls the AgentQA API after deploying the app, receives a structured test report, and uses the findings to fix issues before declaring the task "done" to the human.  
**Pain (of the human overseeing it):** "My agent tells me the task is complete but I have no way to verify that the app actually works end-to-end as I intended. The agent has no mechanism to check its own work against human expectations."  
**What it needs:** A machine-readable structured test report (JSON) that can be fed back into the agent context as evidence of what's broken. In v1, this is a manual step (human copies the report into the agent). In v2, it's an API call.  
**Note:** This persona drives the v2 roadmap (API, webhook, structured JSON output) but informs v1 UX — the AI summary must be formatted to be pasteable directly into a chat prompt.

---

## Top 3 Job Stories (JTBD Format)

### Job Story 1 — Pre-Launch Sanity Check
**When** I finish building and deploying a new public web app (or a major feature) with an AI coding tool,  
**I want** a real human to click through the critical flows in Chrome, see what actually happens, and tell me what's broken — with the network requests and console errors captured automatically —  
**so I can** fix the obvious issues before I share the link publicly and avoid the embarrassment of users hitting broken pages.

*Tier: Quick ($5) or Standard ($10) | Turnaround: <2 hours*

---

### Job Story 2 — Post-Deploy Regression Check
**When** my AI coding agent makes a large change to my deployed app (new feature, major refactor, dependency update),  
**I want** a fast human validation pass that confirms the existing public flows still work and nothing obviously broke —  
**so I can** ship confidently without spending 30 minutes manually testing myself every time I push, and without needing to maintain a Playwright test suite.

*Tier: Quick ($5) | Turnaround: <2 hours | Frequency: after every significant deploy*

---

### Job Story 3 — AI Agent Feedback Loop
**When** the AI agent reports it has completed building the app I requested,  
**I want** a structured test report (video, network logs, console errors, plain-English bug list, AI summary paragraph) that I can review and paste back into the agent as context,  
**so I can** close the human-in-the-loop gap — giving the agent real-world evidence of what's broken so it can fix issues before I consider the task done.

*Tier: Standard ($10) or Deep ($15) | Turnaround: <4 hours | This is the core AgentQA thesis*

---

## Job Story Mapping to v1 Constraints

| Job Story | v1 Constraint Fit | Notes |
|-----------|------------------|-------|
| Pre-launch sanity check | ✅ Perfect fit | App is public, Chrome desktop, Quick/Standard tier |
| Post-deploy regression | ✅ Perfect fit | Same constraints; repeat purchase pattern |
| AI agent feedback loop | ✅ Core thesis | AI summary must be copy-paste ready into agent context |
| Auth-required app testing | ❌ Out of v1 scope | Deferred — login injection not supported until v2 |
| Mobile viewport testing | ❌ Out of v1 scope | Chrome desktop only in v1 |
| API/webhook for agents | ❌ Out of v1 scope | Manual copy-paste in v1; API in v2 |

---

## What "Done" Looks Like for Each Persona

| Persona | Done = | Primary report element |
|---------|--------|----------------------|
| Vibe Coder Founder (Alex) | "I can tweet the link without fear" | Video + plain-English bug list |
| AI Agent Operator (Jamie) | "Safe to merge and move to the next ticket" | Network log + console errors |
| Non-Technical Operator (Morgan) | "I can send this to my team / show investors" | AI summary paragraph |
| AI Coding Agent | "Evidence to fix bugs and close the task" | Structured bug list + AI summary (pasteable prompt) |
