#!/usr/bin/env python3
"""Seed demo courses, lessons, and quizzes into Supabase."""

import os
import sys
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supa = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

courses = [
    {
        "slug": "git-for-engineers",
        "title": "Git for Engineers",
        "description": "Master Git from first principles — branching, rebasing, internals, and team workflows.",
        "price_cents": 0,
        "currency": "usd",
        "pricing_model": "free",
        "published": True,
        "version": "v1",
    },
    {
        "slug": "github-actions-engineers",
        "title": "GitHub Actions for Engineers",
        "description": "Build, test, and deploy with GitHub Actions. CI/CD from scratch.",
        "price_cents": 0,
        "currency": "usd",
        "pricing_model": "free",
        "published": True,
        "version": "v1",
    },
    {
        "slug": "advanced-typescript",
        "title": "Advanced TypeScript Patterns",
        "description": "Master advanced TypeScript: generics, mapped types, template literals, and decorators. Level up your type game.",
        "price_cents": 2900,
        "currency": "usd",
        "pricing_model": "paid",
        "published": True,
        "version": "v1",
    },
]

lessons_by_course = {
    "git-for-engineers": [
        {
            "slug": "intro-to-git",
            "title": "Introduction to Git",
            "description": "What is Git and why should engineers care?",
            "order_index": 1,
            "is_preview": True,
            "has_quiz": True,
            "estimated_minutes": 10,
            "content_md": """# Introduction to Git

Git is a distributed version control system created by Linus Torvalds in 2005. It's the backbone of modern software development — every change you make, every bug you fix, every feature you ship is tracked by Git.

## Why Git?

- **Track every change** to your codebase with full history
- **Collaborate** without overwriting each other's work
- **Roll back mistakes** instantly to any previous state
- **Branch freely**, experiment safely, merge confidently
- **Understand your code's evolution** — who changed what and why

## Core concepts

- **Repository**: the database of all your project history (the `.git` folder)
- **Commit**: a snapshot of your files at a point in time, with a message and author
- **Branch**: a lightweight pointer to a commit
- **Working tree**: your current files on disk
- **Staging area (index)**: the set of changes queued for the next commit

## Your first repo

```bash
git init my-project
cd my-project
echo "# Hello" > README.md
git add README.md
git commit -m "Initial commit"
```

## The three areas

Every Git workflow involves three areas:

```
Working tree → (git add) → Staging area → (git commit) → Repository
```

Understanding this model removes 90% of Git confusion.

## Checking status

```bash
git status          # What's changed?
git diff            # What changed in working tree vs staging?
git diff --staged   # What changed in staging vs last commit?
git log --oneline   # See recent commits
```
""",
        },
        {
            "slug": "branching-strategies",
            "title": "Branching Strategies",
            "description": "Git Flow, trunk-based development, and when to use each.",
            "order_index": 2,
            "is_preview": True,
            "estimated_minutes": 15,
            "content_md": """# Branching Strategies

Branching is Git's superpower. The right strategy depends on your team size, release cadence, and deployment model.

## Git Flow

Long-lived branches: `main`, `develop`, feature branches, release branches, and hotfix branches.

**Best for:** versioned software with scheduled releases.

**Downside:** Complex. Many long-lived branches create merge conflicts.

## Trunk-Based Development

Everyone commits directly to `main`. Feature flags gate incomplete work in production.

```bash
# Short-lived branches only (< 1 day)
git checkout -b feat/add-tooltip
# ... make changes ...
git push origin feat/add-tooltip
# merge same day
```

**Best for:** continuous deployment, fast-moving teams, SaaS products.

## GitHub Flow

`main` is always deployable. Create a branch, open a PR, merge when CI passes.

```bash
git checkout -b feature/my-feature
git push origin feature/my-feature
# Open PR → review → merge → auto-deploy
```

**Best for:** most web applications, teams of 2–20 people.

## Choosing the right model

| Team size | Release cadence | Recommended |
|-----------|----------------|-------------|
| 1–5       | Continuous     | GitHub Flow |
| 5–20      | Continuous     | Trunk-Based |
| Any       | Scheduled      | Git Flow    |

## Naming conventions

```
feat/user-auth
fix/login-redirect
chore/update-deps
docs/api-reference
```
""",
        },
        {
            "slug": "rebasing-merging",
            "title": "Rebasing vs Merging",
            "description": "When to rebase, when to merge, and how to avoid footguns.",
            "order_index": 3,
            "is_preview": True,
            "estimated_minutes": 20,
            "content_md": """# Rebasing vs Merging

Both merge and rebase integrate changes — but they create very different histories.

## Merge

```bash
git checkout main
git merge feature/my-feature
```

Creates a merge commit. Preserves full history.

## Rebase

```bash
git checkout feature/my-feature
git rebase main
```

Replays your commits on top of the target branch. Creates a linear history.

**Use rebase when:** updating a local feature branch with latest main, or cleaning up messy local commits before a PR.

## The golden rule

> **Never rebase shared/public branches.**

Rebasing rewrites commit hashes. If others have pulled your branch, they'll have a diverged history.

## Interactive rebase

```bash
git rebase -i HEAD~3
```

Opens an editor where you can squash, reorder, drop, or edit commits. Invaluable for cleaning up "WIP" and "fix typo" commits before merging.
""",
        },
        {
            "slug": "git-internals",
            "title": "Git Internals",
            "description": "Blobs, trees, commits, and refs — how Git actually stores data.",
            "order_index": 4,
            "is_preview": True,
            "estimated_minutes": 25,
            "content_md": """# Git Internals

Git is a content-addressable filesystem with a version control system on top.

## Object types

- **blob**: raw file contents (no filename, no metadata)
- **tree**: a directory listing mapping names to blobs or other trees
- **commit**: a snapshot — points to a tree + parent commits + author + message
- **tag**: a named, signed pointer to another object

## Content-addressable storage

Every object is identified by its SHA-1 hash.

```bash
git cat-file -t HEAD          # commit
git cat-file -p HEAD          # show commit: tree hash, parent, author, message
git cat-file -p HEAD^{tree}   # show tree: mode, type, hash, filename
```

## Refs are just pointers

```bash
cat .git/HEAD                    # ref: refs/heads/main
cat .git/refs/heads/main         # abc123...
git rev-parse HEAD               # resolve to commit SHA
```

## The staging area (index)

The `.git/index` file is a binary snapshot of what will go into the next commit. When you `git add`, Git writes a blob and updates the index. When you `git commit`, Git creates a tree from the index, then a commit object.
""",
        },
        {
            "slug": "team-workflows",
            "title": "Team Workflows",
            "description": "Code review, PR etiquette, and keeping history clean in a team.",
            "order_index": 5,
            "is_preview": True,
            "estimated_minutes": 15,
            "content_md": """# Team Workflows

## Pull Request best practices

- **Keep PRs small** (< 400 lines). Large PRs get rubber-stamped.
- **Write a clear description**: what changed, why, and how to test it
- **Link to the issue** that motivated the change
- **Self-review first** — read your own diff before requesting review

## Keeping history clean

```bash
# Squash fixup commits before merging
git rebase -i origin/main

# Use conventional commits
git commit -m "feat: add rate limiting to login"
git commit -m "fix: handle empty email in signup"
```

## Conflict resolution

```bash
git fetch origin
git rebase origin/main
# fix conflicts
git rebase --continue
```
""",
        },
        {
            "slug": "advanced-git",
            "title": "Advanced Git",
            "description": "Interactive rebase, bisect, worktrees, and other power tools.",
            "order_index": 6,
            "is_preview": True,
            "estimated_minutes": 30,
            "content_md": """# Advanced Git

These tools separate casual Git users from power users.

## Interactive rebase

```bash
git rebase -i HEAD~5
```

You can: **pick**, **squash**, **fixup**, **reword**, **drop**, or **edit** commits.

## git bisect — binary search for bugs

```bash
git bisect start
git bisect bad HEAD          # current commit is broken
git bisect good v1.2.0       # this version was fine

# Git checks out a middle commit — test it, then:
git bisect good   # or: git bisect bad

# Repeat until Git identifies the culprit
git bisect reset
```

Bisect on a 1,000-commit range only needs ~10 steps.

## git worktree — multiple branches simultaneously

```bash
git worktree add ../hotfix hotfix/critical-bug
cd ../hotfix && git commit -am "fix: critical bug"
git worktree remove ../hotfix
```

**Use case**: you're mid-feature and a production bug arrives. No need to stash or switch branches.

## git reflog — your safety net

```bash
git reflog   # every HEAD change recorded for 90 days
```

Even after a "lost" rebase or reset, you can recover commits via reflog.

```bash
git reflog                          # find the SHA before the rebase
git reset --hard HEAD@{3}           # go back to it
```
""",
        },
    ],
    "github-actions-engineers": [
        {
            "slug": "intro-to-actions",
            "title": "Introduction to GitHub Actions",
            "description": "What are Actions and how do workflows run?",
            "order_index": 1,
            "is_preview": True,
            "estimated_minutes": 10,
            "content_md": """# Introduction to GitHub Actions

GitHub Actions is a CI/CD platform built into GitHub. Automate your build, test, and deployment pipelines directly from your repository.

## Key concepts

- **Workflow**: a YAML file in `.github/workflows/`
- **Event**: what triggers the workflow (push, PR, schedule)
- **Job**: a group of steps running on a runner
- **Step**: a single task — shell command or reusable Action
- **Runner**: a virtual machine that executes jobs

## Hello World

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
```

## Workflow triggers

```yaml
on:
  push:
    branches: [main, 'release/**']
  pull_request:
    types: [opened, synchronize]
  schedule:
    - cron: '0 9 * * 1'  # every Monday at 9am UTC
  workflow_dispatch:       # manual trigger button in UI
```
""",
        },
        {
            "slug": "ci-cd-pipeline",
            "title": "Building a CI/CD Pipeline",
            "description": "Test, build, and deploy on every push.",
            "order_index": 2,
            "is_preview": True,
            "sandbox_url": "https://stackblitz.com/github/actions/starter-workflows/tree/main/ci",
            "estimated_minutes": 20,
            "content_md": """# Building a CI/CD Pipeline

A proper CI/CD pipeline runs tests on every PR, builds the app, and deploys automatically when you merge to `main`.

## Full pipeline example

```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci && npm test -- --coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

## Matrix builds

Test across multiple Node versions simultaneously:

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node }}
```
""",
        },
        {
            "slug": "secrets-and-env",
            "title": "Secrets and Environment Variables",
            "description": "Securely pass API keys and config to your workflows.",
            "order_index": 3,
            "is_preview": True,
            "estimated_minutes": 15,
            "content_md": """# Secrets and Environment Variables

## Repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**.

```yaml
- run: curl -H "Authorization: Bearer ${{ secrets.API_KEY }}" https://api.example.com
```

Secrets are encrypted at rest and redacted from logs automatically.

## Environment variables

```yaml
env:
  NODE_ENV: production
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  APP_VERSION: ${{ github.sha }}
```

## Built-in context variables

```yaml
${{ github.sha }}           # full commit SHA
${{ github.ref }}           # refs/heads/main
${{ github.actor }}         # username that triggered the run
${{ github.run_number }}    # incrementing run number
```

## Security rules

- **Never `echo` a secret** directly
- **Use OIDC** for cloud providers (AWS, GCP, Azure) instead of long-lived keys
- **Rotate secrets** regularly

```yaml
# Modern: OIDC (no static keys needed)
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions
    aws-region: us-east-1
```
""",
        },
    ],
    "advanced-typescript": [
        {
            "slug": "generics-deep-dive",
            "title": "TypeScript Generics Deep Dive",
            "description": "Master generic types, constraints, and inference patterns.",
            "order_index": 1,
            "is_preview": True,
            "estimated_minutes": 15,
            "content_md": """# TypeScript Generics Deep Dive

Generics let you write code that works with multiple types while preserving full type safety.

## The problem generics solve

```typescript
// ❌ Loses type safety
function identity(x: any): any { return x; }

// ✅ Generic: one function, full type safety
function identity<T>(x: T): T { return x; }

const n = identity(42);    // T = number
const s = identity("hi");  // T = string
```

## Generic constraints

```typescript
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("abc", "de");        // ✅ strings have .length
longest([1, 2], [1, 2, 3]);  // ✅ arrays have .length
longest(1, 2);               // ❌ numbers don't have .length
```

## Generic interfaces

```typescript
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
}
```

## The `infer` keyword

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type Fn = () => Promise<string>;
type R = ReturnType<Fn>;  // Promise<string>
```
""",
        },
        {
            "slug": "mapped-conditional-types",
            "title": "Mapped Types and Conditional Types",
            "description": "Transform types programmatically with mapped and conditional types.",
            "order_index": 2,
            "is_preview": False,
            "estimated_minutes": 20,
            "content_md": """# Mapped Types and Conditional Types

## Mapped types

```typescript
type Partial<T> = { [K in keyof T]?: T[K]; };
type Readonly<T> = { readonly [K in keyof T]: T[K]; };
type Required<T> = { [K in keyof T]-?: T[K]; };
```

## Remapping keys

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

## Conditional types

```typescript
type IsString<T> = T extends string ? true : false;
type NonNullable<T> = T extends null | undefined ? never : T;
```

## Extracting types with `infer`

```typescript
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;
```
""",
        },
        {
            "slug": "template-literal-types",
            "title": "Template Literal Types",
            "description": "Build expressive string types with template literal type patterns.",
            "order_index": 3,
            "is_preview": False,
            "estimated_minutes": 15,
            "content_md": """# Template Literal Types

## Basic usage

```typescript
type Greeting = `Hello, ${string}!`;
type Direction = 'top' | 'right' | 'bottom' | 'left';
type Padding = `padding-${Direction}`;
// 'padding-top' | 'padding-right' | 'padding-bottom' | 'padding-left'
```

## Typed event emitters

```typescript
type EventMap = {
  'user:login': { userId: string };
  'cart:add': { productId: string; qty: number };
};

class TypedEmitter {
  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {}
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {}
}
```

## Parsing string patterns

```typescript
type ParseRoute<T extends string> =
  T extends `${infer Method} ${infer Path}`
    ? { method: Method; path: Path }
    : never;

type Route = ParseRoute<'GET /users/:id'>;
// { method: 'GET'; path: '/users/:id' }
```
""",
        },
        {
            "slug": "advanced-decorators",
            "title": "Advanced Decorators",
            "description": "TypeScript 5 decorators: class, method, field, and accessor decorators.",
            "order_index": 4,
            "is_preview": False,
            "estimated_minutes": 20,
            "content_md": """# Advanced Decorators

TypeScript 5.0 introduced the new ECMAScript Stage 3 decorators standard.

## Class decorators

```typescript
function Singleton<T extends { new(...args: any[]): {} }>(Base: T) {
  let instance: InstanceType<T>;
  return class extends Base {
    constructor(...args: any[]) {
      if (instance) return instance;
      super(...args);
      instance = this as InstanceType<T>;
    }
  };
}

@Singleton
class Database {
  connect() { /* ... */ }
}
```

## Method decorators

```typescript
function Log(target: any, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name);
  return function (this: any, ...args: any[]) {
    console.log(`[LOG] ${methodName}(${JSON.stringify(args)})`);
    const result = (target as Function).apply(this, args);
    console.log(`[LOG] ${methodName} => ${JSON.stringify(result)}`);
    return result;
  };
}

class MathService {
  @Log
  add(a: number, b: number) { return a + b; }
}
```

## Decorator factories

```typescript
function RateLimit(requestsPerSecond: number) {
  return function(target: any, context: ClassMethodDecoratorContext) {
    const queue: number[] = [];
    return async function(this: any, ...args: any[]) {
      const now = Date.now();
      queue.push(now);
      // filter to last second
      while (queue[0] < now - 1000) queue.shift();
      if (queue.length > requestsPerSecond) throw new Error('Rate limit exceeded');
      return (target as Function).apply(this, args);
    };
  };
}
```
""",
        },
    ],
}


