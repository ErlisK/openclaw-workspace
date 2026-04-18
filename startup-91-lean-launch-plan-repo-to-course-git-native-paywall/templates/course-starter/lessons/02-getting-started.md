---
title: "Getting Started — Your First Course in 15 Minutes"
slug: "02-getting-started"
description: "Install the CLI, configure your course, and publish it live."
order: 2
is_preview: false
estimated_minutes: 15

quiz:
  - question: "Which command initializes a new TeachRepo course from an existing GitHub repo?"
    type: multiple_choice
    options:
      - "teachrepo create"
      - "teachrepo init <repo-url>"
      - "git clone && teachrepo setup"
      - "npm create teachrepo"
    correct: 1
    explanation: "`teachrepo init <repo-url>` clones the repo and scaffolds the course structure automatically."

  - question: "Where do you configure pricing for your course?"
    type: multiple_choice
    options:
      - "In the Stripe dashboard only"
      - "In each lesson's YAML frontmatter"
      - "In course.config.yaml"
      - "In the TeachRepo web dashboard"
    correct: 2
    explanation: "Pricing is configured in `course.config.yaml` at the repo root. You specify the model (one_time/subscription/free), amount in cents, and the Stripe price ID."

  - question: "After a student pays, how quickly do they get access to the course?"
    type: multiple_choice
    options:
      - "After manual approval by the creator"
      - "Within 24 hours"
      - "Immediately — entitlement is granted via Stripe webhook"
      - "After email verification"
    correct: 2
    explanation: "TeachRepo uses Stripe webhooks: when `checkout.session.completed` fires, the entitlement is granted instantly in the database."
---

# Getting Started

Let's publish your first course in under 15 minutes. No prior TeachRepo experience needed.

## Step 1: Install the CLI

```bash
npm install -g @teachrepo/cli

# Verify installation
teachrepo --version
```

## Step 2: Initialize Your Course

From an existing GitHub repo:

```bash
teachrepo init https://github.com/yourusername/your-repo
```

Or from a local folder of Markdown notes:

```bash
teachrepo init ./my-notes
```

This will:
- Create `course.config.yaml` with sensible defaults
- Add YAML frontmatter scaffolding to each Markdown file
- Validate the course structure

## Step 3: Configure Your Course

Open `course.config.yaml` and fill in:

```yaml
course:
  title: "Your Course Title"
  description: "What students will learn..."

pricing:
  model: "one_time"
  amount_cents: 2900  # $29
```

## Step 4: Preview Locally

```bash
teachrepo dev
# → Opens http://localhost:3000
```

## Step 5: Publish

```bash
teachrepo publish
# → Deploys to https://teachrepo.com/your-course
```

Your course is live! Share the URL and start earning. 🎉

## Step 6: Set Up Payments (5 minutes)

1. Go to your [TeachRepo Dashboard](https://teachrepo.com/dashboard)
2. Navigate to **Settings → Payments**
3. Connect your Stripe account (OAuth flow)
4. TeachRepo auto-creates a Stripe product and price for you

Students can now checkout. Entitlements are granted automatically.
