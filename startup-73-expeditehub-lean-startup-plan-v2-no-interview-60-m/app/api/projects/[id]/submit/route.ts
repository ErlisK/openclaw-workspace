import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'submitted',
      packet_status: 'queued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify founder via email (best-effort)
  const notifyEmail = process.env.FOUNDER_EMAIL ?? 'scide-founder@agentmail.to'
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('homeowner_email, address, proposed_adu_type, zoning, has_plans, timeline')
      .eq('id', id)
      .single()

    await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AGENTMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [notifyEmail],
        subject: `🏠 New ADU Request — ${project?.address ?? id}`,
        text: `New project submitted on ExpediteHub!\n\nProject ID: ${id}\nAddress: ${project?.address}\nEmail: ${project?.homeowner_email}\nType: ${project?.proposed_adu_type}\nZoning: ${project?.zoning ?? 'TBD'}\nPlans: ${project?.has_plans ? 'Yes' : 'No'}\nTimeline: ${project?.timeline}\n\nReview at: https://semwkwwyuljgiavdmziu.supabase.co`,
      }),
    })
  } catch { /* notification is non-critical */ }

  return NextResponse.json({ success: true, project_id: id })
}
