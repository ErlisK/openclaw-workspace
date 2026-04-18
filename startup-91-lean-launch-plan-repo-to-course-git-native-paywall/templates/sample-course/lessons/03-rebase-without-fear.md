---
title: "Rebase Without Fear"
slug: "rebase-without-fear"
order: 3
access: paid
description: "Interactive rebase is the most powerful — and most feared — Git command. Learn exactly when to use it, when not to, and how to recover when things go wrong."
estimated_minutes: 15
quiz_id: "rebase-quiz"
---

# Rebase Without Fear

Rebase has a reputation for being dangerous. That reputation is mostly earned by people who use it without understanding it. After this lesson, rebase will be your best friend for keeping history clean.

## Rebase vs Merge: What's the Real Difference?

Both integrate changes from one branch into another. The difference is what the history looks like after.

### Merge

```
main:     A ── B ── C ──────────────── M  (merge commit)
                     \               /
feature:              D ── E ── F ──
```

Merge preserves the exact history of what happened and when. The merge commit `M` ties both branches together. This is honest — it shows the parallel work.

### Rebase

```
main:     A ── B ── C ── D' ── E' ── F'
                    ↑
feature:   [gone — commits rewritten onto main]
```

Rebase *replays* your commits on top of the target branch, rewriting their SHA hashes. The result is a linear history that reads like the feature was written after everything on main.

## The Golden Rule of Rebase

> **Never rebase commits that have been pushed to a shared branch.**

Rebasing rewrites commit SHAs. If others have fetched those commits, their history will diverge from yours and `git pull` will create a mess.

**Safe to rebase:**
- Local commits you haven't pushed
- Commits on your personal feature branch (only you are working on it)
- After coordinating with your team

**Don't rebase:**
- `main`, `develop`, or any branch with multiple contributors
- Anything already in a merged PR

## Interactive Rebase: Your History Editor

```bash
git rebase -i HEAD~4   # Edit the last 4 commits
git rebase -i origin/main  # Edit everything since you branched from main
```

Git opens your `$EDITOR` with a list like:

```
pick a1b2c3d feat: add quiz grading engine
pick e4f5a6b fix: wrong variable name
pick 7b8c9d0 wip checkpoint
pick 1e2f3a4 docs: add inline comments

# Commands:
# p, pick  = use commit
# r, reword = use commit, edit the message
# e, edit  = use commit, stop to amend
# s, squash = meld into previous commit
# f, fixup  = like squash, but discard this commit's log message
# d, drop  = remove commit
```

Change `pick` to one of the commands and save. Common patterns:

```
pick a1b2c3d feat: add quiz grading engine
fixup e4f5a6b fix: wrong variable name    ← squash typo fix into the feat
squash 7b8c9d0 wip checkpoint             ← squash WIP, keep the message for editing
drop 1e2f3a4 docs: add inline comments   ← throw it away
```

## Handling Conflicts During Rebase

When rebase hits a conflict, it pauses and asks you to resolve it:

```bash
# Git pauses and tells you which file(s) conflict.
# Open the file, resolve the conflict markers, then:

git add src/conflicted-file.ts  # Stage the resolution
git rebase --continue           # Continue replaying the remaining commits
```

Stuck? Want out?

```bash
git rebase --abort              # Abort completely — restore to pre-rebase state
```

The `--abort` escape hatch is why rebase isn't as scary as people think. If things go sideways, you always have a way out.

## Rebase onto a New Base

```bash
# Move feature branch to point at a different commit
git rebase --onto new-base old-base feature

# Example: rebase feature onto main, starting from after branch-point
git fetch origin
git rebase origin/main
```

## Golden Workflow: Feature Branch Lifecycle

```bash
# 1. Work on your feature
git checkout -b feat/stripe-webhook
# ... code, commit, code, commit ...

# 2. Clean up before opening a PR
git rebase -i origin/main      # squash WIPs, reword messages

# 3. Update to latest main
git fetch origin
git rebase origin/main         # replay your clean commits on latest main

# 4. Force-push your branch (safe — only you use this branch)
git push --force-with-lease origin feat/stripe-webhook

# 5. Open PR — reviewers see a clean, linear diff
```

`--force-with-lease` is safer than `--force`: it aborts if someone else has pushed to your branch since you last fetched.

## When to Use Merge Instead

Use merge when:
- You want to preserve the record of parallel work (good for long-lived release branches)
- You're merging a PR into `main` via GitHub (squash merge or merge commit both fine)
- You're on a shared branch with multiple contributors

Use rebase when:
- Cleaning up your local feature branch before a PR
- Keeping your branch up to date with `main` (instead of merge commits)
- You want to tell a clear, linear story in the project history
