import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/templates/[id]/tip
 * 
 * Send community credits to a template creator.
 * Body: { credits: 1-10, message?: string }
 * 
 * - Deducts credits from tipper's wallet
 * - Adds credits to creator's wallet
 * - Updates template tip_count + total_tips_received
 * - Upserts (one tip per template per user, can increase amount)
 * - Returns new balances
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const credits = Math.max(1, Math.min(50, parseInt(body.credits) || 1))
  const message = typeof body.message === 'string' ? body.message.slice(0, 200) : null

  const svc = createServiceClient()

  // Check template exists and get creator
  const { data: template } = await svc
    .from('templates')
    .select('id, name, created_by, creator_display_name')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  // Can't tip yourself
  if (template.created_by && template.created_by === user.id) {
    return NextResponse.json({ error: "Can't tip your own template" }, { status: 400 })
  }

  // Check tipper balance (or give free credits to new users)
  const { data: tipperWallet } = await svc
    .from('creator_credits')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  // New user: give 20 free credits
  if (!tipperWallet) {
    await svc.from('creator_credits').insert({
      user_id: user.id,
      balance: 20,
      total_earned: 20,
      total_spent: 0,
    })
  }

  const currentBalance = tipperWallet?.balance ?? 20
  if (currentBalance < credits) {
    return NextResponse.json({
      error: 'Insufficient credits',
      balance: currentBalance,
      credits_needed: credits,
      earn_credits_url: '/settings#credits',
    }, { status: 402 })
  }

  // Check if already tipped (to calculate delta)
  const { data: existingTip } = await svc
    .from('template_tips')
    .select('id, credits')
    .eq('template_id', id)
    .eq('tipper_id', user.id)
    .maybeSingle()

  const prevCredits = existingTip?.credits ?? 0
  const delta = credits - prevCredits

  if (delta <= 0) {
    return NextResponse.json({ error: 'New tip must exceed previous tip amount', previous_tip: prevCredits }, { status: 400 })
  }

  // Deduct from tipper
  await svc.from('creator_credits').upsert({
    user_id: user.id,
    balance: currentBalance - delta,
    total_earned: tipperWallet?.balance ?? 20,
    total_spent: (20 - currentBalance) + delta,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Add to creator wallet
  if (template.created_by) {
    const { data: creatorWallet } = await svc
      .from('creator_credits')
      .select('balance, total_earned')
      .eq('user_id', template.created_by)
      .single()

    await svc.from('creator_credits').upsert({
      user_id: template.created_by,
      balance: (creatorWallet?.balance ?? 0) + delta,
      total_earned: (creatorWallet?.total_earned ?? 0) + delta,
      total_spent: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  // Record/update tip
  if (existingTip) {
    await svc.from('template_tips')
      .update({ credits, message, created_at: new Date().toISOString() })
      .eq('id', existingTip.id)
  } else {
    await svc.from('template_tips').insert({
      template_id: id,
      tipper_id: user.id,
      creator_id: template.created_by || null,
      credits,
      message,
    })
  }

  // Update template aggregates
  await svc.from('templates').update({
    tip_count: (template as any).tip_count + (existingTip ? 0 : 1),
    total_tips_received: (template as any).total_tips_received + delta,
  }).eq('id', id)

  return NextResponse.json({
    ok: true,
    credits_sent: credits,
    delta,
    template_name: template.name,
    creator: template.creator_display_name || (template.created_by ? 'Community Creator' : 'ClipSpark Team'),
    tipper_new_balance: currentBalance - delta,
    message: `Tipped ${credits} credit${credits !== 1 ? 's' : ''} to ${template.name}! 🎉`,
  })
}

/**
 * GET /api/templates/[id]/tip
 * Returns tip stats for a template
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()
  const { data: template } = await svc
    .from('templates')
    .select('tip_count, total_tips_received')
    .eq('id', id)
    .single()

  let myTip = null
  if (user) {
    const { data } = await svc
      .from('template_tips')
      .select('credits, message, created_at')
      .eq('template_id', id)
      .eq('tipper_id', user.id)
      .maybeSingle()
    myTip = data
  }

  // Recent tippers (anonymous)
  const { data: recentTips } = await svc
    .from('template_tips')
    .select('credits, message, created_at')
    .eq('template_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    tip_count: template?.tip_count ?? 0,
    total_tips: template?.total_tips_received ?? 0,
    my_tip: myTip,
    recent_tips: recentTips || [],
  })
}
