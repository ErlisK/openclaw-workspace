import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/projects/[id]/packet-download — redirect to signed URL
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Get most recent packet file
  const { data: files } = await supabase
    .from('project_files')
    .select('storage_path, file_name')
    .eq('project_id', id)
    .like('file_name', '%packet-draft%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!files?.length) {
    return NextResponse.json({ error: 'No packet available yet' }, { status: 404 })
  }

  const { data: urlData } = await supabase.storage
    .from('project-files')
    .createSignedUrl(files[0].storage_path, 60 * 60) // 1 hour

  if (!urlData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 })
  }

  // Audit: log packet download
  const actor_email = req.nextUrl.searchParams.get('pro_email') || req.headers.get('x-pro-email') || null
  await supabase.rpc('log_audit_event', {
    p_action: 'project_file.downloaded',
    p_entity_type: 'project_file',
    p_entity_id: id,
    p_actor_email: actor_email,
    p_actor_role: actor_email ? 'pro' : 'unknown',
    p_meta: { file_name: files[0].file_name, project_id: id }
  })

  return NextResponse.redirect(urlData.signedUrl)
}
