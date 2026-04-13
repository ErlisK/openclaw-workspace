import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/quotes — submit a quote from a pro
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const body = await req.json()
  const {
    project_id,
    pro_email,
    pro_name,
    quote_amount,
    timeline_days,
    scope,
    notes,
    packet_review_notes,
  } = body

  if (!project_id || !pro_email || !quote_amount) {
    return NextResponse.json({ error: 'project_id, pro_email, and quote_amount required' }, { status: 400 })
  }

  // Look up pro record
  const { data: proData } = await supabase
    .from('pros')
    .select('id, name, email')
    .eq('email', pro_email)
    .single()

  // Insert quote
  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      project_id,
      pro_id: proData?.id ?? null,
      pro_email,
      pro_name: pro_name ?? proData?.name ?? pro_email,
      quote_amount,
      timeline_days: timeline_days ?? null,
      scope: scope ?? null,
      notes: notes ?? null,
      packet_review_notes: packet_review_notes ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit: log quote submission
  await supabase.rpc('log_audit_event', {
    p_action: 'quote.submitted',
    p_entity_type: 'quote',
    p_entity_id: quote.id,
    p_actor_email: pro_email,
    p_actor_role: 'pro',
    p_meta: { project_id, quote_amount, timeline_days, scope }
  })

  // Update project status
  await supabase
    .from('projects')
    .update({ status: 'quoted', updated_at: new Date().toISOString() })
    .eq('id', project_id)

  // Create first message in thread
  await supabase.from('messages').insert({
    project_id,
    quote_id: quote.id,
    sender_email: pro_email,
    sender_role: 'pro',
    body: `Hi! I've reviewed your ADU project at ${scope ? 'the address' : 'your property'}. ` +
      `I'm quoting $${quote_amount.toLocaleString()} ` +
      (timeline_days ? `with an estimated ${timeline_days}-day timeline` : '') +
      (scope ? `.\n\nScope: ${scope}` : '.') +
      (notes ? `\n\nAdditional notes: ${notes}` : ''),
  })

  // Notify homeowner
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('homeowner_email, address')
      .eq('id', project_id)
      .single()

    if (project?.homeowner_email) {
      await fetch(`https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AGENTMAIL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [project.homeowner_email],
          subject: `💼 You have a new quote for your ADU at ${project.address}`,
          text: `Good news! ${pro_name ?? pro_email} has submitted a quote for your ADU project.\n\n` +
            `Quote Amount: $${Number(quote_amount).toLocaleString()}\n` +
            (timeline_days ? `Estimated Timeline: ${timeline_days} days\n` : '') +
            (scope ? `Scope: ${scope}\n` : '') +
            `\nLog in to review the quote and the AI-generated permit packet draft:\n` +
            `https://startup-73-expeditehub-lean-startup.vercel.app/project/${project_id}\n\n` +
            `Your AI-assisted permit packet has also been prepared. Reply to this email with any questions.`,
        }),
      })
    }
  } catch { /* notification non-critical */ }

  return NextResponse.json({
    success: true,
    quote_id: quote.id,
    project_id,
    quote_amount,
  })
}

// GET /api/quotes?project_id=... — list quotes for a project
export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const project_id = req.nextUrl.searchParams.get('project_id')
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ quotes: data ?? [] })
}
