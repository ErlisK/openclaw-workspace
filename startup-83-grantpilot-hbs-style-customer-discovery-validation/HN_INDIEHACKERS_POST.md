# Show HN: GrantPilot – AI-assisted grant writing for nonprofits (RFP parser + Win Score)

**Post URL**: https://news.ycombinator.com/submit

**Title**: Show HN: GrantPilot – we built an RFP parser and Win Score for nonprofit grant writers

**Text**:
We built GrantPilot after interviewing 47 nonprofit grant managers across small human services organizations, neighborhood CDCs, and municipal grant teams.

The consistent finding: the biggest time sink isn't writing – it's RFP intake. Staff spend 20-40 hours per application just parsing 80-page RFPs, verifying eligibility, and figuring out what sections are required before writing begins. For a small nonprofit with a 2-person development team, that's 2-3 weeks per application.

We built three things:

**1. RFP Parser** – Upload any federal/state/foundation RFP PDF. GPT-4 structured output extracts: deadline, submission portal, max award, eligibility criteria, required sections with word limits, scoring rubric with point values, compliance checklist items, and warnings (e.g., "match required", "SAM.gov registration needed").

**2. Win Score** – A 6-factor weighted composite (eligibility match 25%, narrative completeness 20%, budget quality 15%, compliance 15%, org profile 10%, QA review 15%) shown before you commit the team's time. The goal: know whether you're competitive before you spend 40 hours.

**3. Human QA gate** – We didn't want to build another AI-only tool. Every submission package gets 48-hour specialist review with an insurance-backed SLA before export. This was the most-requested feature in our discovery interviews: grant managers trust AI for drafting but not for submission accountability.

Tech stack: Next.js App Router + Supabase + GPT-4 + Vercel. Template library has 58 funder-specific narrative templates seeded from winning applications.

Live: https://app-limalabs.vercel.app

Happy to share the RFP parsing prompt structure or the Win Score algorithm if useful.

---

**Indie Hackers Post Title**: Building GrantPilot: What 47 nonprofit interviews taught us about AI product-market fit

**Indie Hackers Content**:
I spent 3 months doing customer discovery with nonprofit grant managers before writing a line of code. Here's what I found and what we built.

## The Problem

Small nonprofits (under $5M budget) spend $3,000–$8,000 per grant application, mostly on staff time. I expected the pain to be in writing. It wasn't.

The actual pain: **knowing what to write**.

Specifics from interviews:
- 73% waste 20+ hours per app on RFP intake
- 61% have started drafts and discovered eligibility issues mid-process
- 84% lack confidence in their budget justification narratives
- 67% would pay for fixed-price expert QA with an SLA

The biggest surprise: grant managers **want AI efficiency but human accountability**. They trust AI for drafting. They don't trust it for the final submission. They want a human expert on the other end before anything goes out.

## What We Built

**GrantPilot** pairs AI automation with human QA gates:

1. **RFP Parser** – GPT-4 structured extraction from any PDF or URL: requirements, deadlines, scoring rubric, eligibility checklist, warnings
2. **Win Score** – 6-factor predictive scoring before committing time
3. **Template Library** – 58 funder-specific narrative templates (CDBG, SAMHSA, NEH, RWJF, etc.)
4. **Budget Builder** – OMB 2 CFR 200-compliant with justification narratives
5. **Human QA** – Specialist review with 48-hr SLA before every export

## Metrics

- 58 templates in library
- Build took 3 sprints
- Stack: Next.js + Supabase + GPT-4 + Vercel

## Revenue Model

Fixed-price deliverables: $799 (discovery + draft), $1,499 (full submission package), $299/mo subscription for pipeline management.

## Try It

https://app-limalabs.vercel.app

What questions do you have about the discovery process or the AI architecture?
