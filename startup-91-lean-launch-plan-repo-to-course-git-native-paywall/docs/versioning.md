# Course Versioning Design

**Version:** 1.0 — 2025-04

---

## 1. Overview

Every TeachRepo course is backed by a Git repository. Versioning in TeachRepo maps directly to Git concepts: branches and tags. Each import run captures the HEAD commit SHA of the selected ref and stores it as a `course_versions` row.

### Goals

| Goal | Decision |
|------|----------|
| **Reproducibility** | Every published version is pinned to a SHA — re-fetching the same SHA always produces identical content |
| **MVP simplicity** | Default branch only (no ref picker in UI) — creator imports from `main` or `master` |
| **Upgrade path** | Branch/tag picker built into import API from day 1; UI exposes it in v1.1 |
| **Audit trail** | Every import creates a `course_versions` row, never overwrites existing rows |
| **Enrolled student continuity** | Students always see the version that was current when they enrolled; creators choose when to "promote" a new version to all students |

---

## 2. Data Model

### `course_versions` table (already applied to Supabase)

```sql
CREATE TABLE course_versions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Git identity
  commit_sha      text NOT NULL,          -- Full 40-char SHA from GitHub API
  branch          text NOT NULL,          -- e.g. "main", "develop"
  tag             text,                   -- e.g. "v1.2.0" — null for branch imports
  version_label   text NOT NULL,          -- Display label: SemVer from course.yml or "sha:abc1234"

  -- Content snapshot
  lesson_count    int  NOT NULL DEFAULT 0,
  quiz_count      int  NOT NULL DEFAULT 0,

  -- Status
  is_current      boolean NOT NULL DEFAULT false,   -- Which version students see now
  published_at    timestamptz,                        -- When promoted to current

  -- Import metadata
  imported_at     timestamptz NOT NULL DEFAULT now(),
  imported_by     uuid REFERENCES auth.users(id),

  -- Soft constraints
  UNIQUE (course_id, commit_sha)           -- same SHA can't be imported twice
);
```

### `courses` table — relevant fields

```sql
courses.default_branch  text DEFAULT 'main'    -- auto-detected on first import
courses.version         text                   -- SemVer from course.yml (display only)
```

---

## 3. Version Label Rules

The `version_label` is what's shown in the creator dashboard and on public course pages.

| Condition | `version_label` |
|-----------|----------------|
| `course.yml` has `version: "1.2.0"` | `"1.2.0"` |
| Import triggered from a Git tag (e.g. `v2.0.0`) | `"v2.0.0"` (tag name) |
| No SemVer in course.yml, branch import | `"sha:abc1234"` (first 7 chars of SHA) |
| Auto-generate from import number | `"import-#N"` (fallback) |

Priority: **tag name > course.yml version > short SHA**

---

## 4. Ref Resolution — MVP vs. v1.1

### MVP — Default Branch Only

```
POST /api/import
Body: { repo_url }   ← no branch/tag in request

1. Fetch default_branch via GET /repos/{owner}/{repo}
   → repo.default_branch (usually "main" or "master")
2. Resolve HEAD SHA for default_branch
3. Import from that SHA
4. Store: { branch: default_branch, tag: null, commit_sha: headSha }
```

The `branch` parameter defaults to `"main"` but the import also checks `repo.default_branch` and uses that if different.

### v1.1 — Branch/Tag Picker

```
GET /api/repos/refs?repo_url=https://github.com/owner/repo
→ { defaultBranch, branches: [...], tags: [...] }

POST /api/import
Body: { repo_url, ref: "v2.0.0", ref_type: "tag" }

1. If ref_type === "tag":
   → GET /repos/{owner}/{repo}/git/ref/tags/{tag}
   → resolve to commit SHA
   → store: { tag: "v2.0.0", branch: null, commit_sha: sha }

2. If ref_type === "branch":
   → GET /repos/{owner}/{repo}/branches/{branch}
   → resolve HEAD SHA
   → store: { branch: "feature/v2", tag: null, commit_sha: sha }
```

---

## 5. Import Flow — Version Creation

On every `POST /api/import`:

