/**
 * teachrepo init [repo-url-or-path]
 *
 * Scaffolds a new course in the current directory (or clones a GitHub repo
 * and adds TeachRepo course structure to it).
 *
 * If no source is given, creates a fresh course scaffold.
 * If a GitHub URL is given, the user is expected to have already cloned it —
 * we just add the course.yml and lessons/ structure.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const COURSE_YML_TEMPLATE = `# course.yml — TeachRepo Course Configuration
# Docs: https://teachrepo.com/docs/course-format

title: "My Course Title"
description: >
  A short description of your course. Keep it under 160 characters for SEO.
  What will students be able to do after taking this course?

# GitHub repo URL (used for versioning and auto-publish CI)
repo_url: ""

# ── Pricing ──────────────────────────────────────────────────────────────────
price_cents: 2900         # $29.00 — 0 = free
currency: "usd"           # ISO 4217, lowercase

# ── Affiliate / Referral ─────────────────────────────────────────────────────
affiliate_pct: 30         # % commission paid to referring affiliates

# ── Course Identity ───────────────────────────────────────────────────────────
slug: "my-course-slug"    # URL-friendly, kebab-case, unique on TeachRepo
version: "1.0.0"
language: "en"
author: ""
email: ""
tags: []

# ── Lesson Order ──────────────────────────────────────────────────────────────
# If omitted, sorted by NN- filename prefix.
# lessons_order:
#   - "lesson-1-slug"

# ── Quizzes ───────────────────────────────────────────────────────────────────
pass_threshold: 70        # Default minimum score % to pass any quiz

# ── Sandboxes ────────────────────────────────────────────────────────────────
sandboxes:
  enabled: true
  provider: "stackblitz"  # codesandbox | stackblitz | codepen

# ── Certificate of Completion ─────────────────────────────────────────────────
certificate:
  enabled: true
  template: "default"
`;

const LESSON_1_TEMPLATE = `---
title: "Introduction"
slug: "introduction"
order: 1
access: free
description: "Welcome to the course. Here's what you'll learn and why it matters."
estimated_minutes: 5
---

# Introduction

Write your lesson content here in Markdown.

## What You'll Learn

- Topic 1
- Topic 2
- Topic 3

## Prerequisites

- Basic familiarity with X
- Access to Y

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

const GITHUB_WORKFLOW = `name: Publish Course to TeachRepo

on:
  push:
    branches: [main]
    paths:
      - "lessons/**"
      - "quizzes/**"
      - "course.yml"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install TeachRepo CLI
        run: npm install -g @teachrepo/cli@latest

      - name: Validate course structure
        run: teachrepo validate

      - name: Publish to TeachRepo
        run: teachrepo push --api-url https://teachrepo.com
        env:
          TEACHREPO_API_KEY: \${{ secrets.TEACHREPO_API_KEY }}
`;

const GITIGNORE = `.DS_Store
.env
.env.local
node_modules/
*.log
`;

export async function initCommand(source?: string, opts?: { scaffold?: boolean }) {
  const cwd = process.cwd();
  const silent = false;

  const log = (msg: string) => console.log(msg);
  const warn = (msg: string) => console.warn(`⚠️  ${msg}`);

  log('');
  log('🎓 teachrepo init');
  log('─────────────────────────────────────────────────────────');

  // Detect if we're inside an existing course repo
  const hasCourseYml = fs.existsSync(path.join(cwd, 'course.yml'));
  if (hasCourseYml) {
    warn('course.yml already exists. Run `teachrepo validate` to check it.');
    return;
  }

  // Write course.yml
  fs.writeFileSync(path.join(cwd, 'course.yml'), COURSE_YML_TEMPLATE, 'utf-8');
  log('✅ Created course.yml');

  // Create lessons directory
  const lessonsDir = path.join(cwd, 'lessons');
  if (!fs.existsSync(lessonsDir)) fs.mkdirSync(lessonsDir, { recursive: true });
  fs.writeFileSync(path.join(lessonsDir, '01-introduction.md'), LESSON_1_TEMPLATE, 'utf-8');
  log('✅ Created lessons/01-introduction.md');

  // Create quizzes directory
  const quizzesDir = path.join(cwd, 'quizzes');
  if (!fs.existsSync(quizzesDir)) fs.mkdirSync(quizzesDir, { recursive: true });
  fs.writeFileSync(path.join(quizzesDir, 'introduction-quiz.yml'), QUIZ_TEMPLATE, 'utf-8');
  log('✅ Created quizzes/introduction-quiz.yml');

  // Create GitHub Actions workflow
  const workflowDir = path.join(cwd, '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(path.join(workflowDir, 'publish-course.yml'), GITHUB_WORKFLOW, 'utf-8');
  log('✅ Created .github/workflows/publish-course.yml');

  // Create .gitignore
  if (!fs.existsSync(path.join(cwd, '.gitignore'))) {
    fs.writeFileSync(path.join(cwd, '.gitignore'), GITIGNORE, 'utf-8');
    log('✅ Created .gitignore');
  }

  log('');
  log('🚀 Next steps:');
  log('   1. Edit course.yml — set your title, slug, price, and repo_url');
  log('   2. Add your lesson content to lessons/');
  log('   3. Run: teachrepo validate');
  log('   4. Link to TeachRepo: teachrepo link --api-url https://teachrepo.com');
  log('   5. Push your course: teachrepo push');
  log('');
  log('   Or deploy your own instance:');
  log('   https://vercel.com/new/clone?repository-url=https://github.com/ErlisK/openclaw-workspace');
  log('');
}
