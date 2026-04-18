# Ship It: A Practical Git Workflow for Engineers

> **A TeachRepo sample course template.** Fork this repo to create your own course on [teachrepo.com](https://teachrepo.com).

[![TeachRepo](https://img.shields.io/badge/Published%20on-TeachRepo-6366f1)](https://teachrepo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

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
        └── publish-course.yml          ← Auto-publish on git push to main
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
```

See [docs/course-format.md](../../docs/course-format.md) for the full field reference.

## Quiz Format

Quizzes live in `quizzes/{id}.yml` and are referenced from lesson frontmatter via `quiz_id`.

Three question types:
- `multiple_choice` — choices list + 0-based `answer` index
- `true_false` — boolean `answer`
- `short_answer` — string `answer` (case-insensitive match)

Each question supports `points` (default 1) and `explanation` (shown after answering).

## Gated Sandbox Embed

Lesson 5 includes a live StackBlitz sandbox:

```yaml
sandbox_url: "https://stackblitz.com/edit/github-actions-ci-starter?embed=1"
```

For `access: paid` lessons, TeachRepo **never sends the `sandbox_url` to unenrolled browsers** — the gating is server-side.

## Publishing Your Course

### Prerequisites

```bash
npm install -g @teachrepo/cli
```

### Validate locally

```bash
teachrepo validate
# Checks frontmatter, quiz references, duplicate slugs, etc.
```

### Publish

```bash
teachrepo publish --token YOUR_TOKEN
# → Deploys to https://teachrepo.com/your-course-slug
```

### Auto-publish on git push

The included `.github/workflows/publish-course.yml` re-publishes automatically when you push changes to lessons, quizzes, or `course.yml`.

Set the `TEACHREPO_PUBLISH_TOKEN` secret in your repo's GitHub Settings → Secrets.

## Using This as a Template

1. Fork this repo (or use it as a GitHub template)
2. Edit `course.yml` with your title, description, price, and affiliate %
3. Replace `lessons/*.md` with your own content
4. Replace `quizzes/*.yml` with your own questions
5. Run `teachrepo validate`
6. Run `teachrepo publish`

That's it. Your course is live.

## License

MIT — use this template for any course, commercial or otherwise.

---

Built with [TeachRepo](https://teachrepo.com) · Questions? [hello@teachrepo.com](mailto:hello@teachrepo.com)