```
1. resolveRef(owner, repo, ref, refType)
   → headSha (full 40-char SHA)
   → refLabel (branch name or tag name)

2. Check course_versions for existing row with commit_sha = headSha
   → if found AND is_current: return { alreadyCurrent: true }
   → if found AND NOT is_current: allow re-promotion (skip re-fetch)
   → if not found: continue with full import

3. Parse course.yml → versionLabel (SemVer) || tag || `sha:${headSha.slice(0,7)}`

4. Full content import (lessons, quizzes — as before)

5. INSERT course_versions:
   {
     course_id,
     commit_sha: headSha,
     branch:     refType === 'branch' ? ref : defaultBranch,
     tag:        refType === 'tag'    ? ref : null,
     version_label: versionLabel,
     lesson_count:  lessons.length,
     quiz_count:    quizzes.length,
     is_current:    true,            ← promote immediately (MVP)
     published_at:  now(),
     imported_by:   user.id,
   }

6. UPDATE course_versions SET is_current = false
   WHERE course_id = ? AND id != newVersionId
   (only one version is "current" at a time — MVP)

7. UPDATE courses SET version = versionLabel, default_branch = branch
```

### Idempotency

- `UNIQUE (course_id, commit_sha)` prevents re-importing the same SHA twice.
- If the same SHA is already the current version, the import returns early with `{ alreadyCurrent: true, versionLabel }`.
- Re-importing an older SHA that was previously imported is allowed (triggers re-promotion).

---

## 6. Version History — Creator Dashboard

```
GET /dashboard/courses/{courseId}/versions

Displays:
┌────────────────────────────────────────────────────────────────┐
│ Version History — "Ship It: Git Workflow for Engineers"        │
│                                                                │
│  v1.1.0      main @ abc1234f   ★ Current     2025-04-12        │
│              5 lessons · 2 quizzes                             │
│              [Re-import] [Set as current]                      │
│                                                                │
│  v1.0.2      main @ d3e7a89c   Published     2025-04-08        │
│              5 lessons · 2 quizzes                             │
│              [Set as current]                                  │
│                                                                │
│  v1.0.1      main @ 88b2c3f1   Superseded    2025-04-01        │
│              4 lessons · 1 quiz                                │
│              [Set as current]                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. GitHub API Calls for Ref Resolution

### Resolve branch HEAD

```
GET /repos/{owner}/{repo}/branches/{branch}
→ { commit: { sha: "abc1234..." } }
```

### Resolve tag to commit SHA

```
GET /repos/{owner}/{repo}/git/ref/tags/{tag}
→ { object: { type: "commit"|"tag", sha: "..." } }

If type === "tag" (annotated tag):
  GET /repos/{owner}/{repo}/git/tags/{sha}   ← dereference to commit
  → { object: { sha: "commit-sha" } }
```

### List all refs (for picker UI)

```
GET /repos/{owner}/{repo}
→ { default_branch }

GET /repos/{owner}/{repo}/branches?per_page=100
→ [{ name, commit: { sha } }]

GET /repos/{owner}/{repo}/tags?per_page=100
→ [{ name, commit: { sha } }]
```

---

## 8. Version Label in UI

Version labels appear in:

1. **Creator dashboard** — version history table (see §6)
2. **Course page** — `v1.1.0` badge in the course header
3. **API response** — `POST /api/import` returns `{ versionLabel, commitSha, ... }`
4. **Git-native display** — short SHA link to `github.com/{owner}/{repo}/commit/{sha}`

```tsx
// VersionBadge component
<VersionBadge
  label="v1.1.0"
  commitSha="abc1234f"
  repoUrl="https://github.com/owner/repo"
  branch="main"
/>
// Renders: "v1.1.0 · main @ abc1234f ↗"
```

---

## 9. MVP Constraints + Upgrade Path

### MVP (this release)
- Default branch import only (auto-detected from GitHub API)
- No branch/tag picker in creator UI
- `GET /api/repos/refs` endpoint built but not surfaced in UI
- Version label computed and stored; displayed in creator dashboard
- Re-import button in dashboard triggers a new import from the same default branch

### v1.1 (next sprint)
- Branch/tag dropdown in import dialog
- `POST /api/import` accepts `{ ref, ref_type }` parameters
- Annotated tag dereferencing
- "Pin to tag" option — import locks to a specific tag, won't auto-update

### v2.0 (future)
- GitHub webhook: auto-import on push to configured branch
- Semantic version bump detection
- Student notification on new version available
- Version-specific pricing (lock old buyers to their purchased version)
