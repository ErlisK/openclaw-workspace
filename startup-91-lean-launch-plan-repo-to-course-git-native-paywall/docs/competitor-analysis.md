# TeachRepo — Competitor Analysis

**Product:** TeachRepo — Git-native repo-to-course platform  
**Focus:** Engineers who prefer code-first workflows  
**Last updated:** 2025-04 (v2 — expanded with DIY stacks, mdBook, Notion-to-course tools)

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
| **DIY: Gumroad + SSG** | Gumroad fees + hosting | Self-sufficient devs | ✅ (SSG part) | Via embeds | ❌ | ✅ Gumroad only | ~30–40h setup; paywall is URL-gating only |
| **DIY: Next.js + Stripe** | Hosting cost only | Senior engineers | ✅ | ✅ Custom | ❌ | ❌ Build it yourself | 60–80h to build from scratch |
| **mdBook** | Free (OSS, Rust) | Rust/systems devs | ✅ | ❌ | ❌ | ❌ | Zero monetization; Rust toolchain required |
| **Notion + Super/Potion** | $12–$19/mo | Non-technical creators | ❌ (Notion DB) | ❌ | ❌ | ❌ | Not Git-native; no payment gate |
| **Notionify / Notion2Course** | Free–$29/mo | Notion-first creators | ❌ | ❌ | Basic | ❌ | Notion-locked; no code/Git integration |

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

### 13. DIY Stack: Gumroad + Static Site Generator

The most common DIY pattern TeachRepo engineers actually use today.

- **Pricing:** Gumroad fees (10% free tier / $10/mo Pro) + hosting costs (Vercel free tier)
- **Target:** Self-sufficient developers who want full control
- **Git-Native:** Partially — the SSG (Docusaurus, MkDocs, Eleventy, Hugo) is Git-native, but the paywall is bolted on
- **Paywall Mechanism:** Gumroad sells a PDF/ZIP → creator manually emails a private URL, or uses a Gumroad license key checked against a Netlify/Vercel Edge Function. Fragile.
- **Course Support:** SSG provides navigation and Markdown rendering — but no enrollment tracking, no progress, no quizzes
- **Quizzes:** None (would need a third-party embed like Typeform)
- **Code Sandboxes:** Manual embeds only (CodeSandbox iframe)
- **Affiliates:** Gumroad affiliate system only
- **Setup Time:** 30–40 hours to wire up properly. Most people give up halfway and just sell a PDF.
- **Verdict:** This is TeachRepo's **primary competitor in engineers' minds**. It's the answer to "I'll just do it myself." TeachRepo's core value proposition is being 10× faster and more reliable than this.

### 14. DIY Stack: Next.js App Router + Stripe + Supabase

The "I'm a real engineer, I'll build it myself" stack.

- **Pricing:** Hosting cost only (Vercel + Supabase free tiers)
- **Target:** Senior engineers who enjoy infrastructure
- **Git-Native:** Yes — full control
- **Course Support:** Whatever you build
- **Quizzes:** Whatever you build
- **Code Sandboxes:** Whatever you build
- **Affiliates:** Whatever you build
- **Setup Time:** 60–80 hours minimum to get a production-quality course site (auth, payments, webhooks, content rendering, quiz engine, progress tracking)
- **Verdict:** TeachRepo is this stack, pre-built. For engineers who'd rather ship a course than build course infrastructure, TeachRepo wins. For engineers who enjoy building infra, they'll self-host TeachRepo's open-source core.

### 15. mdBook

Rust's official documentation framework, widely used in the Rust ecosystem.

- **Pricing:** Free (open source)
- **Target:** Rust developers writing documentation or books
- **Git-Native:** Yes — Markdown + Git, builds with `mdbook build`
- **Course Support:** Linear navigation, chapters — but no enrollment, no payments, no progress
- **Quizzes:** Community plugin (`mdbook-quiz`) using TOML — limited, requires Rust build chain
- **Code Sandboxes:** Rust Playground embeds only
- **Affiliates:** None
- **Setup Time:** Low (30 min for docs) — but adding payments would require a completely custom solution
- **Verdict:** Great for free Rust books ("The Rust Programming Language" uses it). Zero monetization path. Engineers writing paid Rust courses hit a wall immediately — TeachRepo fills that gap.

### 16. Notion + Super.so / Potion.so

Notion-as-a-website tools used by non-technical content creators.

- **Pricing:** Notion ($8–$15/user/mo) + Super ($12/mo) or Potion ($19/mo)
- **Target:** Non-technical creators who live in Notion
- **Git-Native:** No — Notion is a closed-source SaaS database
- **Course Support:** You can simulate a course with nested Notion pages, but there's no enrollment, progress tracking, or access gating built in
- **Quizzes:** Via Typeform/Google Forms embeds only
- **Code Sandboxes:** Via CodeSandbox iframe embeds
- **Affiliates:** None built-in
- **Payments:** Requires a third-party tool (Gumroad, Stripe custom, or Memberstack)
- **Verdict:** Popular with non-technical info-product creators. Engineers dislike Notion as a development environment — no Git, no Markdown files on disk, no version history in git, vendor lock-in. Not a serious competitor for TeachRepo's audience.

