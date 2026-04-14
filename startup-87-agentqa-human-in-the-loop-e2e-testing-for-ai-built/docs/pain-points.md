# Pain Points Research — AgentQA

*Sources: Reddit (r/LLM, r/vibecoding, r/ExperiencedDevs, r/QualityAssurance, r/reactjs, r/SideProject), Hacker News, blog/research reports from Autonoma, qtrl.ai, Databricks, Forbes, Escape.tech, Veracode, cuckoo.network. 150+ posts/comments processed.*

---

## Theme 1: AI-Generated Code Ships Unvalidated

1. AI coding tools (Bolt, Lovable, Cursor, Replit Agent) have no built-in QA gate — code goes straight from prompt to deployment.
2. Non-technical founders using vibe coding have no ability to review code quality before shipping.
3. 1-in-5 YC W25 startups have codebases that are >90% AI-generated, most with zero structured testing.
4. AI agents resolve the prompt, not the underlying intent — features appear correct on the surface but break in edge cases.
5. Vibe-coded apps frequently ship without any manual walkthrough of critical user flows.
6. "It works in my preview" is treated as sufficient QA, with no external human validation.
7. Developers using AI coding tools report skipping testing phases due to speed pressure.
8. AI-built apps lack mental model documentation — even the creator can't explain why things work.

## Theme 2: Security Gaps Are Catastrophic and Invisible

9. 53% of developers who shipped AI-generated code later found security issues that passed initial review (Sonar Source survey).
10. 86% of AI-generated code fails XSS defense mechanisms (Georgetown CSET study).
11. 45% of AI-generated code introduces OWASP Top 10 vulnerabilities (CodeRabbit report).
12. Across 5,600 vibe-coded apps: 2,000+ vulnerabilities, 400+ exposed secrets, 175 instances of exposed PII (Escape.tech study).
13. AI-generated code is 2.74x more likely to introduce XSS vulnerabilities than human-written code.
14. Supabase credentials hard-coded in client-side bundles — a researcher found the same pattern in 10/38 Lovable-built apps.
15. One vibe-coded app with 6,000 paid users had full admin access exploitable with no credentials.
16. Static security scanners don't catch runtime logic errors or auth flow bypasses — only human testing reveals these.

## Theme 3: No Feedback Loop from Users to AI Agent

17. AI agents finish a task and declare success with no ability to know if the app actually satisfies the user's intent.
18. Non-technical users can't write Playwright/Cypress tests — they have no automated regression layer at all.
19. When a human finally clicks through an AI-built app, they find obvious usability bugs that any QA pass would catch.
20. Feedback from real users reaches the AI agent only when it's too late (post-launch, paying customers, negative reviews).
21. AI-generated test cases have the same blind spots as the AI-generated code — they don't catch the unknown-unknowns.
22. Trial-and-error prompting costs money (tokens) and time; there's no systematic way to verify "done" before shipping.

## Theme 4: Existing QA Tools Don't Fit the Use Case

23. Enterprise QA platforms (Applause, Testlio, uTest) require $50K–$300K annual contracts — inaccessible for AI-builder users.
24. Rainforest QA charges ~$25/hour for crowdtesting — cost-effective for large teams but with no fast-turnaround for indie developers.
25. UX tools (UserTesting, Maze, PlaybookUX) focus on UX research and usability, not functional E2E validation.
26. Existing platforms require the buyer to supply test cases, URLs, and context — a big burden for non-technical founders.
27. Crowdtesting platforms have 24–72 hour turnaround windows, not the 1–4 hour feedback loop vibe coders need.
28. No platform combines: (a) real human testing + (b) network request logging + (c) console error capture + (d) video feedback — in one tool.
29. Automated testing tools (Selenium, Playwright, Cypress) require engineering expertise and maintenance — not usable by AI-builder customers.
30. Test IO, Rainforest, and Testlio all require test specs to be written beforehand — but AI-builder users don't know what to specify.

## Theme 5: Developer/Operator Pain in AI-Built Codebases

31. When a client takes over a codebase with vibe coding, experienced developers lose confidence in the project — no QA means no trust (HN: "The additions they made in a week are huge — 10,000 lines of code. I've lost all joy in the project.").
32. Dependency sprawl from AI-generated code introduces unknown attack surfaces — nobody evaluated the libraries the AI pulled in.
33. "The codebase becomes something the team uses but doesn't fully understand. QA is no longer just verifying correctness — it's the only line of defense." (qtrl.ai)
34. Bolt.new became notorious for "blank screens, missing files, and partial deployments" as projects grow beyond basic prototypes.
35. Token costs spiral when AI agents loop to fix their own errors: "30% of tokens to create an app, 70% to fix all the errors it created."

---

## Direct Quotes

> "While coding, you constantly hit unexpected obstacles. If you rely 100% on AI, you won't even see those obstacles, and you'll ship bugs without realizing anything went wrong." — r/LLM, 10-year dev on vibe coding

> "Vibe coding is really getting out of hand. I'm seeing this everywhere — almost half the apps now are vulnerable." — r/vibecoding, after gaining admin access to a live 6,000-user app

> "The additions they made in only a week are huge — around 10,000 lines of code. I've lost all joy in the project." — HN (Ask HN: Client took over development by vibe coding)

> "53% of teams that shipped AI-generated code later discovered security issues that passed initial review." — Autonoma / Sonar Source survey

> "QA is no longer just verifying that code works correctly. It's often the only line of defense against code nobody can explain." — qtrl.ai, How to QA a Vibe-Coded App

> "30% of your tokens are used to create an app. The other 70% to find solutions for all the errors and mistakes Bolt created." — Reddit, r/bolt (via cuckoo.network)

> "10 out of 38 Lovable-built apps had Supabase credentials embedded directly in the client-side bundle, visible to anyone who opened DevTools." — Autonoma security researcher
