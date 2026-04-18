---
title: "The Git Mental Model Every Engineer Needs"
slug: "git-mental-model"
order: 1
access: free
description: "Stop memorizing commands. Understand the three-tree model and you'll be able to reason through any Git situation without Stack Overflow."
estimated_minutes: 8
quiz_id: "git-mental-model-quiz"
---

# The Git Mental Model Every Engineer Needs

Most Git confusion comes from memorizing commands without understanding what they do. Let's fix that in 8 minutes.

## The Three Trees

Git tracks your project using three separate "trees" (internal data structures):

```
┌─────────────────┐    git add     ┌─────────────────┐   git commit  ┌─────────────────┐
│  Working Tree   │ ────────────▶  │   Index/Stage   │ ────────────▶ │  HEAD (Commit)  │
│  (your files)   │                │   (snapshot)    │               │  (history)      │
└─────────────────┘                └─────────────────┘               └─────────────────┘
```

| Tree | What it contains | How to inspect |
|------|-----------------|----------------|
| **Working Tree** | Files on disk, modified or not | `ls`, your editor |
| **Index (Stage)** | Snapshot queued for next commit | `git status`, `git diff --cached` |
| **HEAD** | Last committed snapshot | `git log`, `git show HEAD` |

## Why This Matters

Once you internalize these three trees, every Git command becomes a variation of:
> *"move data between these trees, and optionally rewrite history"*

### `git add`
Copies changes from Working Tree → Index. Nothing is written to history yet.

### `git commit`
Writes the Index → a new commit object, moves HEAD forward. Working Tree is untouched.

### `git reset` — the one that trips everyone up

```bash
git reset --soft HEAD~1   # Move HEAD back. Index + Working Tree unchanged.
git reset --mixed HEAD~1  # Move HEAD back. Index reset to HEAD. Working Tree unchanged.  ← default
git reset --hard HEAD~1   # Move HEAD back. Index reset. Working Tree reset. ⚠️ data loss
```

The flag controls *how far back* the reset ripples through the three trees.

### `git checkout` vs `git restore`

```bash
# Old syntax (still works):
git checkout -- file.txt         # Discard working tree changes (copy from Index)

# New, clearer syntax:
git restore file.txt             # Same — restore Working Tree from Index
git restore --staged file.txt    # Unstage — restore Index from HEAD
```

## The DAG

Git history is a **Directed Acyclic Graph** of commit objects. Each commit contains:
- A pointer to its parent commit(s)
- A tree snapshot (the full file state)
- Author, date, message metadata

```
A ← B ← C ← D  (main)
         ↑
         └── E ← F  (feature/my-thing)
```

Branches are just lightweight **named pointers** to commits. Creating a branch is free — it's just a 41-byte file in `.git/refs/heads/`.

## Mental Model Checkpoint

Before running any destructive command (`reset --hard`, `rebase`, `push --force`), ask yourself:

1. Which of the three trees will this affect?
2. Is HEAD moving? Which commits does it now point to?
3. Is anything getting orphaned (no more references)?

That's it. You now have the mental model 90% of engineers are missing.