def seed_quizzes(supa, course_id_map, lesson_id_map):
    git_course_id = course_id_map.get("git-for-engineers")
    intro_lesson_id = lesson_id_map.get("git-for-engineers:intro-to-git")

    if not git_course_id or not intro_lesson_id:
        print("Skipping quiz seed — course or lesson not found")
        return

    print("Seeding quiz for intro-to-git...")

    # Upsert quiz
    try:
        quiz_res = supa.table("quizzes").upsert(
            {
                "course_id": git_course_id,
                "lesson_id": intro_lesson_id,
                "title": "Git Fundamentals Quiz",
                "pass_threshold": 70,
            },
            on_conflict="course_id,lesson_id",
        ).execute()
        quiz_id = quiz_res.data[0]["id"]
        print(f"  Quiz upserted: {quiz_id}")
    except Exception as e:
        print(f"  Failed to upsert quiz: {e}")
        return

    questions = [
        {
            "quiz_id": quiz_id,
            "question": "What does `git init` do?",
            "question_type": "multiple_choice",
            "options": [
                "Creates a remote repository on GitHub",
                "Initializes a new local Git repository",
                "Clones an existing repository",
                "Deletes all commit history",
            ],
            "correct_index": 1,
            "correct_bool": None,
            "explanation": "`git init` creates a new empty Git repository in the current directory (the `.git` folder).",
            "order_index": 1,
        },
        {
            "quiz_id": quiz_id,
            "question": "Which Git object type stores raw file content?",
            "question_type": "multiple_choice",
            "options": ["commit", "tree", "blob", "ref"],
            "correct_index": 2,
            "correct_bool": None,
            "explanation": "A blob object stores raw file contents. Trees store directory structures, and commits point to a tree.",
            "order_index": 2,
        },
        {
            "quiz_id": quiz_id,
            "question": "What is the staging area in Git?",
            "question_type": "multiple_choice",
            "options": [
                "A remote server where code is stored",
                "The set of changes queued for the next commit",
                "A backup of your working tree",
                "The default branch name",
            ],
            "correct_index": 1,
            "correct_bool": None,
            "explanation": "The staging area (index) is where you prepare changes before committing. `git add` moves changes from the working tree to the staging area.",
            "order_index": 3,
        },
    ]

    try:
        supa.table("quiz_questions").upsert(
            questions, on_conflict="quiz_id,order_index"
        ).execute()
        print(f"  Upserted {len(questions)} quiz questions")
    except Exception as e:
        print(f"  Failed to upsert quiz questions: {e}")


