# Ship It: A Practical Git Workflow for Engineers

> **A TeachRepo sample course template.** Fork this repo to create your own course on [teachrepo.com](https://teachrepo.com).

[![TeachRepo](https://img.shields.io/badge/Published%20on-TeachRepo-6366f1)](https://teachrepo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Validate Course](https://github.com/ErlisK/openclaw-workspace/actions/workflows/publish-course.yml/badge.svg)](https://github.com/ErlisK/openclaw-workspace/actions/workflows/publish-course.yml)

---

## Deploy Your Own TeachRepo Instance

Host this entire platform yourself — course builder, paywall, affiliate tracking, quizzes, and all:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FErlisK%2Fopenclaw-workspace%2Ftree%2Fmain%2Fstartup-91-lean-launch-plan-repo-to-course-git-native-paywall%2Fapps%2Fweb&project-name=my-teachrepo&repository-name=my-teachrepo&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,STRIPE_SECRET_KEY,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,STRIPE_WEBHOOK_SECRET,NEXT_PUBLIC_APP_URL&envDescription=Configure%20Supabase%2C%20Stripe%2C%20and%20your%20app%20URL&envLink=https%3A%2F%2Fteachrepo.com%2Fdocs%2Fself-hosting&demo-title=TeachRepo%20Demo&demo-description=Git-native%20course%20platform%20with%20Stripe%20paywall%20and%20affiliate%20tracking&demo-url=https%3A%2F%2Fteachrepo.com)

**Or publish this course to an existing TeachRepo instance:**

```bash
npm install -g @teachrepo/cli
teachrepo link --api-url https://teachrepo.com
TEACHREPO_API_KEY=<your-key> teachrepo push
```

---

## What's in this repo

A complete, production-ready TeachRepo course template covering practical Git workflows for engineers. Use it as:

1. **A working example** — see how a real TeachRepo course is structured
2. **A starter template** — fork and replace the content with your own topic
3. **A reference** — check the frontmatter/YAML conventions in action

## Course Structure

```
sample-course/
├── course.yml                          ← Course metadata, pricing, affiliate %
│
├── lessons/
│   ├── 01-git-mental-model.md          ← access: free  (preview)
│   ├── 02-branches-and-commits.md      ← access: free  (preview)
│   ├── 03-rebase-without-fear.md       ← access: paid  + quiz
│   ├── 04-pull-request-hygiene.md      ← access: paid
│   └── 05-ci-cd-pipeline.md           ← access: paid  + gated sandbox
│
├── quizzes/
│   ├── git-mental-model-quiz.yml       ← Lesson 1 quiz (5 questions)
│   └── rebase-quiz.yml                ← Lesson 3 quiz (5 questions, 75% pass threshold)
│
└── .github/
    └── workflows/
        ├── publish-course.yml          ← Auto-publish on git push to main
        └── static-export.yml           ← Build static site for self-hosters
```

## CLI Quickstart

```bash
# Install the TeachRepo CLI
npm install -g @teachrepo/cli

# Scaffold a new course in the current directory
mkdir my-course && cd my-course
teachrepo init

# Validate your course structure
teachrepo validate

# Link to your TeachRepo instance
teachrepo link --api-url https://teachrepo.com

# Publish your course
export TEACHREPO_API_KEY=<your-key>
teachrepo push

# Generate quiz questions for a lesson with AI
teachrepo quiz generate lessons/01-introduction.md --num-questions 5
```

## Lesson Features Demonstrated

| Feature | Where |
|---------|-------|
| `access: free` (public preview) | Lessons 1–2 |
| `access: paid` (enrolled only) | Lessons 3–5 |
| Quiz attachment (`quiz_id`) | Lessons 1, 3 |
| Gated sandbox embed (`sandbox_url`) | Lesson 5 (StackBlitz) |
| `estimated_minutes` | All lessons |
| `description` for SEO | All lessons |

## course.yml Fields

```yaml
title: "Ship It: A Practical Git Workflow for Engineers"
description: "Everything a working engineer needs..."
repo_url: "https://github.com/example/my-course"
price_cents: 2900        # $29.00 — 0 = free
currency: "usd"
affiliate_pct: 30        # 30% commission to referrers
slug: "git-workflow-engineers"
```

See [docs/course-format.md](../../docs/course-format.md) for the full field reference.

## Lesson Frontmatter

```markdown
---
title: "Rebase Without Fear"
slug: "rebase-without-fear"
order: 3
access: paid              # free | paid
description: "Master interactive rebase and stop fearing git history rewriting."
estimated_minutes: 12
quiz_id: "rebase-quiz"   # references quizzes/rebase-quiz.yml
---

Your lesson content in Markdown...
```

## Quiz Format

Quizzes live in `quizzes/{id}.yml` and are referenced from lesson frontmatter via `quiz_id`.

Three question types:

```yaml
id: "my-quiz"
title: "My Quiz Title"
pass_threshold: 70       # % to pass (default: 70)
ai_generated: false

questions:
  - type: multiple_choice
    prompt: "Which command stages changes?"
    choices:
      - "git commit"
      - "git add"
      - "git push"
      - "git stash"
    answer: 1              # 0-based index of correct choice
    points: 1
    explanation: "git add copies changes to the staging area (Index)."

  - type: true_false
    prompt: "A git branch is a copy of all repository files."
    answer: false
    points: 1
    explanation: "A branch is just a named pointer to a commit."
```

### AI Quiz Generation

```bash
# Generate quiz questions with AI (requires TEACHREPO_API_KEY)
teachrepo quiz generate lessons/03-rebase-without-fear.md
# → writes quizzes/rebase-without-fear-quiz.yml

# Customize the number of questions
teachrepo quiz generate lessons/03-rebase-without-fear.md --num-questions 5
```

Or call the API directly:

```bash
curl -X POST https://teachrepo.com/api/quiz/generate \
  -H "Authorization: Bearer $TEACHREPO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonContent": "$(cat lessons/03-rebase-without-fear.md)",
    "numQuestions": 3
  }'
```

## Gated Sandbox Embed

Lesson 5 includes a live StackBlitz sandbox:

```yaml
sandbox_url: "https://stackblitz.com/edit/github-actions-ci-starter?embed=1"
```

For `access: paid` lessons, TeachRepo **never sends the `sandbox_url` to unenrolled browsers** — the gating is server-side via RLS.

## GitHub Actions: Auto-Publish

The included `.github/workflows/publish-course.yml` re-publishes automatically when you push changes to lessons, quizzes, or `course.yml`.

1. Fork this repo
2. Add `TEACHREPO_API_KEY` secret in GitHub Settings → Secrets → Actions
3. Push a change — the course publishes automatically

## GitHub Actions: Static Export (Self-Hosting)

Use `.github/workflows/static-export.yml` to build a standalone static site for self-hosting:

1. The workflow runs `next build` with `NEXT_PUBLIC_` vars from GitHub secrets
2. Artifacts are uploaded and can be deployed to any static host (Cloudflare Pages, S3, Netlify)
3. Set `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` secrets to auto-deploy to Vercel instead

## Self-Hosting Checklist

- [ ] Fork this repo
- [ ] Create a Supabase project + run the schema migration
- [ ] Create a Stripe account + set up webhook endpoint
- [ ] Click "Deploy with Vercel" button above
- [ ] Set all required environment variables
- [ ] Run `teachrepo link --api-url https://your-instance.vercel.app`
- [ ] Push your first course: `teachrepo push`

## License

MIT — use this template for any course, commercial or otherwise.

---

Built with [TeachRepo](https://teachrepo.com) · Questions? [hello@teachrepo.com](mailto:hello@teachrepo.com)
