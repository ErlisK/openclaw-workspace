import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type WaitlistEntry = {
  id?: string
  email: string
  role: string
  source?: string
  created_at?: string
}

export type InterviewSignup = {
  id?: string
  email: string
  name?: string
  role?: string
  experience?: string
  consent_given: boolean
  created_at?: string
}
