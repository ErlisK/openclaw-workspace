import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      event,
      session_id, page_path,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      referrer, user_agent,
    } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    if (event === 'page_view') {
      await supabase.from('page_views').insert([{
        session_id: session_id ?? null,
        page_path: page_path ?? '/',
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        utm_campaign: utm_campaign ?? null,
        utm_content: utm_content ?? null,
        utm_term: utm_term ?? null,
        referrer: referrer ?? null,
        user_agent: user_agent ? user_agent.substring(0, 512) : null,
      }])
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Track error:', err)
    return NextResponse.json({ success: true }) // silent fail always
  }
}
