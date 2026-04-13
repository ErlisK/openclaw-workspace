import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/connect/status — returns which OAuth providers are connected
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: connections } = await supabase
    .from('oauth_connections')
    .select('provider, provider_username, token_expires_at')
    .eq('user_id', user.id)

  const status: Record<string, { connected: boolean; username: string | null; expired?: boolean }> = {
    youtube: { connected: false, username: null },
    linkedin: { connected: false, username: null },
  }

  for (const conn of (connections || [])) {
    const expired = conn.token_expires_at
      ? new Date(conn.token_expires_at) < new Date()
      : false
    status[conn.provider] = {
      connected: !expired,
      username: conn.provider_username || null,
      expired,
    }
  }

  return NextResponse.json(status)
}

// DELETE /api/connect/status?provider=youtube — disconnect a provider
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')
  if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 })

  await supabase
    .from('oauth_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)

  return NextResponse.json({ ok: true })
}
