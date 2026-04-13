import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin()
  const formData = await req.formData()
  const proId       = formData.get('pro_id') as string | null
  const proEmail    = formData.get('pro_email') as string | null
  const licenseNum  = formData.get('license_number') as string | null
  const licenseState = formData.get('license_state') as string | null
  const licenseExpiry = formData.get('license_expiry') as string | null
  const file        = formData.get('file') as File | null

  if (!proId || !proEmail || !file) {
    return NextResponse.json({ error: 'pro_id, pro_email, and file are required' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'File must be JPEG, PNG, WebP, or PDF' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 })
  }

  const ext = file.type === 'application/pdf' ? 'pdf'
            : file.type === 'image/png' ? 'png'
            : file.type === 'image/webp' ? 'webp'
            : 'jpg'
  const path = `pros/${proId}/license-${Date.now()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload to Supabase Storage (private bucket)
  const { error: uploadError } = await db.storage
    .from('license-docs')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[license-upload] storage error:', uploadError.message)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Generate a long-lived signed URL (7 days — refreshed on admin review)
  const { data: signed } = await db.storage
    .from('license-docs')
    .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 days

  // Update pro record
  const updates: Record<string, unknown> = {
    license_doc_url: signed?.signedUrl ?? null,
    license_doc_path: path,
    license_doc_uploaded_at: new Date().toISOString(),
    license_status: 'pending_review',
    updated_at: new Date().toISOString(),
  }
  if (licenseNum)    updates.license_number = licenseNum
  if (licenseState)  updates.license_state = licenseState
  if (licenseExpiry) updates.license_expiry = licenseExpiry

  const { error: dbError } = await db.from('pros').update(updates).eq('id', proId)
  if (dbError) {
    console.error('[license-upload] db error:', dbError.message)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Write audit log
  await db.from('license_verifications').insert({
    pro_id: proId,
    pro_email: proEmail,
    action: 'submitted',
    note: `License doc uploaded: ${path}`,
  })

  // Notify admin via email
  const key = process.env.AGENTMAIL_API_KEY
  if (key) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://startup-73-expeditehub-lean-startup.vercel.app'
    await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [{ email: 'scide-founder@agentmail.to' }],
        from: { email: 'scide-founder@agentmail.to', name: 'ExpediteHub' },
        subject: `License doc submitted — ${proEmail}`,
        text: [
          `Pro ${proEmail} has uploaded their license document for review.`,
          ``,
          `License #: ${licenseNum ?? 'not provided'}`,
          `State: ${licenseState ?? 'TX'}`,
          `Expiry: ${licenseExpiry ?? 'not provided'}`,
          ``,
          `Review at: ${appUrl}/admin`,
          `File path: ${path}`,
        ].join('\n'),
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, path, status: 'pending_review' })
}
