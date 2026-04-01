/**
 * Supabase client — browser + server
 *
 * Environment variables required (add to .env.local + Vercel dashboard):
 *   NEXT_PUBLIC_SUPABASE_URL       = https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJhbGci...
 *
 * The anon key is safe to expose client-side; RLS policies enforce data isolation.
 * NEVER expose the service_role key client-side.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Browser-safe client (uses anon key, respects RLS)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Returns true if Supabase is configured (env vars present).
 * When false, the app falls back to localStorage-only mode.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
