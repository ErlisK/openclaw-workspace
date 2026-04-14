/**
 * getSupabaseClient — picks the right Supabase client based on auth method.
 *
 * Route handlers call this to support both:
 *  - Cookie-based auth (browser sessions)
 *  - Bearer token auth (API calls from tests, external clients)
 */
import { NextRequest } from 'next/server'
import { createClient, createClientFromRequest } from '@/lib/supabase/server'

export async function getSupabaseClient(req?: NextRequest) {
  if (req) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return createClientFromRequest(req)
    }
  }
  return createClient()
}