def main():
    print(f"Seeding demo content to {SUPABASE_URL}")
    course_id_map = {}
    lesson_id_map = {}

    for course in courses:
        try:
            res = supa.table("courses").upsert(
                {**course, "creator_id": None}, on_conflict="slug"
            ).execute()
            course_id = res.data[0]["id"]
            course_id_map[course["slug"]] = course_id
            print(f"Upserted course: {course['slug']} ({course_id})")
        except Exception as e:
            print(f"Failed to upsert course {course['slug']}: {e}")
            continue

        for lesson in lessons_by_course.get(course["slug"], []):
            lesson_data = {
                "slug": lesson["slug"],
                "title": lesson["title"],
                "description": lesson["description"],
                "order_index": lesson["order_index"],
                "is_preview": lesson["is_preview"],
                "content_md": lesson["content_md"],
                "estimated_minutes": lesson["estimated_minutes"],
                "has_quiz": lesson.get("has_quiz", False),
                "sandbox_url": lesson.get("sandbox_url"),
                "course_id": course_id,
            }
            try:
                res = supa.table("lessons").upsert(
                    lesson_data, on_conflict="course_id,slug"
                ).execute()
                lesson_id = res.data[0]["id"]
                lesson_id_map[f"{course['slug']}:{lesson['slug']}"] = lesson_id
                print(f"  Upserted lesson: {lesson['slug']}")
            except Exception as e:
                print(f"  Failed lesson {lesson['slug']}: {e}")

    seed_quizzes(supa, course_id_map, lesson_id_map)
    print("Seed complete!")


if __name__ == "__main__":
    main()
