# CertClip — Employer Search + Credential Wallet Deliverable
**Feature:** Employer portfolio search with filters + auditable credential wallet  
**Date:** 2026-04-07  
**Live:** https://startup-63-skillclip-customer-development-driven-l9sll4ydw.vercel.app

- **Search:** `/search`
- **Wallet:** `/wallet`
- **Search API:** `/api/search`

---

## Employer Search (`/search`)

### Filter sidebar
| Filter | Options |
|---|---|
| Trade | All Trades, Electrician ⚡, Plumber 🔧, HVAC ❄️, Welder 🔥, Pipefitter 🔩 |
| Jurisdiction | All, Texas (NEC 2020), California (CEC 2022), Illinois, New York, Florida |
| Skill Level | Any, Apprentice, Journeyman, Master |
| Code Compliance | Any / Pass Only (≥80% pass rate) |
| Skill Tag | Free-text search against badge titles + skill_tags |
| Sort | Most Badges / Highest Rated / Most Experience / Most Active |

Active filters displayed as chips with × dismiss.

### Profile cards
Each tradesperson card shows:
- Name + skill level badge (color-coded: apprentice green / journeyman blue / master purple)
- Trade emojis + years experience + avg star rating
- Bio (1 line)
- **Badge count** (large prominent number)
- Badge mini-row: up to 3 gradient pills with trade + region_code
- Reviewed clip count + code compliance pass rate (colored green/amber)
- Region tags + skill tags (up to 5)
- **View Portfolio →** button + **📅 Book Verification** button

### Portfolio drawer
Clicking "View Portfolio" slides in a right-side drawer with 3 tabs:

**🏅 Badges tab:**
- Each badge: gradient header (type + trade + region + code standard), issued date
- Expanded view: work sample clip info, challenge prompt, full mentor feedback text, jurisdiction notes, all timestamped notes (clickable timestamps), skill tags

**🎬 Work Clips tab:**
- Each reviewed clip: title, trade, region, duration, rating, compliance
- Challenge prompt preview
- Skill tags

**🔐 Audit Log tab:**
- Event type colored chips (issued/verified/exported/revoked/api_accessed)
- Append-only disclaimer: "Every badge issuance, verification, export, and revocation is recorded here permanently. Rows cannot be deleted or modified."
- Actor type + timestamp per entry

---

## Search API (`/api/search`)

### `GET /api/search?...` — Portfolio search

All params optional, returns paginated results with computed stats:

```
q=          Free-text (name, bio, badge title, skill tag)
trade=      Trade slug
region=     Region code (US-TX, US-CA, etc.)
skill_tag=  Partial match against skill_tags + badge titles
code_ref=   Code standard match (e.g. "NEC 2020")
compliance= "pass" | "any"
skill_level="apprentice" | "journeyman" | "master"
min_badges= Integer minimum badge count
min_rating= Float minimum average review rating
sort=       "badges" | "rating" | "experience" | "recent"
limit=      Max 50 (default 20)
offset=     Pagination
```

Per tradesperson, the API computes:
- `badge_count` — active (non-revoked) badges
- `reviewed_clip_count`
- `avg_rating` — from all review.overall_rating values
- `trades[]` — from badges + clips
- `regions[]` — from badges + clips
- `skill_tags[]` — deduplicated from badges + clips
- `compliance_pass_rate` — % of reviews with code_compliance_pass=true
- `top_skill_level` — highest level across all reviews

### `GET /api/search?profile_id=...` — Single portfolio

Returns full profile + badges (with review join + clip join) + reviewed clips + ledger entries.
Used by the portfolio drawer and the wallet page.

---

## Credential Wallet (`/wallet`)

### Access methods
- `/wallet` — loads logged-in user's wallet
- `/wallet?profile_id=...` — public employer-facing portfolio view
- `/wallet?email=...` — lookup by email
- Share URL format: `https://certclip.com/wallet?profile_id={id}`

### Profile header
- Name, years experience, bio
- Active badge count (large)
- Average rating
- Trade tags + region tags derived from active badges

### 🏅 Badges tab

Each badge card:
- Gradient header with `badge_type`, trade, region code, code standard
- Title
- Rating stars + skill level chip + code compliance pass/fail
- Skill tags
- Expandable detail:
  - 📹 Work sample: title, duration, challenge prompt
  - 💬 Mentor feedback: full feedback text, jurisdiction notes, all timestamped notes
- Revoked badges shown separately with 50% opacity + "REVOKED" label

### 🔐 Audit Log tab

Colored event type chips:
| Event | Color | Meaning |
|---|---|---|
| `issued` | Green | Badge issued by mentor after review |
| `verified` | Blue | Badge verified by employer during search |
| `exported` | Purple | Badge exported to ATS / CSV |
| `revoked` | Red | Badge revoked (fraud, error) |
| `api_accessed` | Indigo | Badge accessed via API key |

Append-only explanation:
> "Every credential event is permanently recorded here with actor identity, timestamp, and metadata. Rows cannot be modified or deleted — this provides a tamper-proof issuance history for employers, ATS systems, and compliance audits."

### 🔗 Share tab
- Copyable public URL (`https://certclip.com/wallet?profile_id=...`)
- "What employers see" explainer (badges, ratings, compliance, ledger visible; email/contact hidden)

---

## Ledger State

| Event Type | Count |
|---|---|
| `issued` | 12 |
| `verified` | 12 |
| `exported` | 5 |
| **Total** | **29** |
