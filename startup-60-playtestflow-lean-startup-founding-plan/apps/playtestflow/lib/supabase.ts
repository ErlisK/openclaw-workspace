import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Standard client (server or client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Browser client for client components (handles auth cookies)
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// ---- Types ----------------------------------------------------------------

export type UtmParams = {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  referrer?: string | null
  page_path?: string | null
  session_id?: string | null
}

export type WaitlistSignup = {
  id?: string
  email: string
  role: string
  source?: string
  consent_given?: boolean
  interview_interested?: boolean
  pricing_tier_interest?: string | null
  created_at?: string
} & UtmParams

export type InterviewCandidate = {
  id?: string
  email: string
  name?: string
  role?: string
  experience?: string
  consent_given?: boolean
  game_type?: string
  tests_per_month?: string
  current_tools?: string
  pain_summary?: string
  interview_status?: string
  interview_date?: string | null
  notes?: string | null
  created_at?: string
} & UtmParams

export type PricingClick = {
  id?: string
  tier: string
  action?: string
  referrer?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  session_id?: string | null
  created_at?: string
}

export type PageView = {
  id?: string
  session_id?: string | null
  page_path?: string
  user_agent?: string | null
  created_at?: string
} & UtmParams
