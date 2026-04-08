# CertClip — Verified Credentials for Tradespeople

> Phase 1: Customer Discovery A — SkillClip / CertClip Startup

## What is CertClip?

CertClip is a region-aware micro-credentialing marketplace where tradespeople upload 10–90s task-focused videos as verifiable work samples and vetted local journeymen provide timestamped feedback and jurisdiction-tagged micro-badges.

**Live at:** https://certclip.com

## Stack

- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **Backend:** Supabase (PostgreSQL + auth + realtime)
- **Deployment:** Vercel
- **Database:** Supabase Project `qifxwrixwjgnitjsncxs`

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with SEO metadata
│   ├── page.tsx            # Landing page with waitlist signup
│   └── api/
│       └── signup/route.ts # Waitlist API endpoint
├── lib/
│   └── supabase.ts         # Supabase client
├── supabase/
│   └── schema_v0.sql       # Database schema v0
└── vercel.json             # Vercel deployment config
```

## Database Schema v0

Tables:
- `regions` — jurisdiction-aware region definitions (US/CA states + provinces)
- `trades` — canonical trade taxonomy (Electrician, Plumber, HVAC, etc.)
- `interest_tags` — skill/task micro-tags for portfolios and search
- `profiles` — user profiles (tradespeople + employers)
- `waitlist` — pre-launch email signups from landing page

## Research Documents

See `/research/` folder (committed alongside code) and `/scide-output/` for:
- `01-stakeholder-map.md`
- `02-hypothesis-register.md` (20 hypotheses across 5 domains)
- `03-top-pains-per-segment.md`
- `04-icp-definitions.md` (ICP-1: Skeptical GC, ICP-2: Mobile Journeyman, ICP-3: Volume Recruiter)
- `05-interview-guide.md` (35-interview plan + tracking template)

## Getting Started

```bash
npm install
cp .env.local.example .env.local  # fill in Supabase keys
npm run dev
```

## Phase 1 Success Criteria

- [ ] ≥35 interviews completed
- [ ] ≥1,000 unique landing page visits
- [ ] ≥200 validated signups (≥30% tradespeople, ≥30% employers)
- [ ] ≥70% employer/staffing confirm code-compliance as top-2 pain
