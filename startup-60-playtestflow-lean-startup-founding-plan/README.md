# PlaytestFlow Monorepo

A lean startup project for indie tabletop & RPG designers to run structured remote playtests.

## Structure

```
startup-60-playtestflow-lean-startup-founding-plan/
├── apps/
│   └── playtestflow/          # Next.js App Router (TypeScript)
│       ├── app/
│       │   ├── page.tsx       # Landing page with waitlist + pricing
│       │   ├── api/
│       │   │   ├── waitlist/  # POST /api/waitlist
│       │   │   └── pricing-click/ # POST /api/pricing-click (fake-door tracking)
│       │   └── layout.tsx
│       └── lib/
│           └── supabase.ts
└── package.json               # Workspace root
```

## Stack
- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Database:** Supabase (PostgreSQL + RLS)
- **Hosting:** Vercel
- **Auth:** Supabase Auth (Phase 2)

## Live URL
https://playtestflow.vercel.app

## Phase 1 Goals
- Landing page with value prop + fake-door pricing
- Waitlist signup with IRB-lite consent
- Track pricing tier interest (fake-door)
- 20 designer interviews via outreach

## Getting Started

```bash
cd apps/playtestflow
cp .env.local.example .env.local
# Fill in your Supabase credentials
npm install
npm run dev
```
