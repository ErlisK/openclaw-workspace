// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types matching our Supabase schema
export type Competitor = {
  id: string
  name: string
  category: string
  website: string
  pricing_model: string
  notes: string
  evidence_fetched: boolean
  created_at: string
}

export type Factor = {
  id: string
  name: string
  description: string
  weight: string
  claimcheck_target_score: number
  created_at: string
}

export type Score = {
  competitor_id: string
  factor_id: string
  score: number
  evidence_url: string
  created_at: string
}

export type Interview = {
  id: string
  interviewee_role: string
  organization: string
  org_size: string
  date_conducted: string
  channel: string
  raw_notes: string
  key_pains: string[]
  jtbd: string[]
  tools_mentioned: string[]
  willingness_to_pay: string
  quotes: string[]
  themes: string[]
  phase: string
  created_at: string
}

export type PainPoint = {
  id: number
  rank: number
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  affected_personas: string[]
  complaint_quote: string
  source_platform: string
  source_url: string
  competitor_implicated: string[]
  claimcheck_response: string
  created_at: string
}
