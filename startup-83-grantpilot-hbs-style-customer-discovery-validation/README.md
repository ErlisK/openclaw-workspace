# GrantPilot — Phase 1: HBS Customer Discovery 

AI-Assisted Grant Ops Marketplace · Phase 1: Problem Definition & Persona Prioritization

## Live App
- **Production**: https://app-limalabs.vercel.app
- **Research Workspace**: https://app-limalabs.vercel.app/research

## Infrastructure
- **Supabase Project**: `zgqlnnftbkfnbtzlbaiy` (grantpilot-discovery)
- **Region**: us-east-1
- **Auth**: Email/password + Google OAuth enabled

## Database Tables (all with RLS)
| Table | Rows | Description |
|-------|------|-------------|
| `competitors` | 14 | Competitor landscape scan |
| `research_items` | 103 | Public signal items tagged by type & persona |
| `personas` | 4 | Persona cards ranked by urgency × ATP |
| `hypotheses` | 12 | Versioned hypotheses across 5 categories |
| `research_sources` | 14 | Source catalog (Reddit, G2, LinkedIn, etc.) |
| `user_roles` | 0 | Admin role table (RLS gated) |

## Research Workspace Sections
- `/research` — Overview dashboard
- `/research/personas` — 4 persona cards ranked by priority
- `/research/hypotheses` — 12 hypotheses by category
- `/research/competitors` — 14 competitors mapped
- `/research/signals` — 103 signal items from public sources

## HBS Phase 1 Checklist
- [x] Problem space defined: grant ops fragmentation for small nonprofits
- [x] 4 customer segments identified and prioritized
- [x] 14 competitors scanned with strengths/weaknesses
- [x] 103 public signals ingested from Reddit, LinkedIn, G2, job boards, news
- [x] 4 personas with pain points, goals, purchase triggers, urgency/ATP scores
- [x] 12 versioned hypotheses across customer/problem/solution/channel/revenue
- [ ] Customer interviews (next: 20+ discovery interviews with nonprofit EDs)

## Persona Priority Ranking
1. **Sarah Chen** — Small Nonprofit ED · Urgency 9 · ATP 6 · Score 54 ← **Beachhead**
2. **Marcus Johnson** — Municipal Grants Manager · Urgency 7 · ATP 9 · Score 63
3. **Keisha Williams** — Neighborhood Association Chair · Urgency 8 · ATP 4 · Score 32
4. **Tom Rivera** — Development Director · Urgency 6 · ATP 8 · Score 48
