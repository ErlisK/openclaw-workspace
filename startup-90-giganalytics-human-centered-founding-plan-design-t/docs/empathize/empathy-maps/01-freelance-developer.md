# Empathy Map — Persona 1: The Freelance Developer

## Persona Profile

**Name:** Marcus, 32  
**Location:** Austin, TX (remote-first)  
**Gig Mix:** Upwork (primary — full-stack dev contracts), direct clients (2-3 retainers), occasional Toptal projects  
**Income Range:** $8,000-$14,000/month gross; 3-4 active income streams  
**Tech Comfort:** High — uses GitHub, Notion, Stripe, spreadsheets; comfortable with APIs  
**Background:** Left corporate software job 4 years ago; now earns more but spends significant time on non-billable work (proposals, admin, onboarding new clients)  

---

## SAYS

- *"I track my hours in Toggl but I never connect it to my actual earnings — I know I should but I don't."*
- *"I raised my rate last year and it actually worked, but I had no idea if I was leaving money on the table or about to lose everyone."*
- *"Upwork shows me what I made but not what I would have made if I wasn't spending 5 hours a week on proposals that don't convert."*
- *"I have three invoicing systems — Stripe for product clients, PayPal for some Upwork clients, Wave for direct. My accountant hates me."*
- *"I know I earn more per hour from my retainer clients but I just have a feeling — I don't have data to prove it."*
- *"If there was a dashboard that showed me: these are your top three clients by true $/hr — I'd actually use that every week."*

## THINKS

- *"Am I charging what I'm worth? Probably not, but I don't want to lose the clients I have."*
- *"My Upwork JSS dropped 0.2 points last month and I don't know why. It's stressing me out."*
- *"I should build a spreadsheet to compare my streams but I'll probably spend a weekend on it and never maintain it."*
- *"If I could just see which type of project is most profitable, I'd turn down the unprofitable ones without guilt."*
- *"I wonder if other developers at my level charge more for React vs. Node work — I have no idea."*
- *"I'm worried about feast-or-famine but I have no forecast of what's coming after this contract ends."*

## DOES

- Exports Upwork earnings CSV every quarter to a spreadsheet (inconsistently)
- Uses Toggl for some projects, forgets it for others; time data is incomplete
- Has a "income tracker" Notion page that hasn't been updated since October
- Manually calculates client $/hr by dividing invoice amount by estimated hours (rough)
- Checks Upwork analytics tab weekly, mostly worried about JSS
- Reads r/freelance for rate validation ("is $150/hr reasonable for senior React dev?")
- Bills in different tools for different clients; reconciles in Q1 for taxes

## FEELS

- **Anxious** about income uncertainty between contracts (the gap months)
- **Frustrated** when he knows he worked hard but can't see clearly if it paid off
- **Proud** of his income level compared to peers but insecure without data to back it up
- **Overwhelmed** by tool fragmentation — multiple dashboards, no unified view
- **Motivated** during good months; **demoralized** when one bad client skews all metrics
- **Relieved** when a clean financial quarter comes together, but it's always manual

---

## Pains

1. **No unified dashboard** — Upwork + Stripe + Wave + PayPal are separate universes
2. **True hourly rate is unknown** — gross income tracked but time cost never netted out
3. **Proposal time is invisible** — 5 hrs/week on proposals not counted in any $/hr calculation
4. **Rate anxiety** — raises rates on gut feel; no market data to validate decisions
5. **Inconsistent time tracking** — Toggl data is partial; hard to build complete picture
6. **Income forecast absent** — can't plan personal finances without predictable income view
7. **Tax fragmentation** — 3 payment systems = 3 separate records = painful reconciliation

## Gains (Desired Outcomes)

1. **Single dashboard** showing all income sources, true $/hr per stream
2. **Rate confidence** — know exactly where his rates land vs. peers with similar skills
3. **Automatic time attribution** — calendar inference fills in the gaps without discipline
4. **Stream prioritization** — clear data on which clients/platforms to grow or drop
5. **Income projection** — "Based on current pipeline, you'll clear $12K next month"
6. **Tax-ready export** — one CSV his accountant accepts; eliminates the annual reconciliation hell

---

## Key Insight for GigAnalytics

Marcus needs **transparency about the gap between what he earns and what he thinks he earns**. The "true hourly rate" revelation — seeing that his retainer clients pay $180/hr effective while his Upwork contracts pay $95/hr after proposal time — would immediately justify the product and drive a business decision. GigAnalytics must deliver this insight within 5 minutes of onboarding.

---

## Design Implications
- **Data import:** Upwork CSV + Stripe API + Toggl API are the three critical integrations
- **Onboarding hook:** "What's your true hourly rate across platforms?" as the first question
- **Core metric:** Net $/hr per income stream, after all fees and overhead time
- **Engagement driver:** Weekly email digest — "Your top stream this week was X at $Y/hr"
