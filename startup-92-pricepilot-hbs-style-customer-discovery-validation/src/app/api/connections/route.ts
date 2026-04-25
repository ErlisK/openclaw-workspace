/**
 * GET  /api/connections  — list connected payment providers for the authed user
 * POST /api/connections  — initiate a new provider connection
 *
 * Requires authentication. Returns 401 if no valid session.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

export async function GET() {
  const { user, supabase } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('connections')
    .select('id, provider, created_at, status, last_sync_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connections: data ?? [] })
}

export async function POST(request: Request) {
  const { user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const provider = typeof body.provider === 'string' ? body.provider : ''
  if (!['stripe', 'gumroad', 'shopify', 'csv'].includes(provider)) {
    return NextResponse.json(
      { error: 'provider must be one of: stripe, gumroad, shopify, csv' },
      { status: 400 }
    )
  }

  // Return the OAuth/setup URL for the chosen provider
  const setupUrls: Record<string, string> = {
    stripe:  '/connections/stripe',
    gumroad: '/connections/gumroad',
    shopify: '/connections/shopify',
    csv:     '/import',
  }

  return NextResponse.json({ provider, setup_url: setupUrls[provider] })
}
