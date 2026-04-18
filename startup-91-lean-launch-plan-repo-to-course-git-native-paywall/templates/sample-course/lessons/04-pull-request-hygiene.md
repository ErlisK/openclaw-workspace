---
title: "Pull Request Hygiene That Gets You Reviewed Faster"
slug: "pull-request-hygiene"
order: 4
access: paid
description: "Small, focused PRs. A description template that answers reviewers' questions before they ask. A checklist that catches 80% of review comments before they're made."
estimated_minutes: 12
---

# Pull Request Hygiene That Gets You Reviewed Faster

The best PR is one that gets reviewed the same day it's opened. Here's how to write PRs people actually want to review.

## The One Rule: Keep It Small

**One PR, one logical change.**

The correlation is empirical: PRs with fewer than 200 changed lines get reviewed the same day. PRs with 400+ lines sit for 3+ days. Beyond 800 lines, review quality degrades sharply.

**Why large PRs are slow:**
- Reviewers can't hold the full context in working memory
- "Risky-looking" PRs get avoided in favour of smaller, safer ones
- Context-switching cost increases with PR size
- More lines = more potential merge conflicts = more rebase work

**Breaking up a large PR:**

```
Original plan: "feat: add quiz system" (800 lines)

Instead:
1. feat(db): add quizzes and quiz_attempts tables (150 lines)
2. feat(core): add QuizFileSchema + validateCourse quiz checks (200 lines)
3. feat(api): POST /api/quiz-attempt route (180 lines)
4. feat(ui): QuizCard component (170 lines)
5. test(quiz): E2E quiz submission flow (100 lines)
```

Each PR is mergeable standalone. Stack them with stacked diffs if your tooling supports it.

## The PR Description Template

Don't make reviewers dig through the code to understand intent. Use a template:

```markdown
## What

Brief summary of what changed. 1–3 sentences.

## Why

Why is this change needed? Link to issue, spec, or customer request.
What problem does this solve?

## How

Describe the approach taken. Mention key trade-offs considered.
If you chose option A over option B, say why.

## Testing

- [ ] Unit tests added / updated
- [ ] E2E test added / updated (or explain why not)
- [ ] Tested manually: [describe steps]

## Screenshots / Output (if applicable)

Before / after screenshots, curl output, or terminal recording.

## Checklist

- [ ] No hardcoded secrets, credentials, or localhost URLs
- [ ] `teachrepo validate` passes (for course content changes)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Migrations are reversible (or destruction is intentional)
- [ ] Breaking changes documented in CHANGELOG.md
```

## Requesting Review Effectively

1. **Assign specific reviewers** — "anyone" is nobody. Pick 1–2 people who know the area.
2. **Tag in Slack** — GitHub notifications get lost. A quick `@alice can you review PR #42?` works.
3. **Add a "review notes"** comment on the first diff — explain what you want feedback on vs. what's rubber-stamp.
4. **Don't open the PR on Friday afternoon** — it will sit over the weekend.

## Responding to Review Comments

```markdown
# Bad response to a requested change:
[silent change without comment]

# Good response:
Done — changed X to Y as suggested.

# When you disagree:
I see where you're coming from, but I went with X because Y.
Happy to discuss in the thread or we can decide via a quick sync.

# When the comment is out of scope:
Agreed, but this is pre-existing tech debt. Filed GH-88 to track it.
```

Mark conversations as **resolved** only after the change is made (or explicitly agreed that no change is needed). Never resolve someone else's comment.

## The Merge Strategy

Align with your team on one strategy per repo:

| Strategy | History result | When to use |
|----------|---------------|-------------|
| **Squash and merge** | 1 commit per PR | Busy `main` branch, clean linear history |
| **Rebase and merge** | N clean commits per PR | When commits are already clean (see previous lesson) |
| **Merge commit** | Merge commit + full branch history | Long-lived feature branches, preserving context |

TeachRepo uses **squash and merge** on `main` — every PR is one commit. Feature branches use **rebase and merge** for clean commit sequences.

## Pre-PR Checklist (15-second self-review)

Before hitting "Create Pull Request":

```bash
# 1. Diff against main — check for debug code, TODOs, console.logs
git diff origin/main

# 2. Make sure tests pass
npm test

# 3. Check what you're about to push
git log origin/main..HEAD --oneline

# 4. Rebase onto latest main
git fetch && git rebase origin/main

# 5. Push
git push --force-with-lease origin feat/your-branch
```

15 seconds of self-review saves 15 minutes of back-and-forth.
