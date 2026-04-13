import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const formData = await req.formData()
  const projectId = formData.get('project_id') as string
  const file = formData.get('file') as File | null

  if (!projectId || !file) {
    return NextResponse.json({ error: 'project_id and file required' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/heic']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: `File type ${file.type} not supported. Use PDF, JPG, PNG, or HEIC.` },
      { status: 400 }
    )
  }

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL (or signed URL for private bucket)
  const { data: urlData } = supabase.storage
    .from('project-files')
    .getPublicUrl(path)

  // Record in DB
  const { data: fileRecord, error: dbError } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: path,
      public_url: urlData?.publicUrl ?? null,
      uploaded_by: 'homeowner',
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Update project file_urls array (append via read-modify-write)
  try {
    const { data: proj } = await supabase
      .from('projects')
      .select('file_urls')
      .eq('id', projectId)
      .single()
    const existing: string[] = proj?.file_urls ?? []
    await supabase
      .from('projects')
      .update({ file_urls: [...existing, urlData?.publicUrl ?? path] })
      .eq('id', projectId)
  } catch { /* best effort */ }

  return NextResponse.json({
    file_id: fileRecord.id,
    file_name: file.name,
    url: urlData?.publicUrl ?? path,
    size: file.size,
  })
}
