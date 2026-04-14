import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/feedback/[id]/screenshot
 *
 * Uploads a screenshot for a feedback item to Supabase Storage.
 * Accepts multipart/form-data with a "file" field.
 * Returns the public (signed) URL of the uploaded file.
 *
 * Auth: tester who owns the feedback.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: feedbackId } = await params

  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify ownership
  const { data: feedback } = await admin
    .from('feedback')
    .select('id, tester_id')
    .eq('id', feedbackId)
    .single()

  if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  if (feedback.tester_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse multipart form
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only PNG, JPEG, WebP, or GIF images allowed' }, { status: 400 })
  }

  const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${user.id}/${feedbackId}/${Date.now()}.${ext}`

  const arrayBuf = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuf)

  // Upload using admin client (bypasses RLS)
  const { error: upErr } = await admin.storage
    .from('screenshots')
    .upload(path, buf, {
      contentType: file.type,
      upsert: false,
    })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Generate a signed URL valid for 1 year
  const { data: signedData, error: signErr } = await admin.storage
    .from('screenshots')
    .createSignedUrl(path, 365 * 24 * 60 * 60)

  if (signErr || !signedData) {
    return NextResponse.json({ error: signErr?.message ?? 'Signing failed' }, { status: 500 })
  }

  // Append URL to feedback's screenshot_urls array
  const { data: existing } = await admin
    .from('feedback')
    .select('screenshot_urls')
    .eq('id', feedbackId)
    .single()

  const urls = [...((existing?.screenshot_urls as string[]) ?? []), signedData.signedUrl]
  await admin.from('feedback').update({ screenshot_urls: urls }).eq('id', feedbackId)

  return NextResponse.json({
    url: signedData.signedUrl,
    path,
    size: file.size,
    type: file.type,
  }, { status: 201 })
}
