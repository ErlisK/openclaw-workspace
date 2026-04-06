import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier, action, referrer } = body

    if (!tier) {
      return NextResponse.json({ error: 'Tier required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await supabase.from('pricing_clicks').insert([{
      tier,
      action: action || 'cta_click',
      referrer: referrer || null,
    }])

    // Return success regardless (don't block UX on analytics failure)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Pricing click error:', err)
    return NextResponse.json({ success: true }) // silent fail
  }
}
