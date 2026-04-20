import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const courses = [
  {
    slug: 'git-for-engineers',
    title: 'Git for Engineers',
    description: 'Master Git from first principles — branching, rebasing, internals, and team workflows.',
    price_cents: 0,
    currency: 'usd',
    pricing_model: 'free',
    published: true,
  },
  {
    slug: 'github-actions-engineers',
    title: 'GitHub Actions for Engineers',
    description: 'Build, test, and deploy with GitHub Actions. CI/CD from scratch.',
    price_cents: 0,
    currency: 'usd',
    pricing_model: 'free',
    published: true,
  },
  {
    slug: 'advanced-typescript',
    title: 'Advanced TypeScript Patterns',
    description: 'Master advanced TypeScript: generics, mapped types, template literals, and decorators. Level up your type game.',
    price_cents: 2900,
    currency: 'usd',
    pricing_model: 'paid',
    published: true,
  },
];

type LessonSeed = {
  slug: string;
  title: string;
  description: string;
  order_index: number;
  is_preview: boolean;
  content_md: string;
  estimated_minutes: number;
  has_quiz?: boolean;
  sandbox_url?: string;
};

const lessonsByCourse: Record<string, LessonSeed[]> = {
  'git-for-engineers': [
    {
      slug: 'intro-to-git',
      title: 'Introduction to Git',
      description: 'What is Git and why should engineers care?',
      order_index: 1,
      is_preview: true,
      has_quiz: true,
      estimated_minutes: 10,
      content_md: `# Introduction to Git

Git is a distributed version control system created by Linus Torvalds in 2005. It's the backbone of modern software development — every change you make, every bug you fix, every feature you ship is tracked by Git.

## Why Git?

- **Track every change** to your codebase with full history
- **Collaborate** without overwriting each other's work
- **Roll back mistakes** instantly to any previous state
- **Branch freely**, experiment safely, merge confidently
- **Understand your code's evolution** — who changed what and why

## Core concepts

- **Repository**: the database of all your project history (the \`.git\` folder)
- **Commit**: a snapshot of your files at a point in time, with a message and author
- **Branch**: a lightweight pointer to a commit
- **Working tree**: your current files on disk
- **Staging area (index)**: the set of changes queued for the next commit

## Your first repo

\`\`\`bash
git init my-project
cd my-project
echo "# Hello" > README.md
git add README.md
git commit -m "Initial commit"
\`\`\`

## The three areas

Every Git workflow involves three areas:

\`\`\`
Working tree → (git add) → Staging area → (git commit) → Repository
\`\`\`

Understanding this model removes 90% of Git confusion. Your file on disk is not the same as what's staged, and what's staged is not the same as what's committed.

## Checking status

\`\`\`bash
git status          # What's changed?
git diff            # What changed in working tree vs staging?
git diff --staged   # What changed in staging vs last commit?
git log --oneline   # See recent commits
\`\`\`

Congratulations — you now understand the core mental model of Git!
`,
    },
    {
      slug: 'branching-strategies',
      title: 'Branching Strategies',
      description: 'Git Flow, trunk-based development, and when to use each.',
      order_index: 2,
      is_preview: true,
      estimated_minutes: 15,
      content_md: `# Branching Strategies

Branching is Git's superpower. The right strategy depends on your team size, release cadence, and deployment model. Here are the three most popular approaches.

## Git Flow

Long-lived branches: \`main\`, \`develop\`, feature branches, release branches, and hotfix branches.

\`\`\`
main ──────────────────────────────────── (production)
  └── develop ──────────────────────────  (integration)
        ├── feature/login ──┘
        ├── feature/signup ──────┘
        └── release/1.2 ─────────────┘
\`\`\`

**Best for:** versioned software with scheduled releases (mobile apps, libraries, packaged software).

**Downside:** Complex. Many long-lived branches create merge conflicts and slow down teams.

## Trunk-Based Development

Everyone commits directly to \`main\`. Feature flags gate incomplete work in production.

\`\`\`bash
# Short-lived branches only (< 1 day)
git checkout -b feat/add-tooltip
# ... make changes ...
git push origin feat/add-tooltip
# merge same day
\`\`\`

**Best for:** continuous deployment, fast-moving teams, SaaS products.

**Key practice:** use feature flags to ship incomplete features safely.

## GitHub Flow

\`main\` is always deployable. Create a branch, open a PR, merge when CI passes.

\`\`\`bash
git checkout -b feature/my-feature
git push origin feature/my-feature
# Open PR → review → merge → auto-deploy
\`\`\`

**Best for:** most web applications, teams of 2–20 people.

## Choosing the right model

| Team size | Release cadence | Recommended |
|-----------|----------------|-------------|
| 1–5       | Continuous     | GitHub Flow |
| 5–20      | Continuous     | Trunk-Based |
| Any       | Scheduled      | Git Flow    |

## Naming conventions

Keep branch names short and descriptive:

\`\`\`
feat/user-auth
fix/login-redirect
chore/update-deps
docs/api-reference
\`\`\`
`,
    },
    {
      slug: 'rebasing-merging',
      title: 'Rebasing vs Merging',
      description: 'When to rebase, when to merge, and how to avoid footguns.',
      order_index: 3,
      is_preview: true,
      estimated_minutes: 20,
      content_md: `# Rebasing vs Merging

Both merge and rebase integrate changes from one branch into another — but they create very different histories.

## Merge

\`\`\`bash
git checkout main
git merge feature/my-feature
\`\`\`

Creates a merge commit. Preserves full history including when branches diverged.

**Resulting history:**
\`\`\`
A -- B -- C -- M  (main, M = merge commit)
      \\       /
       D -- E     (feature branch)
\`\`\`

**Use merge when:**
- Merging a completed feature branch via PR
- You want to preserve the exact history of when work happened
- Working with external contributors

## Rebase

\`\`\`bash
git checkout feature/my-feature
git rebase main
\`\`\`

Replays your commits on top of the target branch. Creates a linear history.

**Resulting history:**
\`\`\`
A -- B -- C -- D' -- E'  (feature, commits replayed)
\`\`\`

**Use rebase when:**
- Updating a local feature branch with latest main
- Cleaning up messy local commits before a PR
- You want a linear, readable history

## The golden rule

> **Never rebase shared/public branches.**

Rebasing rewrites commit hashes. If others have pulled your branch, they'll have a diverged history that's painful to reconcile.

\`\`\`bash
# Safe: rebase local work
git rebase origin/main

# Dangerous: rebase a branch others have pulled
# git rebase main  ← DON'T do this after pushing
\`\`\`

## Interactive rebase: the power tool

\`\`\`bash
git rebase -i HEAD~3
\`\`\`

Opens an editor where you can squash, reorder, drop, or edit commits. Invaluable for cleaning up "WIP" and "fix typo" commits before merging.
`,
    },
    {
      slug: 'git-internals',
      title: 'Git Internals',
      description: 'Blobs, trees, commits, and refs — how Git actually stores data.',
      order_index: 4,
      is_preview: true,
      estimated_minutes: 25,
      content_md: `# Git Internals

Git is a content-addressable filesystem with a version control system on top. Understanding its internals makes you a dramatically better Git user.

## Object types

Everything in Git is stored as one of four object types:

- **blob**: raw file contents (no filename, no metadata)
- **tree**: a directory listing mapping names to blobs or other trees
- **commit**: a snapshot — points to a tree + parent commits + author + message
- **tag**: a named, signed pointer to another object (usually a commit)

## Content-addressable storage

Every object is identified by its SHA-1 hash. If two files have identical content, they share **one blob**.

\`\`\`bash
# Create a blob manually
echo "hello" | git hash-object -w --stdin
# Returns: ce013625030ba8dba906f756967f9e9ca394464a

# Inspect any object
git cat-file -t ce013625030ba8dba906f756967f9e9ca394464a  # blob
git cat-file -p ce013625030ba8dba906f756967f9e9ca394464a  # hello
\`\`\`

## Walking the object graph

\`\`\`bash
git cat-file -t HEAD          # commit
git cat-file -p HEAD          # show commit: tree hash, parent, author, message
git cat-file -p HEAD^{tree}   # show tree: mode, type, hash, filename for each entry
\`\`\`

## Refs are just pointers

Branches, tags, and HEAD are just files in \`.git/refs/\` containing a SHA-1 hash.

\`\`\`bash
cat .git/HEAD                    # ref: refs/heads/main
cat .git/refs/heads/main         # abc123...
git rev-parse HEAD               # resolve to commit SHA
\`\`\`

## The staging area (index)

The \`.git/index\` file is a binary snapshot of what will go into the next commit. When you \`git add\`, Git writes a blob and updates the index. When you \`git commit\`, Git creates a tree from the index, then a commit object.

Understanding this makes \`git diff\` (working tree vs index) and \`git diff --staged\` (index vs HEAD) much clearer.
`,
    },
    {
      slug: 'team-workflows',
      title: 'Team Workflows',
      description: 'Code review, PR etiquette, and keeping history clean in a team.',
      order_index: 5,
      is_preview: true,
      estimated_minutes: 15,
      content_md: `# Team Workflows

## Pull Request best practices

Good PRs get merged faster and produce better code:

- **Keep PRs small** (< 400 lines changed). Large PRs get rubber-stamped.
- **Write a clear description**: what changed, why, and how to test it
- **Link to the issue** or ticket that motivated the change
- **Self-review first** — read your own diff before requesting review
- **Add screenshots** for UI changes

\`\`\`markdown
## What
Add rate limiting to the /api/login endpoint.

## Why
Prevent brute-force attacks on user accounts.

## How to test
1. Run \`npm test\`
2. Try 10 rapid login attempts — 429 should fire on attempt 6+

Closes #142
\`\`\`

## Keeping history clean

\`\`\`bash
# Squash fixup commits before merging
git rebase -i origin/main

# Use conventional commits for automated changelogs
git commit -m "feat: add rate limiting to login"
git commit -m "fix: handle empty email in signup"
git commit -m "chore: update dependencies"

# Delete merged branches
git branch -d feature/my-feature
git push origin --delete feature/my-feature
\`\`\`

## Conflict resolution

\`\`\`bash
# Always rebase onto latest main before merging
git fetch origin
git rebase origin/main

# If conflicts arise:
# 1. Open conflicted files, resolve manually
# 2. git add <resolved-file>
# 3. git rebase --continue

# If it's too messy, abort and try again
git rebase --abort
\`\`\`

## Code review etiquette

- **As author**: respond to every comment, even if just acknowledging
- **As reviewer**: explain the *why* behind suggestions, not just "change this"
- Use conventional comment prefixes: \`nit:\` (optional), \`blocker:\`, \`question:\`
`,
    },
    {
      slug: 'advanced-git',
      title: 'Advanced Git',
      description: 'Interactive rebase, bisect, worktrees, and other power tools.',
      order_index: 6,
      is_preview: true,
      estimated_minutes: 30,
      content_md: `# Advanced Git

These tools separate casual Git users from power users. Each one has saved countless engineers hours of debugging.

## Interactive rebase

\`\`\`bash
git rebase -i HEAD~5
\`\`\`

Opens an editor listing your last 5 commits. You can:
- **pick** — keep the commit as-is
- **squash** — merge into the previous commit
- **fixup** — like squash, but discard this commit's message
- **reword** — change the commit message
- **drop** — remove the commit entirely
- **edit** — pause and amend the commit

**Example: clean up before a PR**
\`\`\`
pick a1b2c3 feat: add user auth
fixup d4e5f6 fix typo
fixup 789abc WIP
squash bcdef0 add tests
\`\`\`

## git bisect — binary search for bugs

Automatically finds which commit introduced a regression:

\`\`\`bash
git bisect start
git bisect bad HEAD          # current commit is broken
git bisect good v1.2.0       # this version was fine

# Git checks out a middle commit — you test it:
npm test
git bisect good              # or: git bisect bad

# Repeat until Git identifies the culprit
git bisect reset             # return to HEAD
\`\`\`

Bisect on a 1,000-commit range only needs ~10 steps.

## git worktree — multiple branches simultaneously

\`\`\`bash
# Check out a hotfix branch in a separate directory
git worktree add ../hotfix hotfix/critical-bug

# Work in ../hotfix without disturbing your current branch
cd ../hotfix && git commit -am "fix: critical bug"

# Clean up
cd ../main-project
git worktree remove ../hotfix
\`\`\`

**Use case**: you're mid-feature and a production bug arrives. No need to stash or switch branches.

## git stash — temporary shelving

\`\`\`bash
git stash                    # save current changes
git stash pop                # restore latest stash
git stash list               # see all stashes
git stash apply stash@{2}    # apply a specific stash
git stash drop stash@{0}     # delete a stash
\`\`\`

## git reflog — your safety net

\`\`\`bash
git reflog   # every HEAD change recorded for 90 days
\`\`\`

Even after a "lost" rebase or reset, you can recover commits via reflog. It's Git's undo history.

\`\`\`bash
# Oops, rebased away important commits
git reflog                          # find the SHA before the rebase
git reset --hard HEAD@{3}           # go back to it
\`\`\`
`,
    },
  ],
  'github-actions-engineers': [
    {
      slug: 'intro-to-actions',
      title: 'Introduction to GitHub Actions',
      description: 'What are Actions and how do workflows run?',
      order_index: 1,
      is_preview: true,
      estimated_minutes: 10,
      content_md: `# Introduction to GitHub Actions

GitHub Actions is a CI/CD platform built into GitHub. It lets you automate your build, test, and deployment pipelines directly from your repository — no external CI server required.

## Key concepts

- **Workflow**: a YAML file in \`.github/workflows/\` — defines what to run and when
- **Event**: what triggers the workflow (\`push\`, \`pull_request\`, \`schedule\`, \`workflow_dispatch\`)
- **Job**: a group of steps that run on the same runner machine
- **Step**: a single task — either a shell command or a reusable Action
- **Runner**: a virtual machine (GitHub-hosted or self-hosted) that executes jobs
- **Action**: a reusable unit of automation (e.g. \`actions/checkout@v4\`)

## Your first workflow

Create \`.github/workflows/ci.yml\`:

\`\`\`yaml
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
\`\`\`

Push this file and GitHub immediately runs the workflow on every push and PR.

## Reading workflow results

1. Go to your repo → **Actions** tab
2. Click on a workflow run to see all jobs
3. Click on a job to see each step's output
4. Green check = passed, red X = failed, yellow = in progress

## Workflow triggers

\`\`\`yaml
on:
  push:
    branches: [main, 'release/**']
  pull_request:
    types: [opened, synchronize]
  schedule:
    - cron: '0 9 * * 1'  # every Monday at 9am UTC
  workflow_dispatch:       # manual trigger button in UI
\`\`\`
`,
    },
    {
      slug: 'ci-cd-pipeline',
      title: 'Building a CI/CD Pipeline',
      description: 'Test, build, and deploy on every push.',
      order_index: 2,
      is_preview: true,
      sandbox_url: 'https://stackblitz.com/github/actions/starter-workflows/tree/main/ci',
      estimated_minutes: 20,
      content_md: `# Building a CI/CD Pipeline

A proper CI/CD pipeline runs tests on every PR, builds the app, and deploys automatically when you merge to \`main\`.

## Full pipeline example

\`\`\`yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:

jobs:
  # ── Test ──────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  # ── Build ─────────────────────────────────────
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  # ── Deploy (main only) ─────────────────────────
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - run: npx vercel --prod --token \${{ secrets.VERCEL_TOKEN }}
\`\`\`

## Key patterns

### Job dependencies with \`needs\`
\`\`\`yaml
deploy:
  needs: [test, build]  # both must pass first
\`\`\`

### Conditional jobs
\`\`\`yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
\`\`\`

### Passing artifacts between jobs
\`\`\`yaml
# Job 1: upload
- uses: actions/upload-artifact@v4
  with: { name: build, path: dist/ }

# Job 2: download
- uses: actions/download-artifact@v4
  with: { name: build, path: dist/ }
\`\`\`

### Caching dependencies
\`\`\`yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm   # caches node_modules by package-lock.json hash
\`\`\`

## Matrix builds

Test across multiple Node versions simultaneously:

\`\`\`yaml
strategy:
  matrix:
    node: [18, 20, 22]
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: \${{ matrix.node }}
\`\`\`
`,
    },
    {
      slug: 'secrets-and-env',
      title: 'Secrets and Environment Variables',
      description: 'Securely pass API keys and config to your workflows.',
      order_index: 3,
      is_preview: true,
      estimated_minutes: 15,
      content_md: `# Secrets and Environment Variables

Keeping credentials out of your code is non-negotiable. GitHub Actions provides several layers of secret management.

## Repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**.

\`\`\`yaml
- name: Deploy to production
  run: curl -H "Authorization: Bearer \${{ secrets.API_KEY }}" https://api.example.com/deploy
\`\`\`

Secrets are:
- **Encrypted at rest** by GitHub
- **Redacted from logs** automatically
- **Not accessible** to fork PRs (security feature)

## Environment secrets

For multi-environment setups (staging, production):

\`\`\`yaml
jobs:
  deploy:
    environment: production   # uses production secrets
    steps:
      - run: echo \${{ secrets.DATABASE_URL }}
\`\`\`

## Environment variables

\`\`\`yaml
env:
  NODE_ENV: production
  DATABASE_URL: \${{ secrets.DATABASE_URL }}
  APP_VERSION: \${{ github.sha }}

jobs:
  build:
    env:
      # Job-level env (overrides workflow-level)
      LOG_LEVEL: debug
    steps:
      - run: echo \$NODE_ENV
        env:
          # Step-level env (highest priority)
          NODE_ENV: test
\`\`\`

## Built-in context variables

\`\`\`yaml
\${{ github.sha }}           # full commit SHA
\${{ github.ref }}           # refs/heads/main
\${{ github.actor }}         # username that triggered the run
\${{ github.run_number }}    # incrementing run number
\${{ runner.os }}            # Linux, macOS, Windows
\`\`\`

## Security rules

- **Never \`echo\` a secret** — GitHub redacts known values, but it's bad practice
- **Use OIDC** for cloud providers (AWS, GCP, Azure) instead of long-lived keys
- **Rotate secrets** regularly; use short expiry tokens where possible
- **Limit secret scope** — repository secrets beat organization secrets for isolation

\`\`\`yaml
# Modern: OIDC (no static keys needed)
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions
    aws-region: us-east-1
\`\`\`
`,
    },
  ],
  'advanced-typescript': [
    {
      slug: 'generics-deep-dive',
      title: 'TypeScript Generics Deep Dive',
      description: 'Master generic types, constraints, and inference patterns.',
      order_index: 1,
      is_preview: true,
      estimated_minutes: 15,
      content_md: `# TypeScript Generics Deep Dive

Generics are TypeScript's most powerful feature. They let you write code that works with multiple types while preserving full type safety.

## The problem generics solve

Without generics, you either lose type safety (using \`any\`) or duplicate code:

\`\`\`typescript
// ❌ Loses type safety
function identity(x: any): any { return x; }

// ❌ Code duplication
function identityNumber(x: number): number { return x; }
function identityString(x: string): string { return x; }

// ✅ Generic: one function, full type safety
function identity<T>(x: T): T { return x; }

const n = identity(42);    // T = number, returns number
const s = identity("hi");  // T = string, returns string
\`\`\`

## Generic constraints

\`\`\`typescript
// Constrain T to objects with a .length property
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("abc", "de");        // ✅ strings have .length
longest([1, 2], [1, 2, 3]);  // ✅ arrays have .length
longest(1, 2);               // ❌ numbers don't have .length
\`\`\`

## Generic interfaces and classes

\`\`\`typescript
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

class UserRepository implements Repository<User> {
  async findById(id: string) { /* ... */ }
  // TypeScript enforces the full contract
}
\`\`\`

## Multiple type parameters

\`\`\`typescript
function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((item, i) => [item, b[i]]);
}

const pairs = zip([1, 2, 3], ['a', 'b', 'c']);
// Type: [number, string][]
\`\`\`

## Type inference in generics

TypeScript infers type parameters from usage — you rarely need to specify them explicitly:

\`\`\`typescript
const result = identity(42);    // TypeScript infers T = number
const arr = zip([1], ['x']);    // Infers A = number, B = string
\`\`\`

## The \`infer\` keyword (sneak peek)

\`\`\`typescript
// Extract the return type of any function
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type Fn = () => Promise<string>;
type R = ReturnType<Fn>;  // Promise<string>
\`\`\`

Generics are the foundation for everything else in advanced TypeScript. Master them and the rest becomes intuitive.
`,
    },
    {
      slug: 'mapped-conditional-types',
      title: 'Mapped Types and Conditional Types',
      description: 'Transform types programmatically with mapped and conditional types.',
      order_index: 2,
      is_preview: false,
      estimated_minutes: 20,
      content_md: `# Mapped Types and Conditional Types

These features let you transform existing types programmatically — the foundation of TypeScript's utility types.

## Mapped types

A mapped type iterates over the keys of another type:

\`\`\`typescript
// Make all properties optional
type Partial<T> = {
  [K in keyof T]?: T[K];
};

// Make all properties readonly
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Make all properties required (remove ?)
type Required<T> = {
  [K in keyof T]-?: T[K];
};
\`\`\`

## Remapping keys

\`\`\`typescript
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};

interface User { name: string; age: number; }
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number; }
\`\`\`

## Conditional types

\`\`\`typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false
\`\`\`

## Distributive conditional types

When applied to a union, conditional types distribute:

\`\`\`typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type Result = NonNullable<string | null | undefined>;
// string  (null and undefined become never, filtered out)
\`\`\`

## Extracting types with \`infer\`

\`\`\`typescript
// Unwrap a Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type A = Awaited<Promise<string>>;           // string
type B = Awaited<Promise<Promise<number>>>;  // number

// Extract function parameters
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

type Params = Parameters<(a: string, b: number) => void>;
// [string, number]
\`\`\`

## Combining mapped + conditional types

\`\`\`typescript
// Pick only the function-valued properties
type FunctionProperties<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

interface Service {
  name: string;
  start(): void;
  stop(): void;
  port: number;
}

type ServiceMethods = FunctionProperties<Service>;
// { start: () => void; stop: () => void; }
\`\`\`
`,
    },
    {
      slug: 'template-literal-types',
      title: 'Template Literal Types',
      description: 'Build expressive string types with template literal type patterns.',
      order_index: 3,
      is_preview: false,
      estimated_minutes: 15,
      content_md: `# Template Literal Types

Template literal types let you build new string types by combining existing ones — the same syntax as JavaScript template literals, but at the type level.

## Basic usage

\`\`\`typescript
type Greeting = \`Hello, \${string}!\`;

const a: Greeting = "Hello, world!";   // ✅
const b: Greeting = "Hi there";        // ❌
\`\`\`

## Combining with unions

\`\`\`typescript
type Direction = 'top' | 'right' | 'bottom' | 'left';
type Padding = \`padding-\${Direction}\`;
// 'padding-top' | 'padding-right' | 'padding-bottom' | 'padding-left'

type EventName = 'click' | 'focus' | 'blur';
type Handler = \`on\${Capitalize<EventName>}\`;
// 'onClick' | 'onFocus' | 'onBlur'
\`\`\`

## Real-world: typed event emitters

\`\`\`typescript
type EventMap = {
  'user:login': { userId: string };
  'user:logout': { userId: string };
  'cart:add': { productId: string; qty: number };
};

type EventKey = keyof EventMap;  // 'user:login' | 'user:logout' | 'cart:add'

class TypedEmitter {
  on<K extends EventKey>(event: K, handler: (data: EventMap[K]) => void): void {
    // ...
  }
  emit<K extends EventKey>(event: K, data: EventMap[K]): void {
    // ...
  }
}

const emitter = new TypedEmitter();
emitter.on('user:login', (data) => console.log(data.userId));  // ✅ fully typed
emitter.emit('cart:add', { productId: '123', qty: 2 });        // ✅
emitter.emit('user:login', { wrongKey: 'x' });                 // ❌ type error
\`\`\`

## Parsing string patterns

\`\`\`typescript
// Extract the method and path from a route string
type ParseRoute<T extends string> =
  T extends \`\${infer Method} \${infer Path}\`
    ? { method: Method; path: Path }
    : never;

type Route = ParseRoute<'GET /users/:id'>;
// { method: 'GET'; path: '/users/:id' }
\`\`\`

## Deep property access

\`\`\`typescript
type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends object
    ? Paths<T[K], \`\${Prefix}\${K}.\`>
    : \`\${Prefix}\${K}\`
}[keyof T & string];

type Config = { db: { host: string; port: number }; app: { name: string } };
type ConfigPaths = Paths<Config>;
// 'db.host' | 'db.port' | 'app.name'
\`\`\`
`,
    },
    {
      slug: 'advanced-decorators',
      title: 'Advanced Decorators',
      description: 'TypeScript 5 decorators: class, method, field, and accessor decorators.',
      order_index: 4,
      is_preview: false,
      estimated_minutes: 20,
      content_md: `# Advanced Decorators

TypeScript 5.0 introduced a new decorators standard (ECMAScript Stage 3). Decorators are functions that modify classes, methods, fields, or accessors at decoration time.

## Class decorators

\`\`\`typescript
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
  connected = false;
  connect() { this.connected = true; }
}

const a = new Database();
const b = new Database();
console.log(a === b);  // true — same instance
\`\`\`

## Method decorators

\`\`\`typescript
function Log(target: any, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name);
  return function (this: any, ...args: any[]) {
    console.log(\`[LOG] \${methodName}(\${JSON.stringify(args)})\`);
    const result = (target as Function).apply(this, args);
    console.log(\`[LOG] \${methodName} => \${JSON.stringify(result)}\`);
    return result;
  };
}

class MathService {
  @Log
  add(a: number, b: number) { return a + b; }
}

new MathService().add(2, 3);
// [LOG] add([2,3])
// [LOG] add => 5
\`\`\`

## Field decorators

\`\`\`typescript
function Validate(min: number, max: number) {
  return function(target: undefined, context: ClassFieldDecoratorContext) {
    return function(this: any, initialValue: number) {
      if (initialValue < min || initialValue > max) {
        throw new Error(\`Value must be between \${min} and \${max}\`);
      }
      return initialValue;
    };
  };
}

class Config {
  @Validate(1, 65535)
  port = 3000;  // ✅

  @Validate(1, 65535)
  badPort = 99999;  // ❌ throws at field initialization
}
\`\`\`

## Accessor decorators

\`\`\`typescript
function Memoize(_: any, context: ClassAccessorDecoratorContext) {
  const cache = new Map();
  return {
    get(this: any) {
      const key = context.name;
      if (!cache.has(key)) cache.set(key, context.get.call(this));
      return cache.get(key);
    },
  };
}
\`\`\`

## Decorator factories (parameterized decorators)

\`\`\`typescript
function RateLimit(requestsPerSecond: number) {
  return function(target: any, context: ClassMethodDecoratorContext) {
    const queue: number[] = [];
    return async function(this: any, ...args: any[]) {
      const now = Date.now();
      queue.push(now);
      const cutoff = now - 1000;
      while (queue[0] < cutoff) queue.shift();
      if (queue.length > requestsPerSecond) {
        throw new Error('Rate limit exceeded');
      }
      return (target as Function).apply(this, args);
    };
  };
}

class ApiClient {
  @RateLimit(10)
  async fetchUser(id: string) { /* ... */ }
}
\`\`\`
`,
    },
  ],
};

