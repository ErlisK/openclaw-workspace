# ClaimCheck Studio — Landing Page

Evidence-backed, channel-ready content from your manuscripts and transcripts.

## Live URLs

| | URL |
|---|---|
| **Production** | https://citebundle.com |
| **Vercel deployment** | https://claimcheck-studio-37sk3b1c4-limalabs.vercel.app |
| **Health endpoint** | https://citebundle.com/api/health |
| **Lead API** | https://citebundle.com/api/lead |

## Architecture

- **Stack:** Next.js 16 (App Router, TypeScript), deployed on Vercel
- **Lead capture:** GitHub Issues in `ErlisK/openclaw-workspace` (labels: `lead`, `claimcheck-studio`)
- **Repo:** https://github.com/ErlisK/openclaw-workspace
- **Branch:** `feature/landing-claimcheck`

## Pages

| Route | Description |
|---|---|
| `/` | Marketing landing page |
| `/privacy` | Privacy policy (placeholder) |
| `/terms` | Terms of service (placeholder) |
| `/api/health` | Health check — `{ status: "ok" }` |
| `/api/lead` | Lead capture — POST JSON, creates GitHub Issue |

## Lead Capture API

**POST** `/api/lead`

```json
{
  "name": "Jane Smith",           // required
  "email": "jane@company.com",    // required
  "company": "Acme Pharma",       // optional
  "role": "Medical Writer",       // optional
  "use_case": "...",              // optional
  "utm_source": "...",            // optional
  "utm_medium": "...",            // optional
  "utm_campaign": "...",          // optional
  "referrer": "..."               // optional
}
```

Returns `{ "ok": true }` on success.

## Environment Variables (Vercel)

| Variable | Purpose |
|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Creates GitHub Issues for leads |
| `GITHUB_REPO_FULL_NAME` | `ErlisK/openclaw-workspace` |
| `NODE_ENV` | `production` |

## Verification Test Results

Run on 2026-04-08:

```bash
# Health check
curl https://claimcheck-studio-37sk3b1c4-limalabs.vercel.app/api/health
# → {"status":"ok"}

# Lead submission
curl -X POST https://claimcheck-studio-37sk3b1c4-limalabs.vercel.app/api/lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","company":"Test Co","role":"Medical Writer","use_case":"Evidence-backed LinkedIn threads","utm_source":"manual","utm_medium":"curl","utm_campaign":"smoke"}'
# → {"ok":true}

# GitHub Issue created: https://github.com/ErlisK/openclaw-workspace/issues/18
# Title: "Lead: test@example.com — ClaimCheck Studio"
```

## Local Development

```bash
cd claimcheck-studio
npm install
# Add .env.local:
# GITHUB_PERSONAL_ACCESS_TOKEN=your_token
# GITHUB_REPO_FULL_NAME=ErlisK/openclaw-workspace
npm run dev
```

## Future: Email Notifications

The `/api/lead/route.ts` is structured for easy AgentMail addition. After issue creation, add:
```ts
// TODO: send notification via AgentMail to hello@citebundle.com
```
