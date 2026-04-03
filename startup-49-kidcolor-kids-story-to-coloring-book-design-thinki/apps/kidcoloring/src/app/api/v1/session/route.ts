import { buildPrompts } from '@/lib/prompts'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// POST /api/v1/session — create a new trial session
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    concept: 'interest-packs' | 'story-to-book'
    config: Record<string, unknown>
    sessionToken?: string
  }

  const { concept, config } = body
  if (!concept || !['interest-packs', 'story-to-book'].includes(concept)) {
    return NextResponse.json({ error: 'concept required' }, { status: 400 })
  }

  const sb = getAdmin()

  // Build prompts from config
  const prompts = buildPrompts(concept, config)

  const { data: session, error } = await sb
    .from('trial_sessions')
    .insert({ concept, config, page_count: prompts.length })
    .select('id, session_token, share_slug')
    .single()

  if (error || !session) {
    return NextResponse.json({ error: error?.message || 'insert failed' }, { status: 500 })
  }

  // Insert placeholder page rows
  const pageRows = prompts.map((p, i) => ({
    session_id: session.id,
    page_number: i + 1,
    sort_order: i,
    prompt: p.prompt,
    subject: p.subject,
    status: 'pending' as const,
  }))
  await sb.from('trial_pages').insert(pageRows)

  // Log event
  await sb.from('events').insert({
    event_name: 'session_created',
    session_id: session.session_token,
    properties: { concept, page_count: prompts.length },
  })

  return NextResponse.json({
    sessionId: session.id,
    sessionToken: session.session_token,
    shareSlug: session.share_slug,
    prompts: prompts.map(p => ({ subject: p.subject, imageUrl: null })),
  })
}
