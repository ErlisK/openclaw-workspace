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
];

type LessonSeed = {
  slug: string; title: string; description: string;
  order_index: number; is_preview: boolean; content_md: string; estimated_minutes: number;
};

const lessonsByCourse: Record<string, LessonSeed[]> = {
  'git-for-engineers': [
    {
      slug: 'intro-to-git',
      title: 'Introduction to Git',
      description: 'What is Git and why should engineers care?',
      order_index: 1,
      is_preview: true,
      estimated_minutes: 10,
      content_md: `# Introduction to Git

Git is a distributed version control system created by Linus Torvalds in 2005.

## Why Git?

- Track every change to your codebase
- Collaborate without overwriting each other's work
- Roll back mistakes instantly
- Branch freely, merge confidently

## Core concepts

- **Repository**: the database of all your project history
- **Commit**: a snapshot of your files at a point in time
- **Branch**: a pointer to a commit
- **Working tree**: your current files on disk

## Your first repo

\`\`\`bash
git init my-project
cd my-project
echo "# Hello" > README.md
git add README.md
git commit -m "Initial commit"
\`\`\`

Congratulations — you just created your first Git repo!
`,
    },
    {
      slug: 'branching-strategies',
      title: 'Branching Strategies',
      description: 'Git Flow, trunk-based development, and when to use each.',
      order_index: 2,
      is_preview: false,
      estimated_minutes: 15,
      content_md: `# Branching Strategies

Branching is Git's superpower. Here's how to use it well.

## Git Flow

Long-lived branches: \`main\`, \`develop\`, feature, release, hotfix.

**Best for:** versioned software with scheduled releases.

## Trunk-Based Development

Everyone commits to \`main\`. Feature flags gate incomplete work.

**Best for:** continuous deployment, fast-moving teams.

## GitHub Flow

\`main\` is always deployable. Create a branch, open a PR, merge.

**Best for:** most web applications.
`,
    },
    {
      slug: 'rebasing-merging',
      title: 'Rebasing vs Merging',
      description: 'When to rebase, when to merge, and how to avoid footguns.',
      order_index: 3,
      is_preview: false,
      estimated_minutes: 20,
      content_md: `# Rebasing vs Merging

## Merge

\`\`\`bash
git checkout main
git merge feature/my-feature
\`\`\`

Creates a merge commit. Preserves full history.

## Rebase

\`\`\`bash
git checkout feature/my-feature
git rebase main
\`\`\`

Replays commits on top of target. Linear history.

## Golden rule

Never rebase public/shared branches. Only rebase local branches before pushing.
`,
    },
    {
      slug: 'git-internals',
      title: 'Git Internals',
      description: 'Blobs, trees, commits, and refs — how Git actually stores data.',
      order_index: 4,
      is_preview: false,
      estimated_minutes: 25,
      content_md: `# Git Internals

Git is a content-addressable filesystem with a VCS on top.

## Object types

- **blob**: file contents
- **tree**: directory listing (maps names to blobs/trees)
- **commit**: snapshot (points to a tree + parent commits + metadata)
- **tag**: named commit

## How commits work

\`\`\`bash
git cat-file -t HEAD     # commit
git cat-file -p HEAD     # see the commit object
git cat-file -p HEAD^{tree}  # see the tree
\`\`\`

Everything is hashed with SHA-1. If two files have the same content, they share one blob.
`,
    },
    {
      slug: 'team-workflows',
      title: 'Team Workflows',
      description: 'Code review, PR etiquette, and keeping history clean in a team.',
      order_index: 5,
      is_preview: false,
      estimated_minutes: 15,
      content_md: `# Team Workflows

## Pull Request best practices

- Small PRs (< 400 lines) get better reviews
- Write a clear description: what, why, how to test
- Link to the issue/ticket

## Keeping history clean

- Squash fixup commits: \`git rebase -i\`
- Use conventional commits: \`feat:\`, \`fix:\`, \`chore:\`
- Delete merged branches

## Conflict resolution

\`\`\`bash
git fetch origin
git rebase origin/main
# fix conflicts
git rebase --continue
\`\`\`
`,
    },
    {
      slug: 'advanced-git',
      title: 'Advanced Git',
      description: 'Interactive rebase, bisect, worktrees, and other power tools.',
      order_index: 6,
      is_preview: false,
      estimated_minutes: 30,
      content_md: `# Advanced Git

## Interactive rebase

\`\`\`bash
git rebase -i HEAD~5
\`\`\`

Squash, fixup, reorder, drop, or edit commits.

## git bisect

Binary-search for the commit that introduced a bug:

\`\`\`bash
git bisect start
git bisect bad HEAD
git bisect good v1.0
git bisect reset
\`\`\`

## git worktree

Check out multiple branches simultaneously:

\`\`\`bash
git worktree add ../hotfix hotfix/critical-bug
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

GitHub Actions is a CI/CD platform built into GitHub.

## Key concepts

- **Workflow**: a YAML file in \`.github/workflows/\`
- **Event**: what triggers the workflow (push, PR, schedule)
- **Job**: a group of steps running on a runner
- **Step**: a single task

## Hello World

\`\`\`yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Hello, Actions!"
\`\`\`
`,
    },
    {
      slug: 'ci-cd-pipeline',
      title: 'Building a CI/CD Pipeline',
      description: 'Test, build, and deploy on every push.',
      order_index: 2,
      is_preview: false,
      estimated_minutes: 20,
      content_md: `# Building a CI/CD Pipeline

\`\`\`yaml
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
      - run: npm ci && npm test
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel --prod --token \${{ secrets.VERCEL_TOKEN }}
\`\`\`
`,
    },
    {
      slug: 'secrets-and-env',
      title: 'Secrets and Environment Variables',
      description: 'Securely pass API keys and config to your workflows.',
      order_index: 3,
      is_preview: false,
      estimated_minutes: 15,
      content_md: `# Secrets and Environment Variables

## Repository secrets

Settings → Secrets and variables → Actions → New repository secret.

\`\`\`yaml
- run: curl -H "Authorization: Bearer \${{ secrets.API_KEY }}" https://api.example.com
\`\`\`

## Environment variables

\`\`\`yaml
env:
  NODE_ENV: production
  DATABASE_URL: \${{ secrets.DATABASE_URL }}
\`\`\`

Never \`echo\` a secret explicitly — GitHub redacts known values from logs.
`,
    },
  ],
};

async function main() {
  console.log('Seeding demo content to', SUPABASE_URL);
  for (const course of courses) {
    const { data: existing } = await supa.from('courses').select('id').eq('slug', course.slug).maybeSingle();
    let courseId: string;
    if (existing) {
      courseId = existing.id;
      console.log(`Course exists: ${course.slug} (${courseId})`);
    } else {
      const { data: inserted, error } = await supa
        .from('courses')
        .upsert({ ...course, creator_id: null }, { onConflict: 'slug' })
        .select('id')
        .single();
      if (error || !inserted) {
        console.error(`Failed to insert course ${course.slug}:`, error?.message);
        continue;
      }
      courseId = inserted.id;
      console.log(`Inserted course: ${course.slug} (${courseId})`);
    }
    for (const lesson of lessonsByCourse[course.slug] ?? []) {
      const { error: le } = await supa
        .from('lessons')
        .upsert({ ...lesson, course_id: courseId }, { onConflict: 'course_id,slug' });
      if (le) console.error(`  Failed lesson ${lesson.slug}:`, le.message);
      else console.log(`  Upserted lesson: ${lesson.slug}`);
    }
  }
  console.log('Seed complete!');
}

main().catch(console.error);
