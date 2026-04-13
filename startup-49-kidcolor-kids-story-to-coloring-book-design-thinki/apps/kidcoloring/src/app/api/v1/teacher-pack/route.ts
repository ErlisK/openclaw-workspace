import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/v1/teacher-pack
 *
 * Records teacher pack download request + sends email with PDF link.
 * Body: { email, name?, grade?, source? }
 *
 * The "teacher starter pack" is a curated set of 10 coloring pages:
 * - We serve them via a static Vercel URL (no PDF generation needed)
 * - Email sent via Agentmail with download link
 */

const TEACHER_PACK_URL = 'https://kidcoloring-research.vercel.app/downloads/teacher-starter-pack-v1.pdf'

// Minimal Agentmail sender
async function sendTeacherPackEmail(email: string, name?: string) {
  const displayName = name ? `Hi ${name}` : 'Hi there'
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #374151;">
  <div style="text-align:center; margin-bottom:24px;">
    <h1 style="color:#7c3aed; font-size:28px; margin:0;">🎨 KidColoring</h1>
    <p style="color:#6b7280; font-size:14px; margin:4px 0 0;">Free Teacher Pack</p>
  </div>
  
  <p style="font-size:16px;">${displayName}! 👋</p>
  <p>Thanks for downloading the KidColoring Free Teacher Pack. Here are your 10 ready-to-print coloring pages:</p>
  
  <div style="text-align:center; margin:24px 0;">
    <a href="${TEACHER_PACK_URL}" 
       style="background:#7c3aed; color:white; text-decoration:none; font-weight:700; padding:16px 32px; border-radius:16px; font-size:16px; display:inline-block;">
      📥 Download your free pack
    </a>
  </div>

  <div style="background:#f5f3ff; border-radius:12px; padding:16px; margin:16px 0;">
    <p style="font-weight:700; color:#6d28d9; margin:0 0 8px;">What's inside:</p>
    <ul style="margin:0; padding-left:20px; color:#6b7280; font-size:14px;">
      <li>🦕 3 Dinosaur pages (T-Rex, Triceratops, Brachiosaurus)</li>
      <li>🚀 2 Space pages (Rocket ship, Friendly alien)</li>
      <li>🦄 2 Fantasy pages (Unicorn, Dragon)</li>
      <li>🤖 1 Robot page</li>
      <li>🐶 2 Animal pages (Puppy, Kitten)</li>
    </ul>
  </div>

  <p style="font-size:14px; color:#6b7280;">
    <strong>Classroom license included:</strong> Print unlimited copies for your students.
    Share with colleagues at your school. Not for resale.
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb; margin:24px 0;"/>
  
  <div style="background:#eff6ff; border-radius:12px; padding:16px;">
    <p style="font-weight:700; color:#1d4ed8; margin:0 0 8px;">💡 Personalised books for each student</p>
    <p style="font-size:13px; color:#3b82f6; margin:0 0 12px;">
      Each student can create their own personalised book at KidColoring.app — entering their name and favourite things, 
      getting a unique 8-page book in 2 minutes. Free to preview, $6.99 to download.
    </p>
    <a href="https://kidcoloring-research.vercel.app/create/interests?utm_source=teacher_pack_email&utm_medium=email" 
       style="color:#2563eb; font-weight:600; font-size:13px;">Try it free for your class →</a>
  </div>

  <p style="font-size:12px; color:#9ca3af; margin-top:24px; text-align:center;">
    KidColoring · <a href="https://kidcoloring-research.vercel.app/privacy" style="color:#9ca3af;">Privacy Policy</a>
    · Reply to unsubscribe any time
  </p>
</body>
</html>`

  const res = await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AGENTMAIL_API_KEY}`,
    },
    body: JSON.stringify({
      to:      [{ email }],
      subject: '🎨 Your free KidColoring teacher pack is here!',
      html,
    }),
  })
  return res.ok
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function hashIp(ip: string): string {
  let h = 5381
  for (let i = 0; i < ip.length; i++) { h = ((h << 5) + h) ^ ip.charCodeAt(i); h = h >>> 0 }
  return h.toString(16)
}

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; grade?: string; source?: string }
  try { body = await req.json() as typeof body }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { email, name, grade, source = 'teachers_page' } = body
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const ip     = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const ipHash = hashIp(ip)
  const sb     = admin()

  // Log download
  await sb.from('teacher_pack_downloads').insert({
    email:    email.toLowerCase().trim(),
    source,
    pack_id:  'teacher-starter-v1',
    ip_hash:  ipHash,
  })

  // Send email with Agentmail
  const emailSent = await sendTeacherPackEmail(email.trim(), name?.trim())

  // Log as event
  await sb.from('events').insert({
    event_name: 'teacher_pack_download',
    properties: { email: email.toLowerCase().trim(), grade: grade ?? null, source, emailSent },
  })

  if (!emailSent) {
    // Still succeed — direct download link as fallback
    return NextResponse.json({
      success: true,
      emailSent: false,
      directUrl: TEACHER_PACK_URL,
      message: 'Download link ready',
    })
  }

  return NextResponse.json({ success: true, emailSent: true })
}
