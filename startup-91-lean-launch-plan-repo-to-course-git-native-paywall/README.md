# TeachRepo

> Convert a GitHub repo or folder of Markdown notes into a paywalled, versioned mini-course site — in minutes.

**For engineers who prefer code-first workflows.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ErlisK/openclaw-workspace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Monorepo Structure

This is an **npm workspaces** monorepo orchestrated with **[Turborepo](https://turbo.build)**.

```
teachrepo/
│
├── apps/
│   └── web/                    # Next.js 14 App Router (TypeScript)
│       ├── src/app/            # App Router pages and layouts
│       ├── src/components/     # App-specific components
│       ├── next.config.js
│       ├── tailwind.config.ts
│       └── tsconfig.json       # Extends ../../tsconfig.react.json
│
├── packages/
│   ├── cli/                    # `teachrepo` CLI (Node.js, TypeScript)
│   │   └── src/
│   │       ├── index.ts        # Commander entry point
│   │       └── commands/       # init, dev, validate, build, publish, quiz
│   │
│   ├── core/                   # Course parsing + validation logic
│   │   └── src/
│   │       ├── parseCourse.ts  # Reads course.config.yaml + all lessons
│   │       ├── parseLesson.ts  # Parses a single Markdown + frontmatter file
│   │       ├── validateCourse.ts # Schema + quiz structure validation
│   │       └── schemas.ts      # Zod schemas for CourseConfig + LessonFrontmatter
│   │
│   ├── quiz-engine/            # YAML quiz parser + auto-grader
│   │   └── src/
│   │       ├── parseQuiz.ts    # Validates quiz frontmatter array
│   │       └── gradeQuiz.ts    # Scores a set of answers against correct answers
│   │
│   ├── types/                  # Shared TypeScript types (no runtime code)
│   │   └── src/
│   │       ├── course.ts       # Course, Lesson, CourseConfig, PricingModel
│   │       ├── user.ts         # User, SaasTier
│   │       ├── enrollment.ts   # Enrollment, isEntitlementActive()
│   │       ├── quiz.ts         # QuizQuestion, QuizAttempt, QuizResult
│   │       ├── affiliate.ts    # Affiliate, AffiliateClick, AffiliateConversion
│   │       ├── analytics.ts    # AnalyticsEventName, per-event property shapes
│   │       └── api.ts          # Request/response contracts for all API routes
│   │
│   └── ui/                     # Shared React component library (Tailwind)
│       └── src/
│           ├── components/
│           │   ├── Button.tsx
│           │   ├── Badge.tsx
│           │   ├── Card.tsx
│           │   ├── PriceTag.tsx
│           │   ├── ProgressBar.tsx
│           │   ├── QuizCard.tsx
│           │   ├── LessonCard.tsx
│           │   └── CourseCard.tsx
│           └── lib/utils.ts    # cn() Tailwind class merger
│
├── templates/
│   └── course-starter/         # Fork-ready sample course repo
│       ├── course.config.yaml
│       ├── lessons/
│       │   ├── 01-introduction.md      # With YAML quiz frontmatter
│       │   ├── 02-getting-started.md
│       │   └── 03-advanced-topics.md
│       └── .github/workflows/
│           └── publish-course.yml      # Auto-publish on git push
│
├── supabase/
│   ├── schema.sql              # Full 10-table DB schema
│   ├── rls.sql                 # Row Level Security policies
│   └── README.md               # Supabase setup instructions
│
├── docs/
│   ├── hypotheses.md           # H1–H6 lean startup hypotheses + test plans
│   ├── competitor-analysis.md  # 17 competitors/alternatives analyzed
│   ├── analytics-events.md     # Full analytics event spec (13 events)
│   └── stripe-integration.md   # Stripe Checkout + entitlement design
│
├── package.json                # npm workspaces root
├── turbo.json                  # Turborepo pipeline config
├── tsconfig.base.json          # Shared TS config (Node/server packages)
├── tsconfig.react.json         # Shared TS config (React packages)
├── .eslintrc.json              # Root ESLint config
├── .prettierrc.json            # Prettier config
└── .npmrc                      # npm workspace settings
```

---

## Workspace Packages

| Package | Name | Description |
|---------|------|-------------|
| `apps/web` | `@teachrepo/web` | Next.js 14 App Router — course platform UI, creator dashboard, checkout |
| `packages/cli` | `@teachrepo/cli` | `teachrepo` CLI — init, dev, validate, build, publish, quiz generate |
| `packages/core` | `@teachrepo/core` | Course parsing (YAML+Markdown), schema validation, Zod schemas |
| `packages/quiz-engine` | `@teachrepo/quiz-engine` | Quiz YAML parser + answer grader |
| `packages/types` | `@teachrepo/types` | Shared TypeScript types — domain models, API contracts, analytics shapes |
| `packages/ui` | `@teachrepo/ui` | Shared React component library — Button, QuizCard, CourseCard, etc. |

---

## Tooling

| Tool | Purpose |
|------|---------|
| **npm workspaces** | Package linking and hoisting |
| **Turborepo** | Incremental builds, cached pipelines, parallel tasks |
| **TypeScript 5.4** | Strict mode; project references for fast incremental builds |
| **ESLint** | `@typescript-eslint` + `prettier` config |
| **Prettier** | Formatting with `prettier-plugin-tailwindcss` |
| **Tailwind CSS 3.4** | Styling in `apps/web` and `packages/ui` |

---

## Quick Start

```bash
# Install all dependencies (hoisted to root)
npm install

# Run the web app in dev mode
npm run dev

# Type-check all packages
npm run type-check

# Build everything (respects Turbo dependency order)
npm run build

# Lint all packages
npm run lint

# Format all files
npm run format
```

---

## Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://teachrepo.com
```

---

## Tier Options

| Tier | Price | Description |
|------|-------|-------------|
| **Self-Hosted** | Free | Deploy yourself, bring your own Stripe + Supabase |
| **Creator SaaS** | $29/mo | Hosted on teachrepo.com, no infra setup |
| **Marketplace** | 15% rev-share | List on TeachRepo marketplace |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + RLS)
- **Payments:** Stripe Checkout (session-based entitlement)
- **Hosting:** Vercel
- **Auth:** Supabase Auth
- **AI:** Vercel AI Gateway (Claude Sonnet — quiz generation)

---

## Links

- **Website:** https://teachrepo.com
- **Email:** hello@teachrepo.com
