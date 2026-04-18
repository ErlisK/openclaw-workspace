---
title: "Introduction to TeachRepo"
slug: "introduction"
order: 1
access: free
description: "Learn what TeachRepo is, why it exists, and how it fits into a Git-native workflow for engineers."
estimated_minutes: 5
quiz_id: "intro-quiz"
---

# Introduction to TeachRepo

Welcome to TeachRepo! In this lesson, we'll cover what TeachRepo is, why it exists, and how it fits into an engineer's workflow.

## What Problem Does TeachRepo Solve?

Engineers create incredible knowledge — internal wikis, OSS documentation, README files, design docs — but have no easy way to **monetize** that knowledge without:

1. Rebuilding a course site from scratch
2. Uploading videos to Teachable/Udemy and losing Git ergonomics
3. Using Gumroad with a hand-rolled static site generator

TeachRepo closes that gap. If you can write a README, you can publish a course.

## How It Works

```
Your GitHub Repo / Markdown folder
         ↓
  teachrepo publish
         ↓
  Hosted course site at teachrepo.com/your-course
         ↓
  Stripe Checkout for payment
         ↓
  Students get instant access
```

## Key Concepts

- **Lesson** — a Markdown file with YAML frontmatter
- **Quiz** — a separate `quizzes/quiz-id.yml` file referenced from a lesson
- **Course config** — `course.config.yaml` at the repo root
- **Entitlement** — granted immediately after Stripe payment

## Next Steps

In the next lesson, you'll install the CLI and publish your first course in under 15 minutes.
