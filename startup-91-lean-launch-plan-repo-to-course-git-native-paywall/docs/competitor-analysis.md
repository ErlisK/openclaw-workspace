# TeachRepo — Competitor Analysis

**Product:** TeachRepo — Git-native repo-to-course platform  
**Focus:** Engineers who prefer code-first workflows  
**Last updated:** 2025-04

---

## Summary

TeachRepo occupies a unique intersection: **Git-native course authoring** + **integrated payments** + **developer ergonomics**. No current competitor covers all three well. Most are either creator-focused (no Git) or developer-docs-focused (no payments).

---

## Competitor Matrix

| Platform | Pricing | Target User | Git-Native | Code Sandboxes | Quiz Support | Affiliate Support | Key Weakness vs. TeachRepo |
|----------|---------|------------|------------|----------------|-------------|-------------------|---------------------------|
| Gumroad | 10% fee | Creators (any) | ❌ | ❌ | ❌ | ✅ Basic | No structured course format, no Git |
| Teachable | $39–$119/mo + fees | Online educators | ❌ | ❌ | ✅ (GUI builder) | ✅ | Expensive, no code ergonomics |
| Podia | $33–$89/mo | Creators | ❌ | ❌ | ✅ | ✅ | No Git, no Markdown |
| Maven | Revenue share (5%) | Cohort courses | ❌ | ❌ | ❌ | ❌ | Live cohorts only, not async |
| Thinkific | $0–$149/mo | SMBs / educators | ❌ | ❌ | ✅ | ✅ | Enterprise-focused, no Git |
| Ghost | $9–$25/mo | Writers/bloggers | ❌ | ❌ | ❌ | ❌ | No course structure, no quizzes |
| GitBook | $6.7–$19/user | Teams / docs | ✅ Partial | ❌ | ❌ | ❌ | No payments, no course structure |
| Docusaurus | Free (OSS) | OSS docs | ✅ | ❌ | ❌ | ❌ | No payments, significant setup |
| MkDocs Material | Free (OSS) | Technical docs | ✅ | ❌ | ❌ | ❌ | No payments, no quizzes |
| Hashnode | Free–$19/mo | Dev bloggers | ✅ GitHub sync | ❌ | ❌ | ❌ | No course structure, no payments |
| Course Maker Pro | $99 one-time | Self-hosters | ❌ | ❌ | ✅ | ✅ | WordPress-based, no Git |
| Lemon Squeezy | 5% + $0.50/tx | Digital products | ❌ | ❌ | ❌ | ✅ Affiliates | No course structure |

---

## Detailed Profiles

### 1. Gumroad
- **Pricing:** Free tier (10% fee), Gumroad Pro ($10/mo, lower fees)
- **Target:** Indie creators of any type — eBooks, music, software, courses
- **Git-Native:** No. Content is uploaded via a web form
- **Course Support:** Basic "content" feature (PDF/video gating) — not a structured course experience
- **Quizzes:** None
- **Code Sandboxes:** None
- **Affiliates:** Yes — built-in affiliate marketplace with custom commission rates
- **Verdict:** Great for simple digital product sales. Terrible for structured technical courses. TeachRepo wins on course structure, Git ergonomics, and quiz/sandbox features.

### 2. Teachable
- **Pricing:** $39/mo (Basic), $119/mo (Pro), $199/mo (Pro+). Plus transaction fees on lower tiers.
- **Target:** Professional online course creators, coaches, educators
- **Git-Native:** No. Content created in a drag-and-drop web editor
- **Course Support:** Full course platform — video, quizzes, drip content, certificates
- **Quizzes:** Yes — GUI quiz builder with multiple choice, true/false
- **Code Sandboxes:** No
- **Affiliates:** Yes — built-in affiliate program with tracking
- **Verdict:** The 800-lb gorilla. Good for non-technical creators. Engineers hate the UI-first workflow. No Markdown, no Git, no code.

### 3. Podia
- **Pricing:** $33/mo (Starter), $89/mo (Shaker), $199/mo (Earthquaker)
- **Target:** Solopreneurs — courses, memberships, digital downloads
- **Git-Native:** No
- **Course Support:** Yes — drip, sections, quizzes, community
- **Quizzes:** Yes (basic)
- **Code Sandboxes:** No
- **Affiliates:** Yes
- **Verdict:** Friendlier than Teachable but same problem: web UI-only, no Git, no Markdown.

### 4. Maven
- **Pricing:** 5% revenue share per student
- **Target:** Expert instructors running cohort-based (live) courses
- **Git-Native:** No
- **Course Support:** Live cohort model — structured schedules, cohorts, community
- **Quizzes:** No
- **Code Sandboxes:** No
- **Affiliates:** No
- **Verdict:** Specialized for high-touch live courses. Async self-paced courses are a secondary use case. Engineers wanting to ship a "pay once, learn async" course would be better served by TeachRepo.

