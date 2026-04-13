# ClipSpark

AI-powered content repurposing for nano-creators. Turn long-form podcasts, webinars, and livestreams into platform-ready short clips for TikTok, Reels, Shorts, and LinkedIn.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub PAT with `repo` scope for writing waitlist data |
| `GITHUB_OWNER` | GitHub username/org that owns the monorepo |
| `GITHUB_REPO` | Repository name (e.g., `openclaw-workspace`) |
| `GITHUB_BRANCH` | Branch to write to (default: `main`) |
| `SUBMISSION_SALT` | Random string for salting IP hashes (generate with `openssl rand -hex 32`) |

## Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENTMAIL_API_KEY` | AgentMail API key for notification emails on new signups |
| `AGENTMAIL_INBOX_EMAIL` | Email address to receive signup notifications |

## Waitlist Data

Signups are stored at `clipspark/_data/waitlist.json` in the monorepo root. Each record:

```json
{
  "email": "user@example.com",
  "creator_type": "podcaster",
  "audience_size": "1-5k",
  "notes": "Optional notes",
  "ts": "2025-01-01T00:00:00.000Z",
  "ua": "Mozilla/5.0...",
  "ip_hash": "sha256-hash-of-salted-ip"
}
```

To verify submissions, check `clipspark/_data/waitlist.json` in the GitHub repo.

## Deployment (Vercel)

```bash
# Deploy to production
npx vercel --prod --token $VERCEL_ACCESS_TOKEN --yes
```

Set environment variables in the Vercel dashboard or via CLI before deploying.

## Architecture

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Analytics**: Vercel Web Analytics (`@vercel/analytics`)
- **Waitlist storage**: GitHub Content API (JSON file in monorepo)
- **Database**: None (GitHub-backed storage for pre-launch phase)
