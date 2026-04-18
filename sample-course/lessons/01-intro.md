---
title: "Introduction to Git"
slug: intro-to-git
order: 1
access: free
description: "Why Git is the backbone of modern software development."
estimated_minutes: 5
quiz_id: intro-quiz
---

# Introduction to Git

Git is a **distributed version control system** created by Linus Torvalds in 2005 for managing the Linux kernel.

## Why Git?

- **Speed** — most operations are local
- **Data integrity** — everything is checksummed with SHA-1
- **Branching** — fast and cheap

## The Three States

Git tracks files in three states:

| State | Location | Description |
|---|---|---|
| Modified | Working directory | Changed but not staged |
| Staged | Index / staging area | Marked for next commit |
| Committed | Git directory | Stored in local database |

```bash
git status        # See what's going on
git add .         # Stage all changes
git commit -m "Your message"
```

> **Tip:** Every commit gets a unique SHA hash — this is how Git tracks history without a central server.
