/**
 * Supabase client — browser-safe with graceful no-op when env vars absent.
 *
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are optional.
 * When missing, isSupabaseConfigured = false and the app runs in localStorage mode.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Use a lazy null pattern — only create the real client when configured.
// This prevents "supabaseUrl is required" errors during SSR/static builds.
let _client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!_client) {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    _client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

/**
 * Proxy object: all property accesses lazily initialise the real client.
 * This allows `import { supabase }` everywhere while deferring construction
 * until the first actual call — safely skipped during SSR/static rendering.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
