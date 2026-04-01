/**
 * Generated Supabase TypeScript types (database schema)
 * In a real project: run `supabase gen types typescript --local > lib/database.types.ts`
 * This is the hand-authored version matching migrations/001_initial_schema.sql
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          status: "active" | "completed" | "deleted";
          priority: "high" | "medium" | "low";
          list: "today" | "backlog";
          sort_order: number;
          focus_slot: 1 | 2 | 3 | null;
          created_at: string;
          completed_at: string | null;
          deleted_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          status?: "active" | "completed" | "deleted";
          priority?: "high" | "medium" | "low";
          list?: "today" | "backlog";
          sort_order?: number;
          focus_slot?: 1 | 2 | 3 | null;
          created_at?: string;
          completed_at?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          text?: string;
          status?: "active" | "completed" | "deleted";
          priority?: "high" | "medium" | "low";
          list?: "today" | "backlog";
          sort_order?: number;
          focus_slot?: 1 | 2 | 3 | null;
          completed_at?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: number;
          user_id: string | null;
          session_id: string;
          event: string;
          ts: string;
          properties: Json;
        };
        Insert: {
          user_id?: string | null;
          session_id: string;
          event: string;
          ts?: string;
          properties?: Json;
        };
        Update: never; // events are immutable
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          last_seen_at: string;
          user_agent: string | null;
          active_tasks_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at?: string;
          last_seen_at?: string;
          user_agent?: string | null;
          active_tasks_count?: number;
        };
        Update: {
          last_seen_at?: string;
          active_tasks_count?: number;
        };
      };
    };
    Views: {
      v_hypothesis_summary: {
        Row: {
          user_id: string;
          h1_median_sec: number | null;
          h1_status: "PASS" | "FAIL";
          h2_kb_pct: number | null;
          h2_status: "PASS" | "FAIL";
          h3_error_pct: number | null;
          h3_status: "PASS" | "FAIL";
          overall_status: "ALL_PASS" | "IN_PROGRESS";
        };
      };
      v_activation_funnel: {
        Row: {
          step1_sessions: number;
          step2_created: number;
          step3_completed: number;
          create_rate_pct: number | null;
          complete_rate_pct: number | null;
        };
      };
    };
    Functions: Record<string, never>;
  };
}
