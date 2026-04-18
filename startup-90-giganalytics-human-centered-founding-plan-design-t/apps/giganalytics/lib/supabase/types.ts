// Database type definitions for GigAnalytics
// Auto-reflect of Supabase schema — update when schema changes

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          timezone: string
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          currency: string
          default_hourly_rate: number | null
          work_hours_per_week: number
          benchmark_opted_in: boolean
          ai_insights_enabled: boolean
          notification_prefs: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>
      }
      streams: {
        Row: {
          id: string
          user_id: string
          name: string
          platform: string | null
          color: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['streams']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['streams']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          stream_id: string | null
          amount: number
          net_amount: number | null
          fee_amount: number
          currency: string
          description: string | null
          transaction_date: string
          source_platform: string | null
          source_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          stream_id: string | null
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          entry_type: string
          note: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['time_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['time_entries']['Insert']>
      }
      user_goals: {
        Row: {
          id: string
          user_id: string
          monthly_target: number | null
          hourly_target: number | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_goals']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['user_goals']['Insert']>
      }
      acquisition_costs: {
        Row: {
          id: string
          user_id: string
          stream_id: string | null
          channel: string
          amount: number
          period_start: string
          period_end: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['acquisition_costs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['acquisition_costs']['Insert']>
      }
      experiments: {
        Row: {
          id: string
          user_id: string
          stream_id: string | null
          name: string
          hypothesis: string | null
          variant_a_rate: number
          variant_b_rate: number
          status: 'draft' | 'running' | 'paused' | 'completed'
          started_at: string | null
          ended_at: string | null
          winner: 'a' | 'b' | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['experiments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['experiments']['Insert']>
      }
      recommendations: {
        Row: {
          id: string
          user_id: string
          stream_id: string | null
          category: 'rate' | 'time' | 'acquisition' | 'benchmark' | 'general'
          title: string
          body: string
          impact_estimate: string | null
          cta_label: string | null
          cta_url: string | null
          dismissed: boolean
          acted_on: boolean
          generated_at: string
          expires_at: string | null
          metadata: Json
        }
        Insert: Omit<Database['public']['Tables']['recommendations']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['recommendations']['Insert']>
      }
      benchmark_opt_ins: {
        Row: {
          id: string
          user_id: string
          opted_in_at: string
          opted_out_at: string | null
          is_active: boolean
          service_category: string | null
          experience_years_range: string | null
          region: string | null
          rate_bucket: string | null
          consent_version: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['benchmark_opt_ins']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['benchmark_opt_ins']['Insert']>
      }
      benchmark_snapshots: {
        Row: {
          id: string
          user_id: string
          snapshot_month: string
          service_category: string
          region: string | null
          p25_rate: number | null
          p50_rate: number | null
          p75_rate: number | null
          p90_rate: number | null
          sample_size: number | null
          user_effective_rate: number | null
          user_percentile: number | null
          generated_at: string
        }
        Insert: Omit<Database['public']['Tables']['benchmark_snapshots']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['benchmark_snapshots']['Insert']>
      }
    }
  }
}