async function seedQuizzes(courseIdMap: Record<string, string>, lessonIdMap: Record<string, string>) {
  // Quiz for intro-to-git lesson
  const gitCourseId = courseIdMap['git-for-engineers'];
  const introLessonId = lessonIdMap['git-for-engineers:intro-to-git'];

  if (!gitCourseId || !introLessonId) {
    console.log('Skipping quiz seed — course or lesson not found');
    return;
  }

  console.log('Seeding quiz for intro-to-git...');

  const { data: quiz, error: quizError } = await supa
    .from('quizzes')
    .upsert(
      {
        course_id: gitCourseId,
        lesson_id: introLessonId,
        title: 'Git Fundamentals Quiz',
        pass_threshold: 70,
      },
      { onConflict: 'course_id,lesson_id' }
    )
    .select('id')
    .single();

  if (quizError || !quiz) {
    console.error('Failed to upsert quiz:', quizError?.message);
    return;
  }

  console.log(`  Quiz upserted: ${quiz.id}`);

  const questions = [
    {
      quiz_id: quiz.id,
      question: 'What does `git init` do?',
      question_type: 'multiple_choice' as const,
      options: [
        'Creates a remote repository on GitHub',
        'Initializes a new local Git repository',
        'Clones an existing repository',
        'Deletes all commit history',
      ],
      correct_index: 1,
      correct_bool: null,
      explanation: '`git init` creates a new empty Git repository in the current directory (the `.git` folder).',
      order_index: 1,
    },
    {
      quiz_id: quiz.id,
      question: 'Which Git object type stores raw file content?',
      question_type: 'multiple_choice' as const,
      options: ['commit', 'tree', 'blob', 'ref'],
      correct_index: 2,
      correct_bool: null,
      explanation:
        'A blob object stores raw file contents. Trees store directory structures (mapping names to blobs/trees), and commits point to a tree plus parent commits.',
      order_index: 2,
    },
    {
      quiz_id: quiz.id,
      question: 'What is the staging area (index) in Git?',
      question_type: 'multiple_choice' as const,
      options: [
        'A remote server where code is stored',
        'The set of changes queued for the next commit',
        'A backup of your working tree',
        'The default branch name',
      ],
      correct_index: 1,
      correct_bool: null,
      explanation:
        'The staging area (or index) is where you prepare changes before committing. `git add` moves changes from the working tree to the staging area.',
      order_index: 3,
    },
  ];

  const { error: qError } = await supa
    .from('quiz_questions')
    .upsert(questions, { onConflict: 'quiz_id,order_index' });

  if (qError) console.error('Failed to upsert quiz questions:', qError.message);
  else console.log(`  Upserted ${questions.length} quiz questions`);
}

