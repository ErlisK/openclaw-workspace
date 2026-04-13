import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/media/[id]/upload-url — get signed upload URL
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify asset belongs to user
  const { data: asset } = await supabase
    .from('media_assets')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { file_name, content_type } = body

  const ext = file_name?.split('.').pop() || 'mp4'
  const path = `${user.id}/${id}/${Date.now()}.${ext}`

  const { data: signed, error } = await supabase.storage
    .from('uploads')
    .createSignedUploadUrl(path)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update asset with storage path
  await supabase
    .from('media_assets')
    .update({ storage_path: path, file_name: file_name || null, mime_type: content_type || null })
    .eq('id', id)

  return NextResponse.json({ url: signed.signedUrl, path, token: signed.token })
}
