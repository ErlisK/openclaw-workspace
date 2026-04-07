# CertClip — Mentor Review UI Deliverable
**Feature:** Timestamped Mentor Reviews + Code Reference Lookup + Badge Issuance with Ledger  
**Date:** 2026-04-07  
**Live:** https://startup-63-skillclip-customer-development-driven-p1iyw6vo5.vercel.app/review

---

## What Was Built

### 1. Mentor Review UI (`/review`)

Full two-view page:

**Queue View** — Lists all pending clips assigned to the logged-in mentor:
- Clip title, trade, region, duration, uploader name
- Challenge prompt preview
- Assignment date
- Click any row to enter the Review View

**Review View** — Two-column layout:

**Left column (video + context):**
- HTML5 video player with time tracking (`currentTime` updated on `timeUpdate`)
- **Challenge prompt display** with addressed/partial/not-addressed radio buttons (stored in `challenge_prompt_addressed`)
- **Uploader card** — name, years experience, bio, upload date, file size, skill tags
- **Timestamped notes panel:**
  - Shows current video time as `M:SS`
  - Text input + "Code ref" dropdown (populated from trade/region code_references)
  - Press Enter or ▶ button to capture note at current timestamp
  - Each note shows clickable timestamp (click → jumps video to that point)
  - Optional linked code reference shown as `📋 NEC 2020 §210.8`
  - Delete button per note
  - Notes stored as `jsonb` in `reviews.timestamped_notes`

**Right column (review form):**
- **Rating** — 1–5 star selector with visual feedback
- **Skill level** — apprentice / journeyman / master button group
- **Code compliance** — Pass ✓ / Fail ✗ toggle + jurisdiction notes textarea (pre-populated with `${region.code_standard} for ${region.name}`)
- **Code references panel** — scrollable list of trade+region-filtered refs, click to select, selected refs highlighted purple and attached to review + badge
- **Feedback text** — required field, character counter
- **Badge issuance toggle** — switch to enable; shows validation (requires compliance pass + rating ≥ 3), badge title input (auto-generated default), selected code refs preview
- Submit button changes label based on badge mode

---

### 2. `/api/review` — Review API

**GET `?clip_id=...&mentor_id=...`**  
Returns:
- Full clip with uploader, trade, region joins
- Filtered code_references (exact trade+region match OR trade-only, ordering violations first)
- Existing review if mentor has one for this clip
- Public Supabase Storage URL for video playback

**GET `?mentor_id=...`**  
Returns pending review queue for mentor (status = assigned/pending).

**POST** — Submit or upsert review:
1. Upserts `reviews` row with all fields including `timestamped_notes[]`, `code_reference_ids[]`, `challenge_prompt_addressed`, `review_duration_seconds`
2. Updates `clips.status = 'reviewed'`
3. If `issue_badge=true` AND `code_compliance_pass=true` AND `overall_rating ≥ 3`:
   - Inserts `badges` row with `trade_id`, `region_id`, `code_standard`, `skill_tags`, `code_reference_ids`, `metadata`
   - Inserts **append-only `badges_ledger` entry** with `event_type='issued'`, `actor_id` (mentor), `actor_type='mentor'`, IP address, user-agent, and full metadata JSON

---

### 3. Code Reference Library — 75 Total Entries

| Trade | Count | Standards |
|---|---|---|
| Electrician | 16 | NEC 2020, CEC 2022/Title 24, NYC Elec. Code 2011, NFPA 70E |
| Plumber | 6 | IPC 2021, IRC 2021 |
| HVAC Technician | 7 | EPA 608, ASHRAE 15/90.1, NEC 440, Title 24 |
| Welder | 6 | AWS D1.1, ASME BPVC IX, AWS Z49.1 |
| Pipefitter | 5 | ASME B31.3, B31.1, B16.20, API 520 |
| *(prior 35)* | 35 | Multiple |

Severity levels: **violation** (red) / **warning** (amber) / **informational** (blue)

---

### 4. `badges_ledger` Append-Only Guarantee

Postgres trigger `trg_badges_ledger_no_delete`:
```sql
CREATE OR REPLACE FUNCTION prevent_badges_ledger_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'badges_ledger is append-only — rows cannot be deleted or updated';
END;
$$;

CREATE TRIGGER trg_badges_ledger_no_delete
  BEFORE DELETE OR UPDATE ON badges_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_badges_ledger_delete();
```

Every badge event (issued, revoked, verified, exported) writes an immutable row with:
- `badge_id`, `profile_id`, `event_type`
- `actor_id` + `actor_type` (who did the action)
- `ip_address`, `user_agent` (forensic trail)
- `notes` (human-readable summary)
- `metadata` JSONB (full event context: review_id, rating, skill_level, code_reference_ids, timestamped_notes_count)

---

### 5. Schema Changes

**`reviews` table — new columns:**
| Column | Type | Purpose |
|---|---|---|
| `badge_issued` | BOOLEAN | Whether a badge was issued from this review |
| `badge_id` | UUID FK | Reference to issued badge |
| `code_reference_ids` | UUID[] | Code refs selected by mentor |
| `recommended_skill_level` | TEXT | Mentor's recommended classification |
| `challenge_prompt_addressed` | BOOLEAN | Whether tradesperson addressed the prompt |
| `review_duration_seconds` | INTEGER | Time mentor spent on review |

---

## Routes

| Route | Description |
|---|---|
| `/review` | Mentor queue + full review UI |
| `/api/review` GET | Clip data + code refs + existing review |
| `/api/review` POST | Submit review + optional badge + ledger |
