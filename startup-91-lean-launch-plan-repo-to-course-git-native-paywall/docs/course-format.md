# TeachRepo — Course Frontmatter & YAML Conventions

**Version:** 1.0  
**Last updated:** 2025-04

This document is the canonical reference for how course content is structured
on disk. It covers:

1. **Lesson Markdown files** (`lessons/*.md`) — frontmatter fields
2. **Quiz YAML files** (`quizzes/*.yml`) — question schema
3. **Course config** (`course.config.yaml`) — top-level course metadata

---

## 1. Lesson Files — `lessons/{NN}-{slug}.md`

Each lesson is a single Markdown file with YAML frontmatter at the top.

### File naming convention

```
lessons/
  01-introduction.md
  02-installation.md
  03-your-first-course.md
  04-advanced-quizzes.md
```

- Files are prefixed with a zero-padded two-digit order number (`01`, `02`, …)
- The slug in the filename should match the `slug` frontmatter field
- The CLI sorts files by filename prefix if `order` is omitted

### Frontmatter schema

```yaml
---
title: "Lesson Title"           # required  — display title
slug: "lesson-slug"             # required  — URL-safe identifier, kebab-case, unique in course
order: 1                        # required  — integer, 1-based, controls lesson sequence
access: free                    # required  — "free" | "paid"
                                #             free   → visible without enrollment (preview)
                                #             paid   → requires active enrollment (entitlement)
description: "Short summary"    # optional  — shown in lesson list and SEO meta
estimated_minutes: 10           # optional  — integer, estimated reading/exercise time
sandbox_url: "https://..."      # optional  — URL of an embeddable code sandbox
                                #             (CodeSandbox, StackBlitz, CodePen)
                                #             gated: only shown to enrolled students if access=paid
quiz_id: "intro-quiz"           # optional  — references quizzes/{quiz_id}.yml
                                #             if omitted, no quiz is attached to this lesson
---

Lesson body content in Markdown...
```

### Field details

#### `title` (required, string)
The display title shown in the lesson viewer and the course table of contents.

#### `slug` (required, string, kebab-case)
URL identifier for this lesson. Must be:
- Unique within the course
- Lowercase, alphanumeric, hyphens only (`^[a-z0-9][a-z0-9-]*[a-z0-9]$`)
- Stable — changing a slug breaks bookmarks and SEO

#### `order` (required, integer, ≥ 1)
Controls the sequence of lessons in the table of contents. No two lessons
in the same course should share the same `order` value.

#### `access` (required, enum)

| Value | Meaning | Who can read |
|-------|---------|--------------|
| `free` | Free preview | Anyone (no account required) |
| `paid` | Paid content | Enrolled students with active entitlement |

The access value maps directly to `lessons.is_preview` in the database:
- `free` → `is_preview = true`
- `paid` → `is_preview = false`

**Security note:** access gating is enforced server-side via Supabase RLS.
The `access` field in frontmatter is the *authoring declaration* — the actual
gate is the RLS policy on the `lessons` table.

#### `description` (optional, string)
One or two sentences describing what the student will learn. Used in:
- The lesson list sidebar
- `<meta name="description">` for SEO
- The AI quiz generation prompt context

#### `estimated_minutes` (optional, integer)
Estimated time to complete the lesson (reading + exercises). Displayed in the
lesson list as "~N min".

#### `sandbox_url` (optional, string, HTTPS URL)
URL to an embeddable code sandbox. Supported providers:

| Provider | URL pattern |
|----------|-------------|
| CodeSandbox | `https://codesandbox.io/embed/{id}` |
| StackBlitz | `https://stackblitz.com/edit/{id}?embed=1` |
| CodePen | `https://codepen.io/{user}/embed/{id}` |

If `access: paid`, the sandbox iframe is only rendered for enrolled students.
The URL is never sent to the browser for unenrolled visitors.

#### `quiz_id` (optional, string)
References a quiz file at `quizzes/{quiz_id}.yml`. The quiz is shown at the
end of the lesson content (before the "Next lesson" button).

Example: `quiz_id: "intro-quiz"` → loads `quizzes/intro-quiz.yml`

---

## 2. Quiz YAML Files — `quizzes/{quiz_id}.yml`

Each quiz is a standalone YAML file in the `quizzes/` directory.
Separating quizzes from lessons allows:
- Reusing a quiz across multiple lessons (advanced use case)
- AI-generating and reviewing quizzes independently of lesson content
- Cleaner git diffs when only quiz questions change

### File naming

```
quizzes/
  intro-quiz.yml
  installation-check.yml
  advanced-topics-final.yml
```

The filename (without `.yml`) must match the `quiz_id` referenced in
a lesson's frontmatter.

### Quiz YAML schema

