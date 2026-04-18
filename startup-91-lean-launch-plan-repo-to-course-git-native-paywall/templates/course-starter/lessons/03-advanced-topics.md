---
title: "Advanced Topics — Affiliate Links, AI Quizzes, and Versioning"
slug: "03-advanced-topics"
description: "Go beyond basics: set up affiliates, generate quizzes with AI, and manage course versions."
order: 3
is_preview: false
estimated_minutes: 20

quiz:
  - question: "How do you track affiliate referrals in TeachRepo?"
    type: multiple_choice
    options:
      - "A separate affiliate dashboard login"
      - "Unique subdomain per affiliate"
      - "A ?ref= query parameter in your course URL"
      - "Coupon codes only"
    correct: 2
    explanation: "TeachRepo uses simple `?ref=<affiliate-code>` query parameters. The ref is stored in a cookie for the attribution window (default 30 days) and attributed on checkout."

  - question: "What CLI command generates a quiz for a lesson using AI?"
    type: multiple_choice
    options:
      - "teachrepo ai quiz lessons/01-intro.md"
      - "teachrepo quiz generate lessons/01-intro.md"
      - "teachrepo generate --quiz lessons/01-intro.md"
      - "teachrepo --ai-quiz lessons/01-intro.md"
    correct: 1
    explanation: "`teachrepo quiz generate <lesson-file>` sends the lesson content to the AI and appends suggested quiz questions to the YAML frontmatter."

  - question: "Course versioning in TeachRepo is handled by which underlying system?"
    type: multiple_choice
    options:
      - "A built-in version database"
      - "Semantic versioning in course.config.yaml only"
      - "Git — every course update is a commit"
      - "Manually tagging releases in the UI"
    correct: 2
    explanation: "TeachRepo is fully Git-native. Every course update is tracked as a Git commit. Students enrolled before a major version bump continue to see the version they purchased."
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
5. Payouts are handled automatically via Stripe Connect (coming soon)

## AI Quiz Generation

Don't want to write quiz questions manually? Let AI do it.

```bash
teachrepo quiz generate lessons/01-intro.md
```

This sends the lesson content to Claude Sonnet and appends suggested questions to the YAML frontmatter. You review and edit before publishing.

### From the Web Dashboard

Click **"✨ Generate Quiz"** on any lesson in the course editor. The AI will suggest 3-5 questions based on the lesson content.

## Course Versioning

Since courses are Git repos, versioning is built-in:

```bash
# Make changes to lessons
vim lessons/02-getting-started.md

# Commit the update
git add . && git commit -m "feat: add section on Docker setup"

# Push — TeachRepo auto-rebuilds the course site
git push origin main
```

### Semantic Versioning

Update the version in `course.config.yaml`:

```yaml
course:
  version: "1.1.0"
```

Students enrolled before a major version bump (e.g., `1.x → 2.0`) will see a notice and can optionally upgrade.

## Code Sandboxes (SaaS Tier)

Embed live, runnable code environments in your lessons:

```markdown
<!-- sandbox: https://codesandbox.io/s/your-sandbox-id -->
```

TeachRepo renders a gated sandbox iframe — only enrolled students can interact with it.
