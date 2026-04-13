# KidColoring Landing Page

Public landing page with waitlist funnel for KidColoring.

## Local Development

1. Copy the example env file and fill in values:
   ```bash
   cp .env.local.example .env.local
   # edit .env.local with your values
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Visit http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (`https://lpxhxmpzqjygsaawkrva.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key (bypasses RLS for server-side routes) |

## API Routes

- `GET /api/health` — Health check, returns `{ ok: true }`
- `POST /api/waitlist` — Waitlist signup. Body: `{ email, parent_first_name?, child_age_bracket?, interests?, consent }`
- `POST /api/track` — Event tracking. Body: `{ event_name, props? }`

## Database Schema

Uses the existing Supabase project (ref: `lpxhxmpzqjygsaawkrva`):
- `public.waitlist_signups` — stores waitlist entries
- `public.events` — stores tracked events

RLS policies:
- `waitlist_insert_anon` — allows anon INSERT on `waitlist_signups`
- `events_anon_insert` — allows anon INSERT on `events`

## Deployment

Deployed on Vercel as project `kidcoloring-landing`.
Root directory: `startup-49-kidcolor-kids-story-to-coloring-book-design-thinki/apps/kidcoloring/landing`
