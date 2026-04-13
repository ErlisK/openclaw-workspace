export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── Job status ───────────────────────────────────────────────────────────────
export type JobStatus =
  | 'intake'
  | 'transcribing'
  | 'scoring'
  | 'rendering'
  | 'qa'
  | 'delivered'
  | 'posted'
  | 'feedback_recv'
  | 'complete'
  | 'cancelled'
  | 'error'

export type RenderStatus = 'pending' | 'rendering' | 'complete' | 'failed'

// ─── Database row shapes ──────────────────────────────────────────────────────
export interface Job {
  id: string
  pilot_id: string | null
  creator_name: string
  creator_email: string
  creator_niche: string | null
  creator_type: string | null
  episode_url: string | null
  episode_title: string | null
  episode_duration_min: number | null
  target_platforms: string[]
  status: JobStatus
  intake_at: string | null
  transcribe_start_at: string | null
  transcribe_end_at: string | null
  render_start_at: string | null
  render_end_at: string | null
  delivered_at: string | null
  tat_hours: number | null
  transcription_cost_usd: number
  render_cost_usd: number
  ai_cost_usd: number
  total_cost_usd: number | null
  clips_requested: number
  clips_delivered: number
  delivery_url: string | null
  template_id: string | null
  heuristic_version: string | null
  operator_notes: string | null
  created_at: string
  updated_at: string
}

export interface Clip {
  id: string
  job_id: string
  pilot_id: string | null
  clip_index: number
  platform: string
  template_id: string | null
  source_start_sec: number | null
  source_end_sec: number | null
  duration_sec: number | null
  heuristic_score: number | null
  heuristic_signals: string[]
  was_fallback: boolean
  caption_style: string | null
  transcript_excerpt: string | null
  title: string | null
  hashtags: string[]
  hook_type: string | null
  render_status: RenderStatus
  render_duration_sec: number | null
  file_path: string | null
  file_url: string | null
  file_size_kb: number | null
  resolution: string
  qa_approved: boolean | null
  qa_notes: string | null
  creator_approved: boolean | null
  posted_url: string | null
  views_48h: number | null
  completion_rate_pct: number | null
  created_at: string
  updated_at: string
}

export interface TemplateVariant {
  id: string
  template_id: string
  name: string
  version: string
  preset_label: string | null
  use_cases: string[]
  platforms: string[]
  caption_style_id: string | null
  caption_font: string | null
  caption_font_size: number | null
  caption_max_words: number | null
  has_lower_third: boolean
  has_progress_bar: boolean
  has_waveform: boolean
  bg_type: string | null
  thumbnail_style: string | null
  is_active: boolean
  is_default: boolean
  times_used: number
  avg_views_48h: number | null
}

export interface Feedback {
  id: string
  job_id: string
  pilot_id: string | null
  clip_id: string | null
  feedback_type: 'csat' | 'performance' | 'qualitative' | 'style_choice' | 'change_request'
  q1_clip_quality: number | null
  q2_right_moments: number | null
  q3_would_post: number | null
  q4_change_request: string | null
  q5_pay_monthly: boolean | null
  overall_score: number | null
  platform: string | null
  metric_name: string | null
  value_before: number | null
  value_after: number | null
  delta_pct: number | null
  feedback_text: string | null
  permission_to_share: boolean
  created_at: string
}

// ─── API types ────────────────────────────────────────────────────────────────
export interface CreateJobPayload {
  creator_name: string
  creator_email: string
  creator_niche?: string
  episode_url?: string
  episode_title?: string
  episode_duration_min?: number
  target_platforms: string[]
  clips_requested?: number
  template_id?: string
}

export interface JobStatusBoard {
  id: string
  creator_name: string
  creator_niche: string | null
  status: JobStatus
  clips_requested: number
  clips_delivered: number
  intake_at: string | null
  delivered_at: string | null
  tat_hours: number | null
  total_cost_usd: number | null
  template_id: string | null
  clip_count: number
  clips_rendered: number
  clips_qa_passed: number
  avg_heuristic_score: number | null
}
