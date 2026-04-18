# TeachRepo

> Convert a GitHub repo or folder of Markdown notes into a paywalled, versioned mini-course site — in minutes.

**For engineers who prefer code-first workflows.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ErlisK/openclaw-workspace)

---

## What is TeachRepo?

TeachRepo lets you author courses the same way you write code:

- Write lessons as **Markdown files** with YAML frontmatter
- Define **quizzes inline** using YAML in the same file
- Track versions with **Git** — every course change is a commit
- **One-click deploy** to a hosted course site (Next.js + Vercel)
- Accept payments via **Stripe Checkout** — entitlements unlock instantly on payment
- Offer **affiliate/referral tracking** with simple `?ref=` query params
- **AI-assisted quiz generation** from lesson content

---

## Monorepo Structure

This is a [npm workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces) monorepo.

```
teachrepo/
├── apps/
│   ├── web/            # Next.js 14 App Router site (TypeScript)
│   └── cli/            # teachrepo CLI — init, build, publish commands
├── packages/
│   ├── core/           # Course parsing, schema validation, Git helpers
│   └── quiz-engine/    # YAML quiz parser, auto-grader, scoring
├── templates/
│   └── course-starter/ # Sample "Hello, TeachRepo" course repo template
├── supabase/
│   ├── schema.sql      # Full DB schema
│   └── rls.sql         # Row-Level Security policies
└── docs/
    ├── hypotheses.md          # Lean startup hypotheses + test plans
    ├── competitor-analysis.md # 10+ alternative solutions analyzed
    ├── analytics-events.md    # Full analytics event spec
    └── stripe-integration.md  # Stripe Checkout + entitlement design
```

### Workspaces

| Workspace | Description |
|-----------|-------------|
| `apps/web` | The hosted course platform UI — creator dashboard, course pages, checkout, quizzes |
| `apps/cli` | `teachrepo init / build / publish` CLI for local-first workflows |
| `packages/core` | Shared: Markdown parsing, YAML frontmatter extraction, course schema types |
| `packages/quiz-engine` | Quiz YAML parser, answer validation, score aggregation |
| `templates/course-starter` | Template repo that creators fork to start a new course |

---

## Quick Start

```bash
# Clone the starter template
npx create-teachrepo my-course

# cd into your course
cd my-course

# Write lessons (they're just Markdown files!)
vim lessons/01-intro.md

# Preview locally
npx teachrepo dev

# Publish to TeachRepo
npx teachrepo publish
```

---

## Tier Options

| Tier | Price | Description |
|------|-------|-------------|
| **Self-Hosted** | Free | Deploy yourself, bring your own Stripe + Supabase |
| **Creator SaaS** | $29/mo | Hosted on teachrepo.com, no infra setup |
| **Marketplace** | Rev-share | List on TeachRepo marketplace, 15% platform fee |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + RLS)
- **Payments:** Stripe Checkout (session-based entitlement)
- **Hosting:** Vercel
- **Auth:** Supabase Auth
- **AI:** Vercel AI Gateway (Claude Sonnet for quiz generation)

---

## Development

```bash
# Install all dependencies
npm install

# Run the web app
npm run dev --workspace=apps/web

# Run CLI in watch mode
npm run dev --workspace=apps/cli

# Run all tests
npm test
```

---

## Links

- **Website:** https://teachrepo.com
- **Email:** hello@teachrepo.com
- **Docs:** https://teachrepo.com/docs
