import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthed } from '@/lib/admin-auth'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// PATCH /api/admin/pros/[id] — approve, reject, suspend
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { status, notes } = await req.json()

  const allowed = ['pending', 'active', 'rejected', 'suspended']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${allowed.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await db()
    .from('pros')
    .update({ status, ...(notes ? { notes } : {}) })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify pro by email if approved or rejected
  if (status === 'active' || status === 'rejected') {
    try {
      const msg = status === 'active'
        ? `Congratulations! Your ExpediteHub pro application has been approved. You can now log in to view ADU projects and submit quotes.\n\nPro Portal: https://startup-73-expeditehub-lean-startup.vercel.app/pro/portal`
        : `Thank you for applying to ExpediteHub. After reviewing your application, we're unable to approve it at this time. Please reply to this email if you have questions.`
      await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.AGENTMAIL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [data.email],
          subject: status === 'active' ? 'Welcome to ExpediteHub Pro Network!' : 'ExpediteHub Pro Application Update',
          text: msg,
        }),
      })
    } catch { /* notification non-critical */ }
  }

  return NextResponse.json({ success: true, pro: data })
}
