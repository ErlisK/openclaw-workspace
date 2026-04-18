---
title: "Advanced Topics — Affiliate Links, AI Quizzes, and Versioning"
slug: "advanced-topics"
order: 3
access: paid
description: "Go beyond basics: set up affiliate tracking, generate quizzes with AI, manage course versions, and embed gated sandboxes."
estimated_minutes: 20
quiz_id: "advanced-final-quiz"
sandbox_url: "https://codesandbox.io/embed/teachrepo-advanced-demo"
---

# Advanced Topics

You've got a course live. Let's level it up.

## Affiliate / Referral Links

Affiliates share your course with their audience and earn a commission on each sale.

### Setting Up Affiliates

In `course.config.yaml`:

```yaml
affiliates:
  enabled: true
  default_commission_pct: 30
  cookie_days: 30
```

### How It Works

1. Go to **Dashboard → Affiliates** and create an affiliate code
2. Share the URL: `https://teachrepo.com/your-course?ref=AFFILIATE_CODE`
3. When someone clicks the link, the `ref` is stored in a cookie
4. If they purchase within the cookie window, the affiliate earns their commission

## AI Quiz Generation

Don't want to write quiz questions manually? Let AI do it.

```bash
teachrepo quiz generate lessons/01-introduction.md
```

This sends the lesson content to Claude Sonnet and creates `quizzes/introduction-quiz.yml`.
You review and edit before publishing.

### From the Web Dashboard

Click **"✨ Generate Quiz"** on any lesson in the course editor.

## Course Versioning

Since courses are Git repos, versioning is built-in:

```bash
# Make changes to lessons
vim lessons/02-getting-started.md

# Commit the update
git add . && git commit -m "feat: add Docker setup section"

# Push — TeachRepo auto-rebuilds the course site
git push origin main
```

Update the version in `course.config.yaml`:

```yaml
course:
  version: "1.1.0"
```

## Gated Code Sandboxes

Embed live, runnable code environments in your lessons using the `sandbox_url` frontmatter field:

```yaml
---
title: "Hands-On Exercise"
slug: "hands-on"
order: 4
access: paid
sandbox_url: "https://codesandbox.io/embed/my-sandbox-id"
---
```

TeachRepo renders a gated sandbox iframe — only enrolled students can interact with it.
The URL is never sent to unenrolled visitors' browsers.
