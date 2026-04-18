# Architecture: GitHub Importer, MDX Renderer, Marketplace

**Version:** 1.0 — 2025-04

---

## 1. System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                          Creator                               │
│  git push origin main  (course repo — public or private)       │
└──────────────────────────┬─────────────────────────────────────┘
                           │
             GitHub Webhook  OR  teachrepo publish CLI
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                  POST /api/import                               │
│                  GitHub Importer                               │
│                                                                │
│  1. Fetch course.yml via GitHub REST (unauthenticated)         │
│  2. List lessons/ directory via GitHub Trees API               │
│  3. Fetch each lesson .md file                                 │
│  4. Parse frontmatter (gray-matter + Zod)                      │
│  5. Fetch referenced quizzes/*.yml                             │
│  6. Upsert into Supabase:                                      │
│     courses → course_versions → lessons → quizzes             │
└──────────────────────────┬─────────────────────────────────────┘
                           │ Supabase (PostgreSQL + RLS)
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│               Student — Lesson Viewer                          │
│                                                                │
│  /courses/[slug]/lessons/[lessonSlug]                          │
│                                                                │
│  1. Server Component: fetch lesson from Supabase               │
│     – check entitlement (enrolled OR is_preview)               │
│  2. compile MDX server-side (next-mdx-remote)                  │
│  3. Render with custom components:                             │
│     <Quiz quizId="..." lessonId="..." />                       │
│     <SandboxEmbed url="..." access="paid" enrolled={bool} />   │
│     <Callout />, <CodeBlock />, <LessonNav />                  │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│               Marketplace  /marketplace                        │
│                                                                │
│  Server Component: SELECT courses WHERE published=true         │
│  Course cards: title, author, price, preview lesson count      │
│  Filter: tags, price range, sort (newest/popular/price)        │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. GitHub Importer

### Fetch Strategy — Unauthenticated GitHub REST

GitHub's REST API allows 60 requests/hour unauthenticated per IP. For the hosted SaaS tier, we use authenticated requests with `Authorization: token GITHUB_TOKEN` (optional, server-side only) to raise the limit to 5,000/hr.

MVP: unauthenticated, public repos only. Self-hosted: creators can provide a PAT.

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /repos/{owner}/{repo}/contents/{path}` | Fetch single file content (base64) |
| `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` | List all files in a commit tree |
| `GET /repos/{owner}/{repo}/branches/{branch}` | Resolve branch HEAD SHA |

### Import Flow (POST /api/import)

```
Input: { repo_url, branch? = "main" }

1. Parse repo_url → { owner, repo }
2. GET /repos/{owner}/{repo}/branches/{branch}
   → sha (current HEAD)

3. GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1
   → file tree (all paths + blob SHAs)

4. Find course.yml (or course.config.yaml) in tree
   → fetch + parse → CourseYmlSchema or CourseConfigSchema

5. Filter tree for lessons/*.md files
   → fetch each + parse frontmatter (gray-matter + Zod)

6. For each lesson with quiz_id:
   → fetch quizzes/{quiz_id}.yml + parse QuizFileSchema

7. Upsert into Supabase:
   a. creators row (from auth session)
   b. courses row (upsert by slug + creator_id)
   c. course_versions row (new version entry)
   d. lessons rows (upsert by course_id + slug)
   e. quizzes rows (upsert by course_id + id)
   f. quiz_questions rows (replace all for each quiz)

8. If course.yml has price_cents > 0 and no stripe_price_id yet:
   → create Stripe product + price (server-side)
   → update courses row with stripe_price_id

9. Return import summary (counts, errors)
```

### Rate Limiting & Error Handling

- **429 from GitHub** → retry with exponential backoff (3 attempts, max 8s)
- **404 on lessons/** → skip, report as warning (not all repos use lessons/ dir)
- **Frontmatter validation errors** → skip lesson, add to import.errors[]
- **Quiz YAML errors** → skip quiz, lesson imports without quiz
- Import result stored in `repo_imports` table for creator visibility

---

## 3. MDX Lesson Renderer

### Technology

- `next-mdx-remote/rsc` — server-side MDX compilation in App Router
- Custom components injected via `<MDXRemote components={...} />`
- Lesson body stored as raw Markdown in Supabase `lessons.body_md`
- MDX compilation happens at request time (not build time) — enables live content updates

### Custom MDX Components

#### `<Quiz>`

```tsx
// Usage in lesson Markdown:
// <Quiz id="rebase-quiz" />

// Props derived from context (not passed in MDX — lesson page passes them):
// – quizId: string (from lesson.quiz_id frontmatter)
// – lessonId: string
// – courseId: string
// – enrolled: boolean (from server-side entitlement check)
```

Client Component — interactive multi-step quiz with:
- Question display (multiple_choice / true_false / short_answer)
- Answer selection + immediate feedback
- Score calculation + pass/fail display
- Attempt submission to `POST /api/quiz-attempt`

#### `<SandboxEmbed>`

```tsx
// Usage in lesson Markdown:
// <SandboxEmbed url="https://stackblitz.com/edit/xyz?embed=1" />

// Server-side: if lesson.access === 'paid' AND NOT enrolled:
//   → render a blurred placeholder with "Enroll to access the live editor"
//   → never send the url to the browser
// If enrolled:
//   → render <iframe src={url} ... />
```

#### `<Callout>`

```tsx
// Usage: <Callout type="warning">Never force-push to main.</Callout>
// Types: info | warning | danger | tip
```

#### `<CodeBlock>`

Standard code block with syntax highlighting (Shiki) + copy button. Applied automatically to all fenced code blocks.

### Lesson Page Route

```
/courses/[slug]/lessons/[lessonSlug]
```

Server Component flow:
1. Fetch course by `slug` from Supabase
2. Fetch lesson by `lessonSlug` + `courseId`
3. Server-side entitlement check:
   - If `lesson.is_preview = true` → render for everyone
   - If `lesson.is_preview = false` → check `enrollments` row; if none → redirect to `/courses/[slug]` with paywall CTA
4. Compile MDX: `compileMDX(lesson.body_md, { components })`
5. Render: `<LessonLayout>`, `<TableOfContents>`, `<LessonNav>`, compiled content

### Security: Sandbox URL Never Sent to Unenrolled Browsers

The `sandbox_url` is stored server-side only. The `SandboxEmbed` component receives:
- `enrolled: boolean` — computed server-side from Supabase entitlement check
- `url: string` — only populated if enrolled (otherwise empty string)

The client bundle never receives the `url` for unenrolled visitors.

---

## 4. Marketplace

### Route: `/marketplace`

Server Component — no auth required.

```sql
SELECT
  c.id, c.slug, c.title, c.description,
  c.price_cents, c.currency,
  cr.handle as author_handle,
  COUNT(DISTINCT l.id) FILTER (WHERE l.is_preview = true) as free_lesson_count,
  COUNT(DISTINCT l.id) as total_lesson_count,
  COUNT(DISTINCT e.id) as enrollment_count,
  c.published_at
FROM courses c
JOIN creators cr ON cr.id = c.creator_id
LEFT JOIN lessons l ON l.course_id = c.id
LEFT JOIN enrollments e ON e.course_id = c.id
WHERE c.published = true
GROUP BY c.id, cr.handle
ORDER BY c.published_at DESC
```

### Course Card

```
┌──────────────────────────────────────┐
│  [course thumbnail / gradient]       │
│  Ship It: Git Workflow for Engineers │
│  by @erlisk                          │
│                                      │
│  ★★★★☆  (127 students)              │
│  5 lessons  ·  2 free previews       │
│                                      │
│  $29            [Preview →]          │
└──────────────────────────────────────┘
```

### Filters (URL search params)

- `?tags=git,devops` — tag filter
- `?price=free` / `?price=paid` — price filter
- `?sort=newest` (default) / `?sort=popular` / `?sort=price_asc`

---

## 5. Data Flow Diagram

```
GitHub Repo (public)
      │
      │  GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1
      │  GET /repos/{owner}/{repo}/contents/{path}   (per file)
      │
      ▼
packages/importer
  parseFrontmatter()    → LessonFrontmatterSchema
  parseCourseYml()      → CourseYmlSchema
  parseQuizYml()        → QuizFileSchema
      │
      ▼
POST /api/import (Route Handler — service role client)
  upsert courses
  upsert course_versions
  upsert lessons (body_md stored verbatim)
  upsert quizzes + quiz_questions
  create Stripe product/price (if price_cents > 0)
      │
      ▼
Supabase PostgreSQL
  courses, lessons, quizzes, quiz_questions
  (RLS: creators own their content; students read published content)
      │
      ▼
GET /courses/[slug]/lessons/[lessonSlug] (Server Component)
  fetch lesson.body_md
  compileMDX(body_md, { Quiz, SandboxEmbed, Callout, CodeBlock })
  check entitlement → enrolled?
  render MDX with correct enrolled prop
      │
      ▼
Browser (Client Components: Quiz, SandboxEmbed)
  Quiz: interactive question UI → POST /api/quiz-attempt
  SandboxEmbed: iframe (if enrolled) or paywall CTA
```