```yaml
id: "intro-quiz"                # required  — must match filename (without .yml)
title: "Introduction Quiz"      # required  — display title shown above the quiz
pass_threshold: 70              # optional  — integer 0–100, minimum score % to pass
                                #             default: 70 (inherits from course config)
ai_generated: false             # optional  — boolean, true if AI generated this quiz

questions:                      # required  — array of question objects (min 1)

  - type: multiple_choice       # required  — see question types below
    prompt: "What does CI stand for?"
    choices:                    # required for multiple_choice (min 2 choices)
      - "Continuous Integration"
      - "Code Inspection"
      - "Compiled Interface"
      - "Container Image"
    answer: 0                   # required  — 0-based index of the correct choice
    points: 1                   # optional  — point weight, default 1
    explanation: "CI = Continuous Integration — automatically building and testing on each push."
                                # optional  — shown after the student answers

  - type: true_false
    prompt: "Git is a distributed version control system."
    answer: true                # required  — boolean
    points: 1
    explanation: "Git is fully distributed — every clone is a full repository."

  - type: short_answer
    prompt: "What command initializes a new git repository?"
    answer: "git init"          # required  — expected answer (case-insensitive match)
    points: 2
    explanation: "git init creates a new .git directory in the current folder."
```

### Question types

#### `multiple_choice`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `"multiple_choice"` | ✅ | |
| `prompt` | string | ✅ | The question text |
| `choices` | string[] | ✅ | Min 2, max 6 options |
| `answer` | integer | ✅ | 0-based index of the correct choice |
| `points` | integer | optional | Default: 1 |
| `explanation` | string | optional | Shown after answering |

#### `true_false`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `"true_false"` | ✅ | |
| `prompt` | string | ✅ | The statement to evaluate |
| `answer` | boolean | ✅ | `true` or `false` |
| `points` | integer | optional | Default: 1 |
| `explanation` | string | optional | |

#### `short_answer`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `"short_answer"` | ✅ | |
| `prompt` | string | ✅ | The question text |
| `answer` | string | ✅ | Expected answer (case-insensitive match at grading time) |
| `points` | integer | optional | Default: 1 |
| `explanation` | string | optional | |

### Scoring

Score = (sum of points for correct answers) / (sum of all points) × 100

Pass if score ≥ `pass_threshold` (default 70%).

---

## 3. Course Config — `course.config.yaml`

See `course.config.yaml` in the course template for the full spec.
Key fields relevant to lessons and quizzes:

```yaml
course:
  title: "..."
  slug: "..."
  version: "1.0.0"

pricing:
  model: "free" | "one_time" | "subscription"
  amount_cents: 2900

# Override default pass threshold for all quizzes in this course
pass_threshold: 70

# Lesson order — if omitted, CLI sorts by filename prefix
lessons_order:
  - "introduction"
  - "installation"
  - "your-first-course"
  - "advanced-quizzes"
```

---

## 4. Complete Course Directory Layout

```
my-course/
├── course.config.yaml          ← Course metadata, pricing, settings
│
├── lessons/
│   ├── 01-introduction.md      ← access: free (preview lesson)
│   ├── 02-installation.md      ← access: free (preview lesson)
│   ├── 03-your-first-course.md ← access: paid
│   └── 04-advanced-quizzes.md  ← access: paid
│
├── quizzes/
│   ├── intro-quiz.yml          ← Referenced by 01-introduction.md
│   ├── install-check.yml       ← Referenced by 02-installation.md
│   └── final-quiz.yml          ← Referenced by 04-advanced-quizzes.md
│
└── .github/
    └── workflows/
        └── publish-course.yml  ← Auto-publish on git push to main
```

---

## 5. CLI Validation Rules

Running `teachrepo validate` checks:

| Rule | Error |
|------|-------|
| Every lesson has `title`, `slug`, `order`, `access` | `MissingRequiredField` |
| `slug` matches `^[a-z0-9][a-z0-9-]*[a-z0-9]$` | `InvalidSlugFormat` |
| `access` is `free` or `paid` | `InvalidAccessValue` |
| `order` values are unique within the course | `DuplicateOrder` |
| `quiz_id` resolves to an existing `quizzes/{id}.yml` file | `MissingQuizFile` |
| Quiz `id` field matches the filename | `QuizIdMismatch` |
| `multiple_choice` has `answer` index within `choices` bounds | `AnswerOutOfBounds` |
| `true_false` has boolean `answer` | `InvalidTrueFalseAnswer` |
| Quiz has at least 1 question | `EmptyQuiz` |
| No two lessons share the same `slug` | `DuplicateSlug` |
| `sandbox_url` is a valid HTTPS URL (if present) | `InvalidSandboxUrl` |

---

## 6. Frontmatter Parsing Notes

- Frontmatter is parsed with [`gray-matter`](https://github.com/jonschlinkert/gray-matter)
- Unknown frontmatter fields are silently ignored (forward compatibility)
- The Zod schemas in `packages/core/src/schemas.ts` are the source of truth for validation
- All fields are camelCased in TypeScript after parsing (`estimated_minutes` → `estimatedMinutes`)
