import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client.
 * BYPASSES ALL RLS POLICIES.
 *
 * ⚠️  Use ONLY in:
 *   - Stripe webhook handler (/api/webhooks/stripe)
 *   - Server-side admin operations (entitlement grants, refund processing)
 *
 * NEVER:
 *   - Use in client components
 *   - Expose SUPABASE_SERVICE_ROLE_KEY to the browser
 *   - Use for regular user data queries (use server.ts instead)
 */
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