### 17. Notion-to-Course Tools (Notionify, Notion2Course, Super Courses)

A category of tools building course wrappers on top of Notion.

- **Pricing:** Typically $15–$29/mo
- **Target:** Notion-native creators who want a "course" experience
- **Git-Native:** No
- **Course Support:** Basic lesson navigation, some progress tracking
- **Quizzes:** Basic (via embeds or very limited native support)
- **Code Sandboxes:** None
- **Affiliates:** None
- **Verdict:** Niche category with fundamental limitations — Notion API rate limits, Notion design constraints, vendor lock-in. Engineers writing code-heavy courses would find this completely inadequate. Not a direct competitor.

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
8. ✅ **Fast onboarding** — zero to live paywalled course in <15 minutes
9. ✅ **Course templates** — fork-and-go starters, no blank-canvas anxiety
10. ✅ **Marketplace** — optional distribution channel (SaaS tier)

---

## Differentiator Matrix

Scored 0–2: ❌ = not supported, 🟡 = partial/workaround, ✅ = native support

| Differentiator | TeachRepo | Gumroad+SSG | Next+Stripe DIY | GitBook | Teachable | Docusaurus | mdBook | Notion+Super |
|----------------|-----------|-------------|-----------------|---------|-----------|------------|--------|-------------|
| **Git-native authoring** | ✅ | 🟡 SSG only | ✅ build it | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Fast setup (<15 min)** | ✅ | ❌ 30-40h | ❌ 60-80h | 🟡 docs only | 🟡 UI-heavy | ❌ no paywall | ❌ no paywall | 🟡 no paywall |
| **Integrated payments** | ✅ | 🟡 Gumroad | ✅ build it | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Immediate entitlements** | ✅ webhook | 🟡 manual URL | ✅ build it | ❌ | ✅ | ❌ | ❌ | ❌ |
| **YAML quiz (inline)** | ✅ | ❌ | ❌ build it | ❌ | ✅ GUI | ❌ | 🟡 plugin | ❌ |
| **AI quiz generation** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Affiliate tracking** | ✅ | 🟡 Gumroad | ❌ build it | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Gated code sandboxes** | ✅ SaaS | ❌ | ❌ build it | ❌ | ❌ | 🟡 public only | 🟡 Rust only | 🟡 embeds |
| **Self-hostable** | ✅ | ✅ | ✅ | 🟡 enterprise | ❌ | ✅ | ✅ | ❌ |
| **Course templates** | ✅ | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ |
| **Marketplace** | ✅ planned | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Progress tracking** | ✅ | ❌ | ❌ build it | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Version history** | ✅ Git | 🟡 Git+SSG | ✅ Git | ✅ | ❌ | ✅ Git | ✅ Git | ❌ |
| **No-OAuth public import** | ✅ MVP | N/A | N/A | ❌ | ❌ | N/A | N/A | N/A |

**TeachRepo score: 14/14** — the only solution that scores ✅ across all differentiators.

---

## "Jobs to Be Done" Competitive Map

When an engineer decides to monetize their knowledge:

```
 FAST SETUP
      ↑
      │
  [TeachRepo] ←── Our target
      │
 [Gumroad+SSG]    [Next+Stripe DIY]
      │                    │
──────┼────────────────────┼──── GIT-NATIVE
      │                    │
 [Teachable]         [Docusaurus]
 [Thinkific]         [GitBook]
      │
      ↓
 SLOW SETUP / NO GIT
```

**The opportunity:** The top-right quadrant (fast + Git-native + payments) is empty. TeachRepo owns it.

---

## Competitive Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GitBook adds payments | Medium | High | Network effects, templates, AI quiz gen |
| Vercel/Netlify builds a course product | Low | Very High | Move fast, build community |
| Teachable clones Git import | Low | Medium | They'll never care about engineer UX |
| Gumroad adds course structure | Medium | Medium | Our quizzes, sandboxes, AI = moat |
| An OSS competitor emerges | High | Medium | Self-host tier = absorb them |

---

**Closest competitors by use case:**
- For payments: Gumroad / Lemon Squeezy (but no course structure)
- For authoring: GitBook / Docusaurus (but no payments)
- For full course platform: Teachable / Thinkific (but no Git ergonomics)
- For DIY engineers: Next.js + Stripe + Supabase (but 60–80h to build)

**Primary competition in engineer's mind:** *"I'll just hand-roll it with MkDocs + Gumroad."* TeachRepo's job is to be 10× faster than that option.
