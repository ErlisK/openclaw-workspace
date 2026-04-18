---
title: "Introduction to TeachRepo"
slug: "01-introduction"
description: "Welcome! Learn what TeachRepo is and how it can help you publish your first course."
order: 1
is_preview: true
estimated_minutes: 5

quiz:
  - question: "What is TeachRepo?"
    type: multiple_choice
    options:
      - "A payment processing service"
      - "A platform that converts GitHub repos into paywalled course sites"
      - "A code editor for writing documentation"
      - "A video hosting platform"
    correct: 1
    explanation: "TeachRepo converts GitHub repos (or Markdown folders) into paywalled, versioned mini-course sites — targeted at engineers who prefer code-first workflows."

  - question: "What file format does TeachRepo use to define quizzes?"
    type: multiple_choice
    options:
      - "JSON files in a /quizzes directory"
      - "A separate XML configuration file"
      - "YAML frontmatter inside each Markdown lesson"
      - "A database table you edit in a UI"
    correct: 2
    explanation: "Quiz questions are defined directly in YAML frontmatter at the top of each Markdown lesson file — no separate quiz files needed."

  - question: "TeachRepo requires OAuth authentication to import a public GitHub repository."
    type: true_false
    correct: false
    explanation: "For MVP, TeachRepo supports public GitHub repo import by URL only — no OAuth required. Just paste the repo URL."
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
- **Quiz** — optional questions defined in the frontmatter
- **Course config** — `course.config.yaml` at the repo root
- **Entitlement** — granted immediately after Stripe payment

## Next Steps

In the next lesson, you'll install the CLI and publish your first course in under 15 minutes.
