# CertClip — Challenge Prompt System Deliverable
**Feature:** Randomized Challenge Prompts for Portfolio Uploads  
**Date:** 2026-04-07  
**Live:** https://startup-63-skillclip-customer-development-driven-gd86uisw5.vercel.app/upload

---

## What Was Built

### 1. `challenge_prompts` Table (Supabase)

Stores 36 trade- and region-specific prompts with full metadata:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `trade_id` | UUID → trades | Required — trade specificity |
| `region_id` | UUID → regions | Optional — jurisdiction specificity |
| `prompt_text` | TEXT | Full challenge scenario text |
| `category` | TEXT CHECK | safety / technique / code_compliance / tool_use / measurement / documentation |
| `difficulty` | TEXT CHECK | apprentice / journeyman / master |
| `skill_tags` | TEXT[] | Tags used in upload skill-tag selector |
| `code_refs` | TEXT[] | e.g. ["NEC 2020 230.70", "NFPA 70E Table 130.5(C)"] |
| `active` | BOOLEAN | Soft-disable without deletion |
| `use_count` | INTEGER | Incremented on each issuance |

RLS: public SELECT for active prompts; service role full access.

### 2. `prompt_logs` Table (Supabase)

Immutable log of every prompt issuance:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `uploader_id` | UUID → profiles | Who received the prompt |
| `prompt_id` | UUID → challenge_prompts | Which prompt |
| `trade_id` / `region_id` | UUID | Context at time of issuance |
| `issued_at` | TIMESTAMPTZ | When prompt was shown |
| `clip_id` | UUID → clips | Populated when clip uploaded |
| `response_time_seconds` | INTEGER | Time from prompt issued to clip submitted |
| `completed` | BOOLEAN | true once clip is uploaded |

### 3. `clips` Table — New Columns

- `challenge_prompt_id` UUID FK → challenge_prompts
- `prompt_issued_at` TIMESTAMPTZ
- `skill_tags` TEXT[]

### 4. `/api/challenge-prompt` — Serverless Function

**GET** `?trade_id=...&region_id=...&uploader_id=...`

Selection algorithm:
1. Query active prompts for exact `trade_id + region_id` match (highest specificity)
2. Fallback to `trade_id` only (no region filter) if no exact match
3. Fallback to generic prompt if no trade match
4. Exclude prompts seen by this uploader in the last 30 days
5. **Weighted random selection** — lower `use_count` = higher selection weight (inverse frequency weighting prevents prompt overuse)
6. Insert `prompt_logs` record with `issued_at`, returns `log_id` to client
7. Increment `use_count` on selected prompt

**POST** `{ log_id, clip_id, response_time_seconds }`
- Marks the prompt log as `completed = true`, links `clip_id`, records response time

### 5. Upload Page — 3-Step Rebuilt Flow

**Step 1: Select Video + Trade + Region**
- File drop zone with MIME + size + duration validation (10–90s, 50MB max)
- Trade picker: 8 trades with emoji cards
- Region picker: 6 jurisdictions with code standard label (NEC 2020 + TDLR, CEC 2022 + Title 24, etc.)

**Step 2: Challenge Prompt**
- Dynamic fetch from `/api/challenge-prompt` API on trade+region select
- Displays: prompt text, category badge (color-coded), difficulty badge, code_refs pills, skill_tags
- Acknowledgment checkbox — user confirms video addresses the prompt
- "Request different prompt" link (triggers re-fetch, avoids repeat issuance in 30 days)
- Prompt + log_id stored for clip upload

**Step 3: Details + Upload**
- Title, task description
- Skill tag selector pre-populated from `prompt.skill_tags` + standard tags
- Clip summary card (filename, duration, size, trade, region)
- On submit: uploads to Supabase Storage, creates clips row with `challenge_prompt_id` + `prompt_issued_at`, POSTs to `/api/challenge-prompt` to close the log

---

## Prompt Library (36 prompts)

| Trade | Regions | Count | Categories |
|---|---|---|---|
| Electrician | TX, CA, NY | 10 | safety, technique, code_compliance, measurement |
| Plumber | TX, IL | 6 | technique, code_compliance, measurement, safety |
| HVAC Technician | TX, IL | 8 | technique, measurement, code_compliance, safety |
| Welder | TX, IL | 7 | technique, code_compliance, measurement, safety |
| Pipefitter | IL, TX | 5 | technique, code_compliance, measurement |

### Sample Prompts by Category

**Safety (Electrician, TX):**
> Before opening an energized panel to work on a 120/208V load center, demonstrate your PPE selection under NFPA 70E. Show your gloves, face shield, and arc-rated clothing rating appropriate for the incident energy level.

**Code Compliance (Plumber, TX):**
> You're running a CSST gas line from the meter to a residential range in Texas. Show your fitting assembly, arc-resistant CSST bonding requirements per IRC G2411 (Texas has adopted the bonding amendment), and how you perform the pressure test before the gas company will restore service.

**Technique (Welder, TX):**
> Perform a 3G vertical-up fillet weld using 7018 electrodes on 3/8" mild steel plate. Show your electrode oven temperature verification (250–300°F per AWS D1.1), stringer vs. weave bead technique, restart procedure, and visual inspection against AWS D1.1 Table 6.1.

**Measurement (HVAC, TX):**
> Verify the charge on an R-410A split system using the subcooling method for a TXV system. Show manifold gauge connection, measure discharge pressure and saturated condensing temperature, calculate actual subcooling, compare to manufacturer target (10–15°F), and explain what indicates overcharge vs. undercharge.

**Master-level (Pipefitter, IL):**
> You're setting up a hydrostatic pressure test on a new stainless steel process piping system per ASME B31.3 §345. Calculate the test pressure (1.5× design pressure with temperature correction), show blind flange placement and vent positioning, explain what temperature the test medium must be above to avoid brittle fracture, and demonstrate hold time and acceptance criteria.

---

## Usage Statistics

| Metric | Value |
|---|---|
| Total prompts | 36 |
| Trades covered | 5 |
| Regions covered | 4 |
| Total prompt issuances logged | 80 |
| Avg use count per prompt | 2.2 |
| Most-used prompt | Electrician/TX panel upgrade (NEC 230.70) — 8 uses |
| Prompts with 0 uses | 4 (master-level, niche jurisdictions) |

---

## Anti-Gaming Features

1. **30-day exclusion** — same uploader can't get the same prompt twice within 30 days
2. **Weighted random** — lower use_count prompts get higher probability → distributes evenly across library
3. **Log linking** — every prompt issued is logged with `uploader_id` + `clip_id`; mentor reviewers see the logged prompt, not just clip.challenge_prompt text
4. **Mentor verification** — review UI shows the logged prompt alongside the video; mentor confirms video addresses it
5. **Response time tracking** — `response_time_seconds` in prompt_logs; unusually fast responses (< 60s) can be flagged as fraud signals

---

## Routes Added

| Route | Description |
|---|---|
| `/api/challenge-prompt` GET | Select randomized prompt for trade+region |
| `/api/challenge-prompt` POST | Mark prompt log completed on clip upload |
| `/upload` | Rebuilt 3-step upload flow with dynamic prompts |
