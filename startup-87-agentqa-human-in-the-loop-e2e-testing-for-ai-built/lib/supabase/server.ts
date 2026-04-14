import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

/**
 * Create a client that accepts Bearer token from Authorization header.
 * Use in Route Handlers that need to support direct API access (e.g., from tests).
 */
export function createClientFromRequest(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          // Forward Authorization header so Supabase uses the Bearer token
          Authorization: req.headers.get('Authorization') ?? '',
        },
      },
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},  // read-only in Route Handlers called via API
      },
    }
  )
}

export function createAdminClient() {
  const { createClient: createSBClient } = require('@supabase/supabase-js')
  return createSBClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
