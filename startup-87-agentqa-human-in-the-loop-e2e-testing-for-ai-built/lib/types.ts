// Database types matching the BetaWindow schema
export type UserRole = 'client' | 'tester' | 'admin'
export type JobTier = 'quick' | 'standard' | 'deep'
export type JobStatus = 'draft' | 'published' | 'assigned' | 'complete' | 'expired' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'
export type AssignmentStatus = 'active' | 'submitted' | 'abandoned'
export type SessionStatus = 'active' | 'complete' | 'abandoned'
export type EventType = 'network_request' | 'network_response' | 'console_log' | 'click' | 'navigation' | 'screenshot' | 'custom'
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical'
export type CreditKind = 'purchase' | 'job_payment' | 'refund' | 'bonus' | 'adjustment'

export interface User {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  is_tester: boolean
  tester_bio: string | null
  tester_rate: number | null
  stripe_customer_id: string | null
  credits_balance: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  owner_id: string
  name: string
  description: string | null
  url: string | null
  created_at: string
  updated_at: string
}

export interface TestJob {
  id: string
  project_id: string | null
  client_id: string
  title: string
  url: string
  tier: JobTier
  price_cents: number
  instructions: string
  status: JobStatus
  published_at: string | null
  expires_at: string | null
  completed_at: string | null
  stripe_payment_intent_id: string | null
  payment_status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface JobAssignment {
  id: string
  job_id: string
  tester_id: string
  status: AssignmentStatus
  assigned_at: string
  submitted_at: string | null
}

export interface TestSession {
  id: string
  assignment_id: string
  job_id: string
  tester_id: string
  browser: string
  viewport_width: number
  viewport_height: number
  started_at: string
  ended_at: string | null
  recording_url: string | null
  status: SessionStatus
}

export interface SessionEvent {
  id: string
  session_id: string
  job_id: string
  event_type: EventType
  ts: string
  method: string | null
  request_url: string | null
  status_code: number | null
  response_time_ms: number | null
  request_headers: Record<string, string> | null
  response_headers: Record<string, string> | null
  request_body: string | null
  response_body: string | null
  log_level: 'log' | 'info' | 'warn' | 'error' | null
  log_message: string | null
  element_selector: string | null
  element_text: string | null
  page_url: string | null
  payload: Record<string, unknown> | null
}

export interface Feedback {
  id: string
  job_id: string
  assignment_id: string
  tester_id: string
  summary: string
  overall_rating: number | null
  bugs_found: number
  submitted_at: string
  created_at: string
}

export interface FeedbackBug {
  id: string
  feedback_id: string
  job_id: string
  title: string
  description: string
  severity: BugSeverity
  screenshot_url: string | null
  session_event_id: string | null
  created_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount_cents: number
  balance_after: number
  kind: CreditKind
  description: string | null
  job_id: string | null
  stripe_payment_intent_id: string | null
  created_at: string
}

export const TIER_CONFIG: Record<JobTier, { label: string; price_cents: number; duration_min: number; description: string }> = {
  quick:    { label: 'Quick',    price_cents: 500,  duration_min: 10, description: '~10 min exploratory test' },
  standard: { label: 'Standard', price_cents: 1000, duration_min: 20, description: '~20 min scripted flow test' },
  deep:     { label: 'Deep',     price_cents: 1500, duration_min: 30, description: '~30 min full coverage test' },
}
