import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/discord/posts/[id]/click
 * Track a click from a Discord post (called by the recruit page when loaded via Discord link).
 * 
 * POST /api/discord/posts/[id]/signup
 * Track a signup conversion from a Discord post.
 * 
 * These are called server-side by the recruit page when ?discord_post_id= is in the URL.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params

  if (!id || !['click', 'signup'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const svc = createServiceClient()
  const field = action === 'click' ? 'clicks' : 'signups'

  const { error } = await svc.rpc('increment_discord_post_counter', {
    post_id: id,
    counter_name: field,
  })

  // Fallback if RPC not available: direct update
  if (error) {
    const { data: post } = await svc
      .from('discord_posts')
      .select(field)
      .eq('id', id)
      .single()

    if (post) {
      await svc.from('discord_posts').update({
        [field]: (post[field as keyof typeof post] as number ?? 0) + 1,
      }).eq('id', id)
    }
  }

  return NextResponse.json({ ok: true })
}
