/**
 * teachrepo init [source] [--name <title>] [--slug <slug>]
 *
 * Scaffolds a new course in the current directory with:
 *   course.yml, lessons/, quizzes/, .github/workflows/, .gitignore
 */

import fs from 'fs';
import path from 'path';

const COURSE_YML = (title: string, slug: string) => `# course.yml — TeachRepo Course Configuration
# Docs: https://teachrepo.com/docs/course-format

title: "${title}"
description: >
  A short description of your course. Keep it under 160 characters for SEO.

# GitHub repo URL (used for versioning and auto-publish CI)
repo_url: ""

# ── Pricing ──────────────────────────────────────────────────────────────────
price_cents: 2900         # $29.00 — 0 = free
currency: "usd"

# ── Affiliate / Referral ─────────────────────────────────────────────────────
affiliate_pct: 30         # % commission paid to referring affiliates

# ── Course Identity ───────────────────────────────────────────────────────────
slug: "${slug}"
version: "1.0.0"
language: "en"
author: ""
email: ""
tags: []

# ── Quizzes ───────────────────────────────────────────────────────────────────
pass_threshold: 70

# ── Sandboxes ────────────────────────────────────────────────────────────────
sandboxes:
  enabled: true
  provider: "stackblitz"
`;

const LESSON_1 = `---
title: "Introduction"
slug: "introduction"
order: 1
access: free
description: "Welcome to the course — here's what you'll learn."
estimated_minutes: 5
---

# Introduction

Write your lesson content here in Markdown.

## What You'll Learn

- Topic 1
- Topic 2
- Topic 3

## Prerequisites

None — this course is for everyone.

---

*Continue to the next lesson when you're ready.*
`;

const QUIZ_TEMPLATE = `id: "introduction-quiz"
title: "Introduction — Check Your Understanding"
pass_threshold: 70
ai_generated: false

questions:
  - type: multiple_choice
    prompt: "What is the main goal of this course?"
    choices:
      - "Answer A"
      - "Answer B"
      - "Answer C"
      - "Answer D"
    answer: 0
    points: 1
    explanation: "Explanation of why this is the correct answer."

  - type: true_false
    prompt: "A statement that is either true or false."
    answer: true
    points: 1
    explanation: "Explanation of the answer."
`;

const PUBLISH_WORKFLOW = `name: Publish Course to TeachRepo

on:
  push:
    branches: [main]
    paths:
      - "lessons/**"
      - "quizzes/**"
      - "course.yml"
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Validate
        run: npx @teachrepo/cli@latest validate
      - name: Push to TeachRepo
        run: npx @teachrepo/cli@latest push --api-url "\${{ vars.TEACHREPO_API_URL || 'https://teachrepo.com' }}"
        env:
          TEACHREPO_API_KEY: \${{ secrets.TEACHREPO_API_KEY }}
`;

const GITIGNORE = `.DS_Store
.env
.env.local
node_modules/
*.log
.coursekitrc
`;

export async function initCommand(
  _source: string | undefined,
  opts: { name?: string; slug?: string },
) {
  const cwd = process.cwd();

  if (fs.existsSync(path.join(cwd, 'course.yml'))) {
    console.error('❌ course.yml already exists. Run `teachrepo validate` to check it.');
    process.exit(1);
  }

  const title = opts.name || 'My Course Title';
  const slug = opts.slug || 'my-course-slug';

  // course.yml
  fs.writeFileSync(path.join(cwd, 'course.yml'), COURSE_YML(title, slug), 'utf-8');
  console.log('✅ Created course.yml');

  // lessons/
  const lessonsDir = path.join(cwd, 'lessons');
  fs.mkdirSync(lessonsDir, { recursive: true });
  fs.writeFileSync(path.join(lessonsDir, '01-introduction.md'), LESSON_1, 'utf-8');
  console.log('✅ Created lessons/01-introduction.md');

  // quizzes/
  const quizzesDir = path.join(cwd, 'quizzes');
  fs.mkdirSync(quizzesDir, { recursive: true });
  fs.writeFileSync(path.join(quizzesDir, 'introduction-quiz.yml'), QUIZ_TEMPLATE, 'utf-8');
  console.log('✅ Created quizzes/introduction-quiz.yml');

  // GitHub Actions workflow
  const workflowDir = path.join(cwd, '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(path.join(workflowDir, 'publish-course.yml'), PUBLISH_WORKFLOW, 'utf-8');
  console.log('✅ Created .github/workflows/publish-course.yml');

  // .gitignore
  if (!fs.existsSync(path.join(cwd, '.gitignore'))) {
    fs.writeFileSync(path.join(cwd, '.gitignore'), GITIGNORE, 'utf-8');
    console.log('✅ Created .gitignore');
  }

  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. Edit course.yml — set title, slug, price, repo_url');
  console.log('   2. Add lessons to lessons/');
  console.log('   3. teachrepo validate');
  console.log('   4. teachrepo link --api-url https://teachrepo.com');
  console.log('   5. teachrepo push');
  console.log('');
}