async function main() {
  console.log('Seeding demo content to', SUPABASE_URL);

  const courseIdMap: Record<string, string> = {};
  const lessonIdMap: Record<string, string> = {};

  for (const course of courses) {
    // Upsert the course (update if exists)
    const { data: upserted, error: courseError } = await supa
      .from('courses')
      .upsert({ ...course, creator_id: null }, { onConflict: 'slug' })
      .select('id')
      .single();

    if (courseError || !upserted) {
      console.error(`Failed to upsert course ${course.slug}:`, courseError?.message);
      continue;
    }

    const courseId = upserted.id;
    courseIdMap[course.slug] = courseId;
    console.log(`Upserted course: ${course.slug} (${courseId})`);

    for (const lesson of lessonsByCourse[course.slug] ?? []) {
      const { data: lessonData, error: le } = await supa
        .from('lessons')
        .upsert(
          {
            slug: lesson.slug,
            title: lesson.title,
            description: lesson.description,
            order_index: lesson.order_index,
            is_preview: lesson.is_preview,
            content_md: lesson.content_md,
            estimated_minutes: lesson.estimated_minutes,
            has_quiz: lesson.has_quiz ?? false,
            sandbox_url: lesson.sandbox_url ?? null,
            course_id: courseId,
          },
          { onConflict: 'course_id,slug' }
        )
        .select('id')
        .single();

      if (le) {
        console.error(`  Failed lesson ${lesson.slug}:`, le.message);
      } else {
        lessonIdMap[`${course.slug}:${lesson.slug}`] = lessonData!.id;
        console.log(`  Upserted lesson: ${lesson.slug}`);
      }
    }
  }

  // Seed quizzes
  await seedQuizzes(courseIdMap, lessonIdMap);

  console.log('Seed complete!');
}

main().catch(console.error);
