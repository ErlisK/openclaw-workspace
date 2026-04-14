import { generateObject, gateway } from 'ai'
import { z } from 'zod'

const ClusterSchema = z.object({
  themes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    pain_point_ids: z.array(z.number()),
    severity: z.enum(['critical', 'high', 'medium']),
    representative_quote: z.string(),
    yc_relevance: z.string(),
  })),
  top_insight: z.string(),
  recommended_wedge: z.string(),
})

const PAIN_POINTS = `
1. AI coding tools have no built-in QA gate — code goes straight from prompt to deployment.
2. Non-technical founders using vibe coding have no ability to review code quality before shipping.
3. 1-in-5 YC W25 startups have codebases >90% AI-generated, most with zero structured testing.
4. AI agents resolve the prompt, not the underlying intent — features appear correct but break in edge cases.
5. Vibe-coded apps frequently ship without any manual walkthrough of critical user flows.
6. "It works in my preview" is treated as sufficient QA, with no external human validation.
7. Developers using AI coding tools report skipping testing phases due to speed pressure.
8. AI-built apps lack mental model documentation — even the creator can't explain why things work.
9. 53% of developers who shipped AI-generated code later found security issues that passed initial review.
10. 86% of AI-generated code fails XSS defense mechanisms.
11. 45% of AI-generated code introduces OWASP Top 10 vulnerabilities.
12. Across 5,600 vibe-coded apps: 2,000+ vulnerabilities, 400+ exposed secrets, 175 instances of exposed PII.
13. AI-generated code is 2.74x more likely to introduce XSS vulnerabilities than human-written code.
14. Supabase credentials hard-coded in client-side bundles — found in 10/38 Lovable-built apps.
15. One vibe-coded app with 6,000 paid users had full admin access exploitable with no credentials.
16. Static security scanners don't catch runtime logic errors or auth flow bypasses.
17. AI agents finish a task and declare success with no ability to know if the app actually satisfies intent.
18. Non-technical users can't write Playwright/Cypress tests — they have no automated regression layer.
19. When a human finally clicks through an AI-built app, they find obvious usability bugs any QA pass would catch.
20. Feedback from real users reaches the AI agent only when it's too late (post-launch, paying customers).
21. AI-generated test cases have the same blind spots as the AI-generated code.
22. Trial-and-error prompting costs money (tokens) and time; no systematic way to verify "done" before shipping.
23. Enterprise QA platforms require $50K–$300K annual contracts — inaccessible for AI-builder users.
24. Rainforest QA charges ~$25/hour for crowdtesting — no fast-turnaround for indie developers.
25. UX tools (UserTesting, Maze, PlaybookUX) focus on UX research, not functional E2E validation.
26. Existing platforms require the buyer to supply test cases, URLs, and context — burden for non-technical founders.
27. Crowdtesting platforms have 24–72 hour turnaround windows, not the 1–4 hour feedback loop needed.
28. No platform combines: real human testing + network request logging + console error capture + video feedback.
29. Automated testing tools require engineering expertise and maintenance — not usable by AI-builder customers.
30. Test IO and Rainforest require test specs written beforehand — AI-builder users don't know what to specify.
31. Client taking over codebase with vibe coding: 10,000 lines added in a week, developer lost confidence.
32. Dependency sprawl from AI-generated code introduces unknown attack surfaces.
33. QA is no longer just verifying correctness — it is often the only line of defense against code nobody can explain.
34. Bolt.new notorious for blank screens, missing files, and partial deployments as projects grow.
35. Token costs spiral when AI agents loop to fix their own errors — 70% of tokens spent fixing, 30% building.
`

export async function POST() {
  try {
    const result = await generateObject({
      model: gateway('anthropic/claude-sonnet-4.5'),
      schema: ClusterSchema,
      prompt: `You are a startup research analyst helping a YC applicant find the sharpest problem to solve.
      
Cluster the following 35 pain points from AI app developers into exactly these 5 themes:
1. "agent_hallucinated_ui" - AI generates UIs/features that look functional but are wrong or incomplete
2. "broken_auth_flows" - Authentication, authorization, security vulnerabilities in AI-generated code  
3. "regressions_after_codegen" - New AI-generated code breaks existing features; no regression safety net
4. "needs_human_sanity_check" - No human validation loop; ships without any external review
5. "setup_friction_test_tooling" - Existing testing tools too expensive, slow, or require engineering expertise

For each theme:
- Assign the relevant pain point numbers (1-35) from the list
- Rate severity (critical/high/medium) based on frequency and impact
- Write a sharp one-sentence representative quote that captures the theme
- Explain in 1-2 sentences why this theme is particularly relevant for a YC-stage startup to solve

After clustering, identify:
- The single sharpest top insight (the insight that most clearly defines the wedge opportunity)
- The recommended first wedge (the narrowest possible entry point with highest density of pain)

Pain points to cluster:
${PAIN_POINTS}`,
    })

    return Response.json(result.object)
  } catch (error) {
    console.error('Cluster error:', error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
