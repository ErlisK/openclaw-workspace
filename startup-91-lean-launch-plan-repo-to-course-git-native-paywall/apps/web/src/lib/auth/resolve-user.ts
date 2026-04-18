import { type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Resolve the authenticated user from either:
 * 1. Supabase SSR cookie session (browser navigation)
 * 2. Authorization: Bearer <token> header (API calls, tests)
 *
 * Returns null if no valid session found.
 */
export async function resolveUser(req: NextRequest): Promise<{ id: string; email?: string } | null> {
  // Try cookie-based session first (SSR)
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  // Fallback to Bearer token
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken) {
      const serviceSupa = createServiceClient();
      const { data: { user: tokenUser } } = await serviceSupa.auth.getUser(bearerToken);
      if (tokenUser) return tokenUser;
    }
  }

  return null;
}
