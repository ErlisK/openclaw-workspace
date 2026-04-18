---
title: "Advanced Git: Bisect, Stash & Reflog"
slug: advanced-git
order: 3
access: paid
description: "Debugging with bisect, shelving work with stash, and recovering with reflog."
estimated_minutes: 15
---

# Advanced Git Techniques

## git bisect - Binary Search for Bugs

`git bisect` performs a binary search through your commit history to find which commit introduced a bug.

```bash
git bisect start
git bisect bad                    # current commit is broken
git bisect good v1.0.0            # last known good tag

# Git checks out a midpoint commit
# Test it, then:
git bisect good   # or git bisect bad

# When done:
git bisect reset
```

## git stash - Shelf Your Work

```bash
git stash push -m "WIP: half-done feature"
git stash list
git stash pop                  # restore most recent
git stash apply stash@{2}      # restore specific
```

## git reflog - Your Safety Net

Even after a `git reset --hard`, your commits are not lost:

```bash
git reflog                     # see every HEAD movement
git checkout HEAD@{3}          # go back to where you were
git branch recover-branch HEAD@{3}
```

Pro tip: The reflog is local only and expires after 90 days by default.
