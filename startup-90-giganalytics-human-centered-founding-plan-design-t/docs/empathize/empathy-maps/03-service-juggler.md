# Empathy Map — Persona 3: The Service Juggler

## Persona Profile

**Name:** DeShawn, 24  
**Location:** Atlanta, GA  
**Gig Mix:** Uber/Lyft (rideshare, 20 hrs/week), TaskRabbit (furniture assembly + moving help), dog walking via Rover, occasional cash jobs (painting, yardwork) from neighbors  
**Income Range:** $1,200-$2,800/month gross; highly variable by week depending on availability and demand  
**Tech Comfort:** Low-medium — smartphone native; uses apps well but not spreadsheets; doesn't own a laptop  
**Background:** Community college student, working to pay rent and tuition; maxing out side income to avoid loans; efficiency matters more than anything else  

---

## SAYS

- *"I have no idea which app pays me best. I just drive when I need money and pick the one that's surging."*
- *"Gas is killing my Uber earnings. I know I'm making less than I think after you factor it in."*
- *"Rover is easy money when I can get it but the jobs are random — I can't plan around it."*
- *"I tried tracking my hours on a spreadsheet but I don't have a laptop and doing it on my phone is annoying."*
- *"My roommate does DoorDash and says he makes $18/hr. I don't know if my TaskRabbit is better or worse."*
- *"I need to know when to work — Uber is dead on Monday mornings but I don't know about TaskRabbit."*
- *"Taxes? I just hope it works out. I know I should track this but I don't know how."*

## THINKS

- *"Which app should I open right now to make the most money in the next 2 hours?"*
- *"If I knew that TaskRabbit pays $22/hr effective but Uber only pays $11/hr after gas, I'd do way more TaskRabbit."*
- *"I feel like I work all the time but I'm not getting ahead — where is all the money going?"*
- *"I need to hit $2,000 this month for rent. Am I on track? I have no idea."*
- *"I should probably track my expenses (gas, dog supplies) but it feels like a lot of work."*
- *"There's probably a time of day/week that's best for each app. I just don't know what it is."*

## DOES

- Checks app earnings dashboards every few days (Uber, Lyft, Rover separately)
- Transfers money to bank account when he needs it; no running mental total
- Decides which app to open based on current surge pricing notification, not long-term data
- Takes cash jobs from neighbors without any tracking whatsoever
- No formal time tracking — mental estimation only
- Does not file taxes (under threshold assumption) — potential compliance risk
- Texts a friend to compare "how much did you make this week?" as informal benchmarking

## FEELS

- **Hustling** — energized by self-reliance and building income
- **Uncertain** — genuinely unsure if he's making good financial progress
- **Fatigued** — working many hours; unclear if the effort matches the reward
- **Motivated by goals** — rent and tuition are concrete targets that drive action
- **Frustrated** by invisible expenses — gas, phone plan, supplies erode income but aren't tracked
- **Anxious** about taxes — knows he should handle it but doesn't know how

---

## Pains

1. **No cross-platform earnings view** — 4 apps; total income requires mental math
2. **Expense blindness** — gas, vehicle wear, dog supplies reduce real earnings but never calculated
3. **True $/hr is unknown** — Uber gross doesn't account for driving to pickup zone, wait time, gas
4. **No income goal tracking** — "Am I on track for $2K this month?" answered by gut
5. **No scheduling intelligence** — which app/time combination maximizes earnings?
6. **Cash income is invisible** — yardwork/painting cash never enters any tracking system
7. **Tax risk** — multi-source income without tracking is a filing problem
8. **Mobile-only constraint** — any tool requiring a laptop is unusable

## Gains (Desired Outcomes)

1. **Total income meter** — "You've earned $1,340 this month. You need $660 more for rent."
2. **Platform comparison** — "TaskRabbit is earning you $21/hr. Uber is $13/hr after gas."
3. **Best time to work** — "Uber surges Thursday 5-8pm in your area. TaskRabbit highest on weekends."
4. **Quick cash income logging** — one tap to log $80 cash for yardwork
5. **Expense tracking** — log gas fill-up in 2 taps; auto-deducted from Uber/Lyft earnings
6. **Mobile-first** — everything works beautifully on an Android phone

---

## Key Insight for GigAnalytics

DeShawn's needs are the most urgent and practical. He's making real decisions every day — which app to open right now, whether to take a TaskRabbit job next Saturday, whether to accept an extra Rover dog-walking client. GigAnalytics must be **the GPS of his income** — real-time, mobile-first, actionable. The product can't require a computer, can't require manual spreadsheet entry, and must give him a single number: "You're on track for $1,940 this month. Open TaskRabbit for better $/hr today."

---

## Design Implications
- **Mobile-only design** — desktop is irrelevant for this persona
- **Real-time income meter** prominently shown (like a fitness app step counter)
- **Uber/Lyft/Rover/TaskRabbit** are the four critical integrations (all have APIs or CSV)
- **Expense quick-log** — gas fill-up, dog supplies in 2 taps
- **Push notification:** "TaskRabbit demand is high in your area right now"
- **Price:** Under $8/month; consider free tier with upgrade path
