import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()
  const { action, note, admin_email } = await req.json() as {
    action: 'approve' | 'reject'
    note?: string
    admin_email?: string
  }

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  // Fetch current pro row for snapshot
  const { data: pro, error: fetchError } = await db
    .from('pros')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !pro) {
    return NextResponse.json({ error: 'Pro not found' }, { status: 404 })
  }

  const now = new Date().toISOString()

  // Refresh signed URL for the snapshot
  let freshSignedUrl: string | null = pro.license_doc_url
  if (pro.license_doc_path) {
    const { data: signed } = await db.storage
      .from('license-docs')
      .createSignedUrl(pro.license_doc_path, 60 * 60 * 24 * 365) // 1 year for audit
    if (signed?.signedUrl) freshSignedUrl = signed.signedUrl
  }

  // Snapshot includes the signed URL at time of review
  const snapshot = {
    ...pro,
    license_doc_url: freshSignedUrl,
    reviewed_at: now,
    reviewed_by: admin_email ?? 'admin',
    review_note: note ?? '',
  }

  const updates: Record<string, unknown> =
    action === 'approve'
      ? {
          license_status: 'approved',
          license_verified_at: now,
          license_verified_by: admin_email ?? 'admin',
          license_snapshot: snapshot,
          license_rejection_reason: null,
          status: 'active',
          updated_at: now,
        }
      : {
          license_status: 'rejected',
          license_rejection_reason: note ?? 'Document not acceptable',
          license_verified_at: null,
          license_verified_by: null,
          status: 'pending',
          updated_at: now,
        }

  const { error: updateError } = await db.from('pros').update(updates).eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Audit log
  await db.from('license_verifications').insert({
    pro_id: id,
    pro_email: pro.email,
    action: action === 'approve' ? 'approved' : 'rejected',
    admin_email: admin_email ?? 'admin',
    note: note ?? null,
    snapshot,
  })

  // Email the pro
  const key = process.env.AGENTMAIL_API_KEY
  if (key && pro.email) {
    const subject = action === 'approve'
      ? '✅ Your license has been verified — ExpediteHub'
      : '⚠️ License verification: additional info needed — ExpediteHub'

    const text = action === 'approve'
      ? [
          `Hi ${pro.name ?? 'there'},`,
          ``,
          `Your Texas permit expediter license has been verified. Your profile is now active on ExpediteHub.`,
          ``,
          `Log in to your portal to start quoting projects:`,
          `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://startup-73-expeditehub-lean-startup.vercel.app'}/pro/portal`,
          ``,
          `— The ExpediteHub Team`,
        ].join('\n')
      : [
          `Hi ${pro.name ?? 'there'},`,
          ``,
          `We were unable to verify your license with the document provided.`,
          ``,
          `Reason: ${note ?? 'Document not acceptable'}`,
          ``,
          `Please re-upload a clear copy of your current Texas permit expediter license.`,
          `If you have questions, reply to this email.`,
          ``,
          `— The ExpediteHub Team`,
        ].join('\n')

    await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [{ email: pro.email }],
        from: { email: 'scide-founder@agentmail.to', name: 'ExpediteHub' },
        subject,
        text,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, action, pro_id: id })
}
