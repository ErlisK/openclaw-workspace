---
title: "Branches and Commits That Tell a Story"
slug: "branches-and-commits"
order: 2
access: free
description: "Branch naming conventions that scale, atomic commits that review well, and commit messages that your future self will actually thank you for."
estimated_minutes: 10
---

# Branches and Commits That Tell a Story

Code is read far more often than it's written. Branches and commit history are documentation. This lesson covers conventions that scale with a team.

## Branch Naming Conventions

A good branch name answers: *who is doing what, for what purpose?*

### Recommended pattern

```
{type}/{short-description}
```

| Type | When to use |
|------|-------------|
| `feat/` | New feature or enhancement |
| `fix/` | Bug fix |
| `chore/` | Dependency upgrades, repo maintenance |
| `docs/` | Documentation only |
| `refactor/` | Refactoring without changing behaviour |
| `test/` | Adding or updating tests |
| `hotfix/` | Emergency production fix (branched from main/release) |

### Examples

```bash
# Good
git checkout -b feat/affiliate-tracking
git checkout -b fix/stripe-webhook-timeout
git checkout -b docs/course-format-spec
git checkout -b chore/upgrade-next-14

# Bad
git checkout -b my-stuff
git checkout -b wip
git checkout -b johns-branch
```

### Optionally include a ticket/issue number

```bash
git checkout -b feat/GH-42-quiz-grading-engine
```

This links the PR title to the issue automatically on GitHub.

## The Anatomy of a Good Commit

```
<type>(<scope>): <imperative-mood subject>   ← max 72 chars

<body — the why, not the what>

<footer — breaking changes, co-authors, issue refs>
```

### Subject line rules

1. **Imperative mood** — "Add quiz grading engine", not "Added" or "Adding"
2. **No period at the end**
3. **Max 72 characters** — fits in `git log --oneline` without wrapping
4. **Type prefix** — same set as branch types: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

### Body — explain the *why*, not the *what*

The diff already shows what changed. The commit body should explain *why* you made the change and any trade-offs you considered.

```
fix(quiz): cap multiple_choice answer index at choices.length - 1

Without this guard, a quiz YAML with answer: 5 and only 3 choices
silently marked the question as incorrect. Now validateCourse() raises
AnswerOutOfBounds before any content reaches the database.

Fixes #87.
```

## Atomic Commits

An **atomic commit** does exactly one logical thing. If you need "and" in the message, it's probably two commits.

### Why it matters

- Easier to `git bisect` when hunting a regression
- Clean `git revert` if a specific change needs to be undone
- Reviewers can review commit-by-commit, not just file-by-file

### Interactive staging for precision

```bash
git add -p                # Stage individual hunks, not whole files
git add -p src/lib/       # Limit to a subdirectory
```

This lets you write one commit for the bug fix and a separate commit for the test, even if you wrote them in the same session.

## Amending and Fixup Commits

Made a typo in your last commit? Haven't pushed yet?

```bash
git commit --amend --no-edit   # Add staged changes to last commit, keep message
git commit --amend             # Add staged changes + edit message
```

Working on a feature branch and want to clean up before the PR?

```bash
# Mark a later commit as "belongs with" an earlier one
git commit --fixup=HEAD~3

# Then squash them automatically
git rebase -i --autosquash origin/main
```

## A Real-World Branch Lifecycle

```bash
# 1. Start from a fresh main
git checkout main && git pull

# 2. Create a focused branch
git checkout -b feat/quiz-pass-threshold

# 3. Work in atomic commits
git add -p
git commit -m "feat(quiz): add pass_threshold field to QuizFileSchema"

git add -p
git commit -m "test(quiz): add QuizFileSchema pass_threshold validation tests"

# 4. Rebase onto latest main before PR
git fetch origin
git rebase origin/main

# 5. Push and open PR
git push origin feat/quiz-pass-threshold
```

Clean history. Easy to review. Easy to bisect. Easy to revert.
