# ClipSpark — Supabase Operations Database v0.1
**Project:** `twctmwwqxvenvieijmtn` (clipspark-waitlist)  
**Realtime:** Enabled on all 4 tables  
**Date:** April 9, 2026

---

## Tables

### `concierge_jobs` — 10 rows
Full lifecycle tracking for each creator engagement.

**Status flow:**
```
intake → transcribing → scoring → rendering → qa → delivered → posted → feedback_recv → complete
```

**Key fields:**
| Field | Type | Notes |
|-------|------|-------|
| `status` | enum | 10 states, checked constraint |
| `tat_hours` | generated | `(delivered_at - intake_at) / 3600` — auto-computed |
| `total_cost_usd` | generated | sum of transcription + render + AI costs |
| `template_id` | text → template_variants | which template was applied |
| `heuristic_version` | text | 'v0.1', 'v0.2' — tracks which scoring algo ran |

**Current state:** All 10 jobs at `intake` status. Template pre-assigned by niche:
- James (comedy) → `tiktok-native-v02`
- Lisa, Elena → `linkedin-pro-v02`
- All others → `podcast-pro-v02`

---

### `clips` — 30 rows
One row per individual clip (3 per job × 10 jobs = 30).

**Key fields:**
| Field | Type | Notes |
|-------|------|-------|
| `render_status` | enum | pending / rendering / complete / failed |
| `heuristic_score` | int | Score from heuristic spec v0.2 |
| `heuristic_signals` | text[] | ['HOOK_OPENING', 'NARRATIVE_PEAK', ...] |
| `was_fallback` | bool | True if time-spaced, not heuristic-selected |
| `qa_approved` | bool | Operator sign-off |
| `creator_approved` | bool | Creator says "I'd post this" |
| `views_48h` | int | Filled after posting |
| `completion_rate_pct` | numeric | Filled after posting |
| `duration_sec` | generated | `source_end_sec - source_start_sec` |

---

### `template_variants` — 5 rows
Registry of all template versions. A/B tracking built in.

| template_id | Preset | Caption | Lower-Third | Waveform |
|-------------|--------|---------|-------------|---------|
| `podcast-pro-v02` | Podcast Pro | keyword_color, 4w/line | ✅ | ❌ |
| `tiktok-native-v02` | TikTok Native | last_word_yellow, 3w/line | ❌ | ❌ |
| `linkedin-pro-v02` | LinkedIn Pro | pill_caption, 5w/line | ✅ | ❌ |
| `audio-only-v02` | Audio Only | keyword_color, 4w/line | ✅ | ✅ |
| `comedy-kinetic-v02` | Comedy Kinetic | kinetic_single_word, 1w/line | ❌ | ❌ |

**Usage tracking columns:** `times_used`, `times_qa_approved`, `times_creator_chose`, `avg_views_48h` — update as pilots respond.

---

### `feedback` — 23 rows
Unified feedback store. Three types active:

| `feedback_type` | Rows | Source |
|----------------|------|--------|
| `performance` | 13 | Migrated from `performance_data` |
| `csat` | 10 | Migrated from `csat_responses` (placeholders) |
| `qualitative` | 0 | Awaiting creator replies |
| `style_choice` | 0 | Awaiting creator replies |
| `change_request` | 0 | Awaiting creator replies |

**Key generated column:** `delta_pct = ((value_after - value_before) / value_before) * 100`  
Auto-computed once `value_after` is filled.

**`overall_score`** for CSAT: `(q1 + q2 + q3) / 3.0` — auto-computed.

---

## Views (Dashboard Queries)

### `v_job_status_board`
One row per job with full status summary. Use for the team coordination board.

```sql
select creator_name, status, clip_count, clips_rendered, 
       clips_qa_passed, tat_hours, total_cost_usd 
from v_job_status_board;
```

### `v_clip_pipeline`
One row per clip. Tracks rendering progress + performance.

```sql
select creator_name, clip_index, platform, heuristic_score, 
       render_status, qa_approved, views_48h
from v_clip_pipeline
where render_status != 'complete';  -- filter to in-progress
```

### `v_csat_summary`
CSAT averages per creator. Pass criteria: `avg_overall_score >= 4.0`.

```sql
select creator_name, avg_q1_quality, avg_q2_moments, 
       avg_q3_would_post, would_pay, avg_overall_score
from v_csat_summary;
```

### `v_template_performance`
Which templates get best results. Fills as clips are posted.

```sql
select template_id, total_clips, qa_pass, creator_approved,
       avg_score, avg_views_48h, avg_completion_pct
from v_template_performance;
```

---

## Realtime Setup

All 4 tables added to `supabase_realtime` publication:

```sql
alter publication supabase_realtime add table concierge_jobs;
alter publication supabase_realtime add table clips;
alter publication supabase_realtime add table template_variants;
alter publication supabase_realtime add table feedback;
```

**Subscribe to job status changes** (JavaScript/Next.js):
```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Team dashboard: watch job status changes in real-time
supabase
  .channel('concierge-ops')
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'concierge_jobs'
  }, (payload) => {
    console.log('Job updated:', payload.new.creator_name, payload.new.status)
    // refresh dashboard row
  })
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'clips',
    filter: 'render_status=eq.complete'
  }, (payload) => {
    console.log('Clip rendered:', payload.new.id)
  })
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'feedback',
    filter: 'feedback_type=eq.csat'
  }, (payload) => {
    console.log('CSAT received from pilot:', payload.new.pilot_id)
  })
  .subscribe()
```

---

## Team Coordination Workflow

### When episode is received (operator):
```sql
update concierge_jobs
set status = 'intake',
    episode_url = '<URL>',
    episode_title = '<TITLE>',
    intake_at = now()
where creator_email = '<email>';
```

### When transcription starts:
```sql
update concierge_jobs
set status = 'transcribing',
    transcribe_start_at = now()
where id = '<job_id>';
```

### When clips are rendered:
```sql
-- Update job status
update concierge_jobs 
set status = 'qa', render_end_at = now(), clips_delivered = 3
where id = '<job_id>';

-- Update individual clips
update clips
set render_status = 'complete',
    file_url = '<url>',
    file_size_kb = <size>,
    heuristic_score = <score>,
    heuristic_signals = ARRAY['HOOK_OPENING', 'NARRATIVE_PEAK'],
    title = '<title>',
    hashtags = ARRAY['#Podcast', '#ContentCreator']
where job_id = '<job_id>' and clip_index = 1;
```

### When creator responds with stats:
```sql
-- Insert performance feedback
insert into feedback (job_id, pilot_id, feedback_type, platform, metric_name, value_before, value_after, submitted_by)
values ('<job_id>', '<pilot_id>', 'performance', 'YouTube Shorts', 'views', 142, 284, 'creator');

-- Insert CSAT
update feedback
set q1_clip_quality = 4, q2_right_moments = 5, q3_would_post = 4,
    q4_change_request = 'Make captions bigger',
    q5_pay_monthly = true,
    permission_to_share = true
where job_id = '<job_id>' and feedback_type = 'csat';
```

---

## Connection Info

- **REST API:** `https://twctmwwqxvenvieijmtn.supabase.co/rest/v1/`
- **Realtime WS:** `wss://twctmwwqxvenvieijmtn.supabase.co/realtime/v1`
- **Dashboard:** https://supabase.com/dashboard/project/twctmwwqxvenvieijmtn
- **Table editor:** /table-editor (for manual updates during concierge phase)
