# @teachrepo/cli

Convert a GitHub repo into a paywalled course — from your terminal.

[![npm version](https://img.shields.io/npm/v/@teachrepo/cli)](https://www.npmjs.com/package/@teachrepo/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](../../LICENSE)

---

## Install

```bash
npm install -g @teachrepo/cli
```

Or run without installing:

```bash
npx @teachrepo/cli@latest init
```

Or install directly from GitHub (latest main branch):

```bash
npx github:ErlisK/openclaw-workspace#main
```

## Quick Start

```bash
# 1. Create a new course
mkdir my-course && cd my-course
teachrepo init --name "My Course" --slug "my-course"

# 2. Edit course.yml with your details
# 3. Add lesson content to lessons/

# 4. Validate your structure
teachrepo validate

# 5. Link to TeachRepo (creates course + stores config in .coursekitrc)
export TEACHREPO_API_KEY=<your-api-key>
teachrepo link --api-url https://teachrepo.com

# 6. Publish your course
teachrepo push
```

## Commands

### `teachrepo init [--name <title>] [--slug <slug>]`

Scaffolds a new course in the current directory:

```
my-course/
├── course.yml                    ← Course metadata and pricing
├── lessons/
│   └── 01-introduction.md       ← First lesson with frontmatter
├── quizzes/
│   └── introduction-quiz.yml    ← Sample quiz
├── .github/
│   └── workflows/
│       └── publish-course.yml   ← Auto-publish CI workflow
└── .gitignore                    ← Ignores .coursekitrc
```

### `teachrepo link [--api-url <url>] [--api-key <key>]`

Links the current course to a TeachRepo instance:

- Reads `course.yml` for slug and title
- Creates the course record via `POST /api/courses/link` (idempotent)
- Stores `apiUrl`, `apiKey`, `courseId`, `courseSlug` in `.coursekitrc`
- `.coursekitrc` is added to `.gitignore` automatically (contains API key)

```bash
# Use environment variable (recommended for CI)
export TEACHREPO_API_KEY=tr_live_xxxxxxxxxx
teachrepo link

# Or pass inline
teachrepo link --api-key tr_live_xxx --api-url https://my-instance.vercel.app
```

### `teachrepo push [--draft] [--dry-run]`

Pushes course files to TeachRepo. Reads config from `.coursekitrc`.

Sends:
- `course.yml` content
- All `lessons/*.md` files
- All `quizzes/*.yml` files
- Current git commit SHA (for versioning)
- Git remote URL

```bash
teachrepo push
teachrepo push --draft        # Publish as draft
teachrepo push --dry-run      # Preview what would be sent
```

### `teachrepo validate`

Validates the course structure locally without making API calls:

- `course.yml` has required fields (`title`, `slug`, `price_cents`, `currency`)
- Slug is lowercase kebab-case
- All lessons have required frontmatter (`title`, `slug`, `order`, `access`)
- No duplicate lesson slugs
- `quiz_id` references resolve to existing `quizzes/` files

### `teachrepo quiz generate <lesson-file> [-n <count>]`

Generates quiz questions for a lesson using AI (Vercel AI Gateway):

```bash
teachrepo quiz generate lessons/01-introduction.md
teachrepo quiz generate lessons/01-introduction.md --num-questions 5
```

Writes the generated quiz YAML to `quizzes/{lesson-slug}-quiz.yml`.

**Requires**: API key + deployed Vercel instance (AI Gateway not available locally).

## Config File: `.coursekitrc`

Created by `teachrepo link`. Located at the course root.

```json
{
  "apiUrl": "https://teachrepo.com",
  "apiKey": "tr_live_xxxxxxxxxx",
  "courseId": "uuid",
  "courseSlug": "my-course",
  "linkedAt": "2025-01-01T00:00:00.000Z"
}
```

**Never commit `.coursekitrc`** — it contains your API key. It's added to `.gitignore` automatically.

For CI, use `TEACHREPO_API_KEY` environment variable instead.

## Environment Variables

| Variable | Description |
|---|---|
| `TEACHREPO_API_KEY` | API key for authentication (preferred for CI) |
| `TEACHREPO_API_URL` | API base URL (default: `https://teachrepo.com`) |

## GitHub Actions Integration

Use `teachrepo push` in CI to auto-publish on every push:

```yaml
# .github/workflows/publish-course.yml
- name: Publish to TeachRepo
  run: |
    npx @teachrepo/cli@latest validate
    npx @teachrepo/cli@latest push
  env:
    TEACHREPO_API_KEY: ${{ secrets.TEACHREPO_API_KEY }}
```

## Self-Hosting

Deploy your own TeachRepo instance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FErlisK%2Fopenclaw-workspace%2Ftree%2Fmain%2Fstartup-91-lean-launch-plan-repo-to-course-git-native-paywall%2Fapps%2Fweb)

Then link to your instance:

```bash
teachrepo link --api-url https://my-instance.vercel.app
```

## License

MIT
