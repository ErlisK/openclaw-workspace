-- ClipSpark Concierge Operations Schema v0.1
-- Tables: concierge_jobs, clips, template_variants, feedback
-- Run via: supabase management API /database/query

-- ─── 1. concierge_jobs ────────────────────────────────────────────────────────
-- One row per creator engagement. Tracks the full lifecycle from intake to delivery.

create table if not exists concierge_jobs (
  id                  uuid primary key default gen_random_uuid(),

  -- Creator linkage
  pilot_id            uuid references concierge_pilot(id) on delete set null,
  creator_name        text not null,
  creator_email       text not null,
  creator_niche       text,                        -- business, comedy, fitness, etc.
  creator_type        text,                        -- Solo Podcaster, Coach, etc.

  -- Episode info
  episode_url         text,                        -- submitted link or storage path
  episode_title       text,
  episode_duration_min numeric,
  target_platforms    text[] default '{}',         -- ['TikTok', 'LinkedIn', ...]

  -- Job status lifecycle
  status              text not null default 'intake'
                      check (status in (
                        'intake',         -- episode link/file received
                        'transcribing',   -- Whisper in progress
                        'scoring',        -- heuristic scoring running
                        'rendering',      -- FFmpeg clips being made
                        'qa',             -- operator reviewing clips
                        'delivered',      -- clips sent to creator
                        'posted',         -- creator confirmed posting
                        'feedback_recv',  -- CSAT + stats received
                        'complete',       -- all data collected
                        'cancelled'
                      )),

  -- Timing / TAT tracking
  intake_at           timestamptz,
  transcribe_start_at timestamptz,
  transcribe_end_at   timestamptz,
  render_start_at     timestamptz,
  render_end_at       timestamptz,
  qa_start_at         timestamptz,
  delivered_at        timestamptz,
  tat_hours           numeric generated always as (
                        extract(epoch from (delivered_at - intake_at)) / 3600
                      ) stored,

  -- Cost tracking
  transcription_cost_usd  numeric default 0,
  render_cost_usd         numeric default 0,
  ai_cost_usd             numeric default 0,
  total_cost_usd          numeric generated always as (
                            coalesce(transcription_cost_usd,0) +
                            coalesce(render_cost_usd,0) +
                            coalesce(ai_cost_usd,0)
                          ) stored,

  -- Output
  clips_requested     integer default 3,
  clips_delivered     integer default 0,
  delivery_url        text,                        -- Google Drive or zip URL
  delivery_email_sent boolean default false,

  -- Template used
  template_id         text,                        -- references template_variants.template_id
  heuristic_version   text default 'v0.1',

  -- Notes
  operator_notes      text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger concierge_jobs_updated_at
  before update on concierge_jobs
  for each row execute function update_updated_at_column();

-- Index for status filtering (team dashboard queries)
create index if not exists idx_concierge_jobs_status on concierge_jobs(status);
create index if not exists idx_concierge_jobs_pilot_id on concierge_jobs(pilot_id);
create index if not exists idx_concierge_jobs_created_at on concierge_jobs(created_at desc);


-- ─── 2. clips ─────────────────────────────────────────────────────────────────
-- One row per individual clip produced within a job.

create table if not exists clips (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid references concierge_jobs(id) on delete cascade,
  pilot_id            uuid references concierge_pilot(id) on delete set null,

  -- Clip metadata
  clip_index          integer not null,            -- 1, 2, 3 within this job
  platform            text not null,               -- TikTok, LinkedIn, YouTube Shorts, etc.
  template_id         text,                        -- which template was used

  -- Source timing
  source_start_sec    numeric,
  source_end_sec      numeric,
  duration_sec        numeric generated always as (
                        source_end_sec - source_start_sec
                      ) stored,

  -- Heuristic scoring
  heuristic_score     integer,
  heuristic_signals   text[],                      -- ['HOOK_OPENING', 'NARRATIVE_PEAK', ...]
  was_fallback        boolean default false,        -- true if time-spaced fallback, not heuristic

  -- Caption info
  caption_style       text,                        -- bold_white_outline, yellow_highlight, etc.
  caption_word_count  integer,
  transcript_excerpt  text,                        -- first 200 chars of clip transcript

  -- Generated content
  title               text,
  hashtags            text[],
  hook_type           text,                        -- contrarian, story, stat, etc.

  -- Render output
  render_status       text default 'pending'
                      check (render_status in ('pending','rendering','complete','failed')),
  render_duration_sec numeric,                     -- wall-clock render time
  file_path           text,                        -- local path during processing
  file_url            text,                        -- final delivery URL
  file_size_kb        integer,
  resolution          text default '1080x1920',
  codec               text default 'h264',

  -- QA
  qa_approved         boolean,
  qa_notes            text,
  qa_by               text,

  -- Creator feedback on this specific clip
  creator_approved    boolean,                     -- "would you post this?"
  creator_change_req  text,                        -- what they'd change

  -- Performance (filled after posting)
  posted_url          text,                        -- live URL once published
  views_48h           integer,
  completion_rate_pct numeric,
  engagement_rate_pct numeric,
  saves               integer,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create trigger clips_updated_at
  before update on clips
  for each row execute function update_updated_at_column();

create index if not exists idx_clips_job_id on clips(job_id);
create index if not exists idx_clips_pilot_id on clips(pilot_id);
create index if not exists idx_clips_render_status on clips(render_status);
create index if not exists idx_clips_platform on clips(platform);


-- ─── 3. template_variants ──────────────────────────────────────────────────────
-- Registry of every template version used. Supports A/B tracking.

create table if not exists template_variants (
  id                  uuid primary key default gen_random_uuid(),
  template_id         text not null unique,        -- 'podcast-pro-v02', 'tiktok-native-v02'
  name                text not null,               -- human label
  version             text not null,               -- '0.2', '0.3', etc.
  schema_version      text default 'v0.2',

  -- Classification
  preset_label        text,                        -- 'Podcast Pro', 'TikTok Native', 'LinkedIn Pro'
  use_cases           text[],
  platforms           text[],
  niche_map           text[],                      -- which niches this is preferred for

  -- Visual config (flattened key fields for dashboard queries)
  caption_style_id    text,                        -- 'bold_white_outline', 'yellow_highlight', etc.
  caption_font        text,
  caption_font_size   integer,
  caption_max_words   integer,
  caption_highlight   text,                        -- 'keyword_color', 'last_word_color', 'none'
  has_lower_third     boolean default true,
  has_progress_bar    boolean default true,
  has_waveform        boolean default false,
  bg_type             text,                        -- 'gradient', 'solid'
  bg_primary_color    text,
  thumbnail_style     text,

  -- Full JSON spec (the source of truth for renderer)
  full_spec           jsonb,

  -- Usage tracking
  times_used          integer default 0,
  times_qa_approved   integer default 0,
  times_creator_chose integer default 0,
  avg_heuristic_score numeric,
  avg_views_48h       numeric,
  avg_completion_rate numeric,

  -- Status
  is_active           boolean default true,
  is_default          boolean default false,
  deprecated_at       timestamptz,
  deprecation_reason  text,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create trigger template_variants_updated_at
  before update on template_variants
  for each row execute function update_updated_at_column();

create index if not exists idx_template_variants_preset on template_variants(preset_label);
create index if not exists idx_template_variants_active on template_variants(is_active);


-- ─── 4. feedback ──────────────────────────────────────────────────────────────
-- Structured feedback per job or per clip. Merges CSAT + performance + qualitative.

create table if not exists feedback (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid references concierge_jobs(id) on delete cascade,
  pilot_id            uuid references concierge_pilot(id) on delete set null,
  clip_id             uuid references clips(id) on delete set null,  -- null = job-level feedback

  feedback_type       text not null
                      check (feedback_type in (
                        'csat',           -- structured 1-5 survey
                        'performance',    -- view/engagement stats
                        'qualitative',    -- free-form comment
                        'style_choice',   -- which template/style they chose
                        'change_request'  -- specific ask for the next clips
                      )),

  -- CSAT fields (feedback_type = 'csat')
  q1_clip_quality     integer check (q1_clip_quality between 1 and 5),
  q2_right_moments    integer check (q2_right_moments between 1 and 5),
  q3_would_post       integer check (q3_would_post between 1 and 5),
  q4_change_request   text,
  q5_pay_monthly      boolean,
  overall_score       numeric generated always as (
                        (coalesce(q1_clip_quality,0) +
                         coalesce(q2_right_moments,0) +
                         coalesce(q3_would_post,0)) / 3.0
                      ) stored,

  -- Performance fields (feedback_type = 'performance')
  platform            text,
  metric_name         text,                        -- 'views', 'completion_rate', etc.
  value_before        numeric,
  value_after         numeric,
  delta_pct           numeric generated always as (
                        case when value_before > 0
                          then ((value_after - value_before) / value_before) * 100
                          else null
                        end
                      ) stored,
  measurement_date    date,

  -- Style choice fields (feedback_type = 'style_choice')
  caption_style_chosen   text,
  thumbnail_style_chosen text,
  hook_style_chosen      text,

  -- Qualitative / change request
  feedback_text       text,
  sentiment           text check (sentiment in ('positive', 'neutral', 'negative', null)),

  -- Attribution
  submitted_by        text,                        -- 'creator', 'operator', 'auto'
  screenshot_url      text,
  permission_to_share boolean default false,
  share_name_public   boolean default false,       -- can we use their real name?

  created_at          timestamptz default now()
);

create index if not exists idx_feedback_job_id on feedback(job_id);
create index if not exists idx_feedback_pilot_id on feedback(pilot_id);
create index if not exists idx_feedback_type on feedback(feedback_type);
create index if not exists idx_feedback_clip_id on feedback(clip_id);


-- ─── 5. Realtime: enable publication on all 4 tables ─────────────────────────
-- Supabase Realtime listens to Postgres logical replication.
-- Add tables to the supabase_realtime publication.

alter publication supabase_realtime add table concierge_jobs;
alter publication supabase_realtime add table clips;
alter publication supabase_realtime add table template_variants;
alter publication supabase_realtime add table feedback;


-- ─── 6. Views for dashboard ──────────────────────────────────────────────────

-- Dashboard: job status overview
create or replace view v_job_status_board as
select
  j.id,
  j.creator_name,
  j.creator_niche,
  j.status,
  j.clips_requested,
  j.clips_delivered,
  j.intake_at,
  j.delivered_at,
  round(j.tat_hours::numeric, 1) as tat_hours,
  j.total_cost_usd,
  j.template_id,
  j.operator_notes,
  count(c.id) as clip_count,
  count(c.id) filter (where c.render_status = 'complete') as clips_rendered,
  count(c.id) filter (where c.qa_approved = true) as clips_qa_passed,
  count(c.id) filter (where c.creator_approved = true) as clips_creator_approved,
  avg(c.heuristic_score) as avg_heuristic_score
from concierge_jobs j
left join clips c on c.job_id = j.id
group by j.id
order by j.created_at desc;


-- Dashboard: clip quality pipeline
create or replace view v_clip_pipeline as
select
  c.id,
  j.creator_name,
  c.clip_index,
  c.platform,
  c.template_id,
  c.heuristic_score,
  c.heuristic_signals,
  c.render_status,
  c.qa_approved,
  c.creator_approved,
  c.title,
  c.views_48h,
  c.completion_rate_pct,
  round(c.duration_sec::numeric, 1) as duration_sec,
  c.file_size_kb
from clips c
join concierge_jobs j on j.id = c.job_id
order by j.created_at desc, c.clip_index;


-- Dashboard: CSAT summary per job
create or replace view v_csat_summary as
select
  f.pilot_id,
  j.creator_name,
  round(avg(f.q1_clip_quality)::numeric, 2) as avg_q1_quality,
  round(avg(f.q2_right_moments)::numeric, 2) as avg_q2_moments,
  round(avg(f.q3_would_post)::numeric, 2) as avg_q3_would_post,
  count(*) filter (where f.q5_pay_monthly = true) as would_pay,
  count(*) as response_count,
  round(avg(f.overall_score)::numeric, 2) as avg_overall_score,
  count(*) filter (where f.overall_score >= 4) as csat_pass_count
from feedback f
join concierge_jobs j on j.id = f.job_id
where f.feedback_type = 'csat'
group by f.pilot_id, j.creator_name;


-- Dashboard: template performance
create or replace view v_template_performance as
select
  c.template_id,
  count(c.id) as total_clips,
  count(c.id) filter (where c.qa_approved = true) as qa_pass,
  count(c.id) filter (where c.creator_approved = true) as creator_approved,
  round(avg(c.heuristic_score)::numeric, 1) as avg_score,
  round(avg(c.views_48h)::numeric, 0) as avg_views_48h,
  round(avg(c.completion_rate_pct)::numeric, 1) as avg_completion_pct
from clips c
where c.template_id is not null
group by c.template_id
order by avg_views_48h desc nulls last;
