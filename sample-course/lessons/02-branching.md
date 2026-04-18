---
title: "Branching & Merging"
slug: branching-and-merging
order: 2
access: paid
description: "Create, switch, and merge branches like a pro."
estimated_minutes: 10
quiz_id: branching-quiz
---

# Branching & Merging

Branching lets you diverge from the main line of development and work independently.

## Creating a Branch

```bash
git checkout -b feature/my-feature    # create + switch
git branch feature/my-feature         # create only
git switch feature/my-feature         # modern syntax
```

## Merging Strategies

### Fast-forward merge
When the target branch has no new commits since the branch point:

```bash
git checkout main
git merge feature/my-feature   # advances pointer forward
```

### Three-way merge
Creates a merge commit when both branches have diverged:

```bash
git merge --no-ff feature/my-feature  # always creates merge commit
```

### Rebase (keep history linear)

```bash
git checkout feature/my-feature
git rebase main
```

> Warning: Never rebase commits that have been pushed to a shared branch.

## Resolving Conflicts

1. Open the conflicted file
2. Find `<<<<<<`, `=======`, `>>>>>>>` markers
3. Edit the file to the desired state
4. `git add <file>` then `git commit`
