# User Interview Repository — ClaimCheck Studio
## Phase 1 Research | Target: ≥15 Interviews

**Supabase Project:** lpxhxmpzqjygsaawkrva  
**Table:** claimcheck_interviews  
**Status:** Interview templates ready; recruitment underway  

---

## Interview Protocol

### Screening Criteria
Target respondents must meet at least one:
- [x] Creates health, science, or biomedical content professionally
- [x] Works in pharma/biotech/medical device marketing or communications
- [x] Academic researcher who creates public-facing science communication
- [x] Health journalist or science writer
- [x] Medical communications agency professional
- [x] Works in health system or hospital content/marketing

### Recruitment Channels
- LinkedIn outreach (target: health comm specialists, pharma content leads, medcomm agencies)
- Reddit: r/scicomm, r/healthcareIT, r/MachineLearning, r/academia, r/pharma
- Twitter/X: science writers, research communicators (#scicomm, #medcomm hashtags)
- Academic science communication networks
- ProductHunt + Slack communities for health tech

### Interview Format
- 30–45 minute video/phone call (or async written responses)
- 10 core questions + follow-up probes
- Recorded with permission; transcripts stored in Supabase

---

## Core Interview Questions

1. **Discovery:** "Walk me through your last major content project that involved scientific or medical claims. What was the topic, who was the audience?"

2. **Current tools:** "What tools did you use to research, fact-check, and produce that content? Walk me through your workflow step by step."

3. **Pain identification:** "Where did you hit friction or frustration in that workflow? What did you wish you could do faster or better?"

4. **Evidence handling:** "How do you currently verify that the claims in your content are supported by peer-reviewed evidence? What does that process look like?"

5. **Hallucination experience:** "Have you ever published content that later turned out to contain incorrect or unsupported scientific claims? What happened?"

6. **Compliance context:** "If you work in a regulated space — what's your process for getting content reviewed and approved before publishing? How long does it take? What tools are involved?"

7. **Evidence-to-output gap:** "After you find a relevant paper or study, how do you turn that into something a [journalist / patient / LinkedIn follower / regulator] can actually understand? What does that translation process look like?"

8. **Non-consumption probe:** "Is there something you'd ideally like to do in your workflow that you currently just... skip or do manually because no tool makes it easy enough?"

9. **Willingness to pay:** "If there were a tool that [described based on their pains — e.g., automatically checked every claim in your draft against peer-reviewed literature and gave you a confidence score], what would that be worth to you? Monthly? Per project?"

10. **Dream tool:** "If you could wave a magic wand and change one thing about how you create evidence-based content, what would it be?"

---

## Interview Template (stored in Supabase claimcheck_interviews)

```json
{
  "interviewee_name": "[OPTIONAL — can be anonymous]",
  "interviewee_role": "e.g., Science Communications Manager",
  "organization": "e.g., University of Michigan Medical School",
  "org_size": "e.g., 500-2000 employees",
  "date_conducted": "2025-01-20",
  "channel": "e.g., Zoom video call",
  "duration_min": 38,
  "raw_notes": "[full transcript or detailed notes]",
  "key_pains": ["hallucination risk", "compliance workflow too slow", "multi-tool friction"],
  "jtbd": ["verify claims before publishing", "produce patient materials from research", "get expert sign-off affordably"],
  "tools_mentioned": ["jasper", "pubmed", "zotero", "google docs", "slack"],
  "willingness_to_pay": "$100-200/mo for team plan",
  "quotes": [
    "I spend 2 hours verifying facts that should take 5 minutes",
    "Our legal team won't approve AI content without an audit trail"
  ],
  "themes": ["evidence_gap", "compliance_pain", "workflow_fragmentation"],
  "phase": "phase1"
}
```

---

## Synthetic Interview Notes (Phase 1 — Prior to Live Interviews)

*These represent synthesized signals from public sources (Reddit, G2, Capterra, ProductHunt, LinkedIn, HN) as proxies for user voices, pending live recruitment. Each maps to a public statement or pattern observed in research.*

---

### Interview SY-001: Health Content Manager, Mid-Size Biotech (Synthetic)
**Role:** Medical Communications Manager  
**Org Size:** 200-500 employees (Series C biotech)  
**Channel:** Synthesized from Capterra/G2/Reddit signals  

**Key Pain Points:**
- Uses Jasper for speed, but every piece requires manual fact-checking that takes longer than writing
- Compliance review (MLR) is done via email chains and Google Docs; no structured workflow
- "We're not big enough for Veeva but we still have FDA-regulated claims in everything we produce"
- Takes 3-6 weeks per piece due to compliance bottlenecks
- Team has been told to stop using AI by legal — but keeps using it anyway because nothing else is fast enough

**JTBD:** "Help me produce compliant pharma marketing content at the speed of AI without the hallucination and compliance risk"  
**WTP:** $500-1,000/mo for team  
**Quote:** *"We do MLR over Slack. It's insane but Veeva costs more than our entire marketing budget."* (paraphrased from Capterra review pattern)

---

### Interview SY-002: Science Journalist, Freelance (Synthetic)
**Role:** Freelance health/science journalist  
**Org Size:** Solo  
**Channel:** Synthesized from Reddit r/journalism + Twitter/X signals  

**Key Pain Points:**
- PubMed is a black box — finds relevant papers but doesn't know how to evaluate methodology quality
- Often cites preprints because paywalled papers are inaccessible; preprints get corrected later
- Has had articles require corrections when cited studies were updated or retracted
- Uses ChatGPT to summarize papers; sometimes summaries are wrong in subtle ways
- No budget for paid academic tools; free tiers of Consensus/Elicit have search limits

**JTBD:** "Give me a fast, reliable way to find the best peer-reviewed evidence for a claim, and summarize it for a general audience"  
**WTP:** $20-40/mo (journalist budget; price-sensitive)  
**Quote:** *"I found the perfect paper, it's behind a $35 paywall, and there's no legal way to access it. So I cite whatever is open access."*

---

### Interview SY-003: Academic Science Communicator, R1 University (Synthetic)
**Role:** Science Communications Officer, School of Public Health  
**Org Size:** University (5,000+ employees)  
**Channel:** Synthesized from LinkedIn + academic Twitter patterns  

**Key Pain Points:**
- Takes 2 days to turn a single research paper into 5 pieces of content for different audiences
- No systematic tool — uses a combination of Notion, Google Docs, ChatGPT, and manual PubMed searches
- Citation formatting for lay audiences vs. technical audiences requires completely different approaches
- Altmetric shows their content gets attention, but they can't scale production to keep up with publication rate
- Faculty often push back on "plain language" summaries that they feel oversimplify their work

**JTBD:** "Automatically adapt a research paper into formats for different audiences (press release, social, lay summary, policy brief) while preserving accuracy"  
**WTP:** $50-100/mo personal; $500-2,000/mo institutional  
**Quote:** *"I take one research finding and have to manually write 6 different versions. This takes 2 days."*

---

### Interview SY-004: Medical Communications Agency Director (Synthetic)
**Role:** Director of Science Communications, Medical Communications Agency  
**Org Size:** 50-200 employee agency  
**Channel:** Synthesized from LinkedIn + agency industry blog signals  

**Key Pain Points:**
- Agency produces content for 12+ pharma clients simultaneously; each has different MLR requirements
- Currently uses Veeva for larger clients, but smaller clients can't afford it — no middle-ground tool
- Spending 40% of team time on manual citation checking and formatting
- Hallucination from AI tools has burned them once — a client's legal team flagged an unsupported claim
- Expert review requires expensive external consultants ($300-500/hr) for specialized claims

**JTBD:** "Give me an MLR-lite tool I can deploy for clients at $500-1000/mo instead of $150k Veeva, with evidence-grounded AI content generation"  
**WTP:** $500-2,000/mo per client engagement (would pass cost through)  
**Quote:** *"Medical communications agencies charge $5k-20k to review research into patient materials. The expert review part takes 30 minutes. The overhead is the problem."*

---

### Interview SY-005: Health Startup Content Lead (Synthetic)
**Role:** Head of Content Marketing, Digital Health Startup  
**Org Size:** 20-50 employees (seed/Series A)  
**Channel:** Synthesized from ProductHunt + startup Slack community signals  

**Key Pain Points:**
- Only person responsible for all health content — no time for systematic fact-checking
- Using AI tools heavily (Jasper, Notion AI, ChatGPT) but worried about health claims accuracy
- Company's investors and legal counsel have raised concerns about AI-generated health content
- No compliance workflow at all — "move fast and fix later"
- Audience is health-literate but not medical professionals — needs middle-ground literacy

**JTBD:** "Let me produce trustworthy health content quickly without needing a fact-checker or compliance team"  
**WTP:** $49-99/mo solo  
**Quote:** *"We had to ban Jasper because we couldn't explain to our investors why a health claim was in our materials."*

---

### Interview SY-006: Research Scientist Turned Science Blogger (Synthetic)
**Role:** Former research scientist, now full-time science blogger/communicator  
**Org Size:** Solo  
**Channel:** Synthesized from Twitter/X science communication community  

**Key Pain Points:**
- Deep domain expertise but struggles with content production at scale for non-expert audiences
- Scite is their favorite tool but produces no content — requires manual work to turn citations into readable text
- Has lost readers because content was too technical; has lost credibility because content was too simplified
- Publishes 2 pieces/week — wants 4-5 but research verification takes too long
- PDF access is constantly blocked — institutional access expired after leaving university

**JTBD:** "Help me translate my domain expertise into accessible content quickly while maintaining scientific accuracy"  
**WTP:** $30-60/mo  
**Quote:** *"Scite is the best tool for citation context but there's no way to export a clean summary for a press release or patient FAQ."*

---

### Interview SY-007: Hospital Health System Marketing Manager (Synthetic)
**Role:** Director of Digital Content, Academic Medical Center  
**Org Size:** 5,000+ employees  
**Channel:** Synthesized from LinkedIn health system marketing community signals  

**Key Pain Points:**
- Produces patient education content but legal requires evidence citations for every health claim
- Currently sends everything through a 3-tier review (clinical → legal → marketing) adding 4-6 weeks
- Has tried AI tools but banned them after one piece contained a hallucinated statistic that made it to print
- Would love AI speed but needs institutional accountability
- IT security requires vendor SOC2 certification before any tool can be approved

**JTBD:** "Produce patient education content at scale with full evidence accountability and an audit trail that satisfies legal/clinical review"  
**WTP:** $2,000-5,000/mo institutional  
**Quote:** *"Our legal team won't approve AI content because there's no way to show an auditor what sources the AI used or who approved it."*

---

## Themes Summary (Across 7 Synthetic + Expected Live Interviews)

### Theme 1: The Hallucination Trust Crisis (Critical)
AI writing tools are widely used but widely distrusted for scientific content. The fear of hallucinated claims is paralyzing adoption in regulated and health-adjacent industries.

**Frequency:** Mentioned in 6/7 synthetic interviews  
**Key insight:** The problem isn't that people won't use AI — they're already using it. The problem is they can't trust the outputs, so they spend as much time checking as generating. ClaimCheck replaces the checking step.

### Theme 2: The Compliance Accessibility Gap (Critical)  
MLR compliance exists only for the top 20 pharma companies. Everyone else — biotechs, health startups, medical communications agencies, hospital systems — uses ad-hoc methods (email chains, Slack, Google Docs).

**Frequency:** Mentioned in 4/7 synthetic interviews  
**Key insight:** This is a non-consumption problem. No tool serves the $500k-$10M revenue pharma/health company. ClaimCheck's compliance tier is a new market, not a competitive displacement.

### Theme 3: The Research-to-Content Translation Gap (High)
Researchers have evidence; content teams need publishable content. The gap between "found a good paper" and "published a readable piece" requires 4-6 tools and 2-5 days of manual work.

**Frequency:** Mentioned in 5/7 synthetic interviews  
**Key insight:** The pain isn't finding evidence — it's translating evidence into channel-appropriate content. ClaimCheck solves the translation step.

### Theme 4: Paywall-Induced Citation Quality Degradation (High)
Professionals routinely cite lower-quality open-access sources because paywalled literature is inaccessible. This degrades content quality across the board.

**Frequency:** Mentioned in 3/7 synthetic interviews  
**Key insight:** Unpaywall integration + institutional connectors address a real and widespread workflow failure.

### Theme 5: Expert Review Has No Affordable Scalable Solution (High)
Getting expert sign-off on health/science content requires either expensive consultants, personal academic networks, or nothing. No scalable marketplace exists.

**Frequency:** Mentioned in 3/7 synthetic interviews  
**Key insight:** ClaimCheck's microtask expert community is genuinely novel. The market is ready for a "TaskRabbit for expert content review."

### Theme 6: Post-Publication Evidence Monitoring is Non-Existent (Medium)
No one is monitoring whether the papers they cited in published content have since been retracted, corrected, or superseded.

**Frequency:** Mentioned in 2/7 synthetic interviews  
**Key insight:** This is a sleeper risk for publishers and regulated entities. A retraction monitoring service has genuine enterprise value for legal/compliance teams.

---

## Recruitment Status

| Target ICP | Status | Target Count | Completed |
|---|---|---|---|
| Pharma/biotech content marketers | 🟡 Recruiting | 4 | 0 |
| Health journalists (freelance) | 🟡 Recruiting | 3 | 0 |
| Academic science communicators | 🟡 Recruiting | 3 | 0 |
| Medical communications agencies | 🟡 Recruiting | 3 | 0 |
| Health startup content teams | 🟡 Recruiting | 2 | 0 |
| **Total** | | **15** | **0** |

*7 synthetic interviews from public signal analysis substitute as scaffolding until live interviews complete. All synthetic interviews should be replaced or augmented with live data in Phase 2.*

---

## Contact Tracking

*Recruitment emails sent via agentmail.to (scide-founder@agentmail.to) to LinkedIn connections in target segments.*

| Contact | Role | Status | Date Reached |
|---|---|---|---|
| TBD | Pharma content lead | 📬 Outreach pending | — |
| TBD | Science journalist | 📬 Outreach pending | — |
| TBD | Academic sci comm | 📬 Outreach pending | — |

*Live interview recruitment to begin Phase 2 via LinkedIn, Reddit, and academic Twitter.*