### 5. Thinkific
- **Pricing:** Free (limited), $36/mo (Basic), $74/mo (Start), $149/mo (Grow)
- **Target:** SMBs, enterprise L&D, professional educators
- **Git-Native:** No
- **Course Support:** Full platform — video, quizzes, drip, certificates, communities
- **Quizzes:** Yes — extensive quiz builder
- **Code Sandboxes:** No
- **Affiliates:** Yes (on paid plans)
- **Verdict:** Enterprise-grade but engineers find it bloated. No code-first affordances.

### 6. Ghost (Memberships)
- **Pricing:** Self-hosted free, Ghost Pro $9–$25/mo
- **Target:** Writers, bloggers, newsletters
- **Git-Native:** Ghost supports Markdown writing but no Git-based publishing workflow natively
- **Course Support:** No structured course format. Can simulate with "series" but no progress tracking
- **Quizzes:** No
- **Code Sandboxes:** No
- **Affiliates:** No built-in affiliate system
- **Verdict:** Great for newsletters/blogs with memberships. Not a course platform. Engineers using Ghost would need to build their own course structure on top.

### 7. GitBook
- **Pricing:** Free (public), $6.70/user/mo (Plus), $19.90/user/mo (Pro)
- **Target:** Engineering teams, developer documentation
- **Git-Native:** Yes — GitHub sync, bidirectional. Markdown files.
- **Course Support:** No. It's a documentation/wiki platform — no enrollments, no payments, no progress tracking
- **Quizzes:** No
- **Code Sandboxes:** No
- **Affiliates:** No
- **Verdict:** Closest to TeachRepo ergonomics but purely a docs platform. No monetization whatsoever. TeachRepo = GitBook + Stripe + course structure.

### 8. Docusaurus
- **Pricing:** Free (open source, Meta-maintained)
- **Target:** OSS projects and technical documentation
- **Git-Native:** Yes — 100% Markdown + Git
- **Course Support:** No
- **Quizzes:** Community plugin available, not official
- **Code Sandboxes:** Via embeds (manual)
- **Affiliates:** No
- **Verdict:** Perfect for free docs. Zero monetization support. Self-hosting Docusaurus + adding payments would be ~40 hours of work — exactly the problem TeachRepo solves.

### 9. MkDocs Material
- **Pricing:** Free (open source)
- **Target:** Python/technical OSS documentation
- **Git-Native:** Yes — Markdown + Git
- **Course Support:** No course structure or progress tracking
- **Quizzes:** Community plugin (mkdocs-quiz) exists but is limited
- **Code Sandboxes:** Via embeds
- **Affiliates:** No
- **Verdict:** Same as Docusaurus — powerful for free docs, zero for monetization.

### 10. Hashnode
- **Pricing:** Free (individual), $19/mo (team)
- **Target:** Developer bloggers
- **Git-Native:** Yes — GitHub backup/sync available
- **Course Support:** No course structure, no enrollment, no progress
- **Quizzes:** No
- **Code Sandboxes:** CodePen/Replit embed support
- **Affiliates:** No
- **Verdict:** Developer-friendly blogging. No course infrastructure. Some TeachRepo users might start here, then migrate.

### 11. Course Maker Pro
- **Pricing:** $99 one-time license (WordPress plugin)
- **Target:** Self-hosting WordPress users
- **Git-Native:** No (WordPress)
- **Course Support:** Full LMS — quizzes, progress, certificates, drip
- **Quizzes:** Yes — GUI builder
- **Code Sandboxes:** No
- **Affiliates:** Via AffiliateWP plugin ($99+)
- **Verdict:** WordPress-dependent. Engineers running on WP could use this but it's a completely different ecosystem.

### 12. Lemon Squeezy
- **Pricing:** 5% + $0.50 per transaction
- **Target:** SaaS and digital product sellers
- **Git-Native:** No
- **Course Support:** Basic — file delivery only, no structured course experience
- **Quizzes:** No
- **Code Sandboxes:** No
- **Affiliates:** Yes — full affiliate management with automatic Stripe Connect payouts
- **Verdict:** Great affiliate system and better UX than Gumroad for digital products. But no course structure at all.

---

## TeachRepo's Differentiated Position

TeachRepo is the **only platform** that combines:

1. ✅ **Git-native authoring** — write lessons as Markdown, deploy with `git push`
2. ✅ **Inline quizzes** — YAML frontmatter, no separate tool
3. ✅ **Stripe-integrated payments** — one-click setup, immediate entitlements
4. ✅ **Affiliate tracking** — built-in, no plugin required
5. ✅ **AI quiz generation** — Claude-powered, one click
6. ✅ **Self-hostable** — free tier for engineers who want control
7. ✅ **Code sandboxes** — gated, embeddable (SaaS tier)

**Closest competitors by use case:**
- For payments: Gumroad / Lemon Squeezy (but no course structure)
- For authoring: GitBook / Docusaurus (but no payments)
- For full course platform: Teachable / Thinkific (but no Git ergonomics)

**Primary competition in engineer's mind:** *"I'll just hand-roll it with MkDocs + Gumroad."* TeachRepo's job is to be 10× faster than that option.
