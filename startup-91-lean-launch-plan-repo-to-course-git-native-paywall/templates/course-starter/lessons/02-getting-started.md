---
title: "Getting Started — Your First Course in 15 Minutes"
slug: "getting-started"
order: 2
access: free
description: "Install the TeachRepo CLI, configure your course, and publish it live in under 15 minutes."
estimated_minutes: 15
quiz_id: "getting-started-check"
sandbox_url: "https://stackblitz.com/edit/teachrepo-starter?embed=1"
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

## Step 5: Validate

```bash
teachrepo validate
# → Checks frontmatter, quiz references, slugs
```

## Step 6: Publish

```bash
teachrepo publish
# → Deploys to https://teachrepo.com/your-course
```

Your course is live! 🎉

## Step 7: Connect Stripe (5 minutes)

1. Go to your [TeachRepo Dashboard](https://teachrepo.com/dashboard)
2. Navigate to **Settings → Payments**
3. Connect your Stripe account
4. TeachRepo auto-creates a Stripe product and price for you

Students can now checkout. Entitlements are granted automatically via webhook.
