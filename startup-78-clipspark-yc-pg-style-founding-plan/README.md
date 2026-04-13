# ClipSpark Monorepo

Monorepo for ClipSpark — the AI-powered podcast clip tool.

## Structure

```
startup-78-clipspark-yc-pg-style-founding-plan/
├── apps/
│   └── clipspark/          ← Next.js App Router (deployed to Vercel)
├── concierge/              ← Phase 2 tools, templates, pipeline scripts
│   ├── tools/
│   │   ├── pipeline.py     ← Semi-manual clip pipeline
│   │   └── style_experiments.py
│   ├── template-v0.2.json  ← Clip template schema
│   └── heuristic-spec-v0.2.md
├── research/               ← Phase 1 research artifacts
├── waitlist/               ← Waitlist landing page (separate Next.js app)
├── vercel.json             ← Vercel monorepo config (root → apps/clipspark)
└── package.json            ← Workspace root
```

## Apps

### `apps/clipspark`
The main MVP app. Stack: Next.js 15 (App Router), TypeScript, Tailwind, Supabase.

**Deployed:** [clipspark.vercel.app](https://clipspark.vercel.app) *(pending)*

**Routes:**
- `/` — Landing page
- `/auth/login` — Magic link auth
- `/auth/callback` — OAuth callback
- `/dashboard` — Concierge ops dashboard (job status board)
- `/upload` — Create new clip job
- `/jobs/[id]` — Job detail + clip pipeline view
- `/api/jobs` — GET/POST jobs
- `/api/jobs/[id]` — GET/PATCH/POST (status advance) job

**Supabase project:** `twctmwwqxvenvieijmtn`

## Local Dev

```bash
cd apps/clipspark
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Deploy

```bash
cd startup-78-clipspark-yc-pg-style-founding-plan
npx vercel --prod --token $VERCEL_ACCESS_TOKEN --yes
```
