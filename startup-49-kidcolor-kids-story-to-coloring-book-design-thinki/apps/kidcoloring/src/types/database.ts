export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
export type Json = JsonValue

export interface Database {
  public: {
    Tables: {
      research_snippets: {
        Row: {
          id: string
          created_at: string
          source_url: string
          source_type: string
          content: string
          theme: string
          sub_theme: string | null
          sentiment: string | null
          age_group: string | null
          platform: string | null
          keyword: string | null
          relevance_score: number | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          source_url: string
          source_type: string
          content: string
          theme: string
          sub_theme?: string | null
          sentiment?: string | null
          age_group?: string | null
          platform?: string | null
          keyword?: string | null
          relevance_score?: number | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          source_url?: string
          source_type?: string
          content?: string
          theme?: string
          sub_theme?: string | null
          sentiment?: string | null
          age_group?: string | null
          platform?: string | null
          keyword?: string | null
          relevance_score?: number | null
          metadata?: Json | null
        }
      }
      comp_matrix: {
        Row: {
          id: string
          created_at: string
          product_name: string
          url: string
          category: string
          pricing_model: string | null
          price_low: number | null
          price_high: number | null
          has_ai_generation: boolean
          has_custom_stories: boolean
          has_coloring_feature: boolean
          has_print_export: boolean
          has_mobile_app: boolean
          target_age_min: number | null
          target_age_max: number | null
          monthly_visits_est: number | null
          app_store_rating: number | null
          app_store_reviews: number | null
          line_art_quality: string | null
          notes: string | null
          screenshot_url: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          product_name: string
          url: string
          category: string
          pricing_model?: string | null
          price_low?: number | null
          price_high?: number | null
          has_ai_generation?: boolean
          has_custom_stories?: boolean
          has_coloring_feature?: boolean
          has_print_export?: boolean
          has_mobile_app?: boolean
          target_age_min?: number | null
          target_age_max?: number | null
          monthly_visits_est?: number | null
          app_store_rating?: number | null
          app_store_reviews?: number | null
          line_art_quality?: string | null
          notes?: string | null
          screenshot_url?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          product_name?: string
          url?: string
          category?: string
          pricing_model?: string | null
          price_low?: number | null
          price_high?: number | null
          has_ai_generation?: boolean
          has_custom_stories?: boolean
          has_coloring_feature?: boolean
          has_print_export?: boolean
          has_mobile_app?: boolean
          target_age_min?: number | null
          target_age_max?: number | null
          monthly_visits_est?: number | null
          app_store_rating?: number | null
          app_store_reviews?: number | null
          line_art_quality?: string | null
          notes?: string | null
          screenshot_url?: string | null
          metadata?: Json | null
        }
      }
      search_intent: {
        Row: {
          id: string
          created_at: string
          query: string
          category: string
          monthly_volume_est: number | null
          competition: string | null
          seasonality_peak: string | null
          intent_type: string | null
          priority_score: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          query: string
          category: string
          monthly_volume_est?: number | null
          competition?: string | null
          seasonality_peak?: string | null
          intent_type?: string | null
          priority_score?: number | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          query?: string
          category?: string
          monthly_volume_est?: number | null
          competition?: string | null
          seasonality_peak?: string | null
          intent_type?: string | null
          priority_score?: number | null
          notes?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
