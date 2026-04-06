import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * GET /api/rule-versions?project_id=... — list all versions for a project (designer auth)
 * GET /api/rule-versions?session_id=... — get version for a session (public, service client)
 * GET /api/rule-versions/diff?from=<id>&to=<id> — see diff endpoint below
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const sessionId = searchParams.get('session_id')

  if (sessionId) {
    // Public: get rule version for a session (used in surveys/consent)
    const supabase = createServiceClient()
    const { data: session } = await supabase
      .from('playtest_sessions')
      .select('rule_version_id')
      .eq('id', sessionId)
      .single()

    if (!session?.rule_version_id) {
      return NextResponse.json({ version: null })
    }

    const { data: version } = await supabase
      .from('rule_versions')
      .select('id, version_label, semver, diff_summary, changelog, is_breaking_change, parent_version_id, notes, created_at')
      .eq('id', session.rule_version_id)
      .single()

    if (!version) return NextResponse.json({ version: null })

    // Also fetch parent version for diff display
    let parentVersion = null
    if (version.parent_version_id) {
      const { data: parent } = await supabase
        .from('rule_versions')
        .select('id, version_label, semver, diff_summary')
        .eq('id', version.parent_version_id)
        .single()
      parentVersion = parent
    }

    return NextResponse.json({ version, parentVersion })
  }

  if (projectId) {
    // Designer-authenticated: list all versions for a project
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: versions } = await supabase
      .from('rule_versions')
      .select(`
        id, version_label, semver, semver_major, semver_minor, semver_patch,
        diff_summary, changelog, is_breaking_change, parent_version_id,
        notes, file_name, file_size_bytes, created_at
      `)
      .eq('project_id', projectId)
      .order('semver_major', { ascending: false })
      .order('semver_minor', { ascending: false })
      .order('semver_patch', { ascending: false })

    return NextResponse.json({ versions: versions ?? [] })
  }

  return NextResponse.json({ error: 'project_id or session_id required' }, { status: 400 })
}

/**
 * POST /api/rule-versions — upload a new version with changelog
 * Body: { project_id, version_label, semver, changelog, diff_summary, is_breaking_change,
 *         storage_path, file_name, file_size_bytes, notes, parent_version_id? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    project_id, version_label, semver, changelog, diff_summary,
    is_breaking_change, storage_path, file_name, file_size_bytes,
    notes, parent_version_id,
  } = body

  if (!project_id || !version_label) {
    return NextResponse.json({ error: 'project_id and version_label required' }, { status: 400 })
  }

  // Parse semver
  const parts = (semver ?? version_label.replace(/^v/, '')).split('.')
  const major = parseInt(parts[0]) || 1
  const minor = parseInt(parts[1]) || 0
  const patch = parseInt(parts[2]) || 0

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .eq('designer_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Find latest version as parent if not specified
  let resolvedParentId = parent_version_id ?? null
  if (!resolvedParentId) {
    const { data: latest } = await supabase
      .from('rule_versions')
      .select('id')
      .eq('project_id', project_id)
      .order('semver_major', { ascending: false })
      .order('semver_minor', { ascending: false })
      .order('semver_patch', { ascending: false })
      .limit(1)
      .single()
    resolvedParentId = latest?.id ?? null
  }

  const { data, error } = await supabase.from('rule_versions').insert({
    project_id,
    version_label,
    semver: semver ?? `${major}.${minor}.${patch}`,
    semver_major: major,
    semver_minor: minor,
    semver_patch: patch,
    parent_version_id: resolvedParentId,
    changelog: changelog ?? [],
    diff_summary: diff_summary ?? notes ?? null,
    is_breaking_change: is_breaking_change ?? false,
    notes: notes ?? null,
    storage_path: storage_path ?? null,
    file_name: file_name ?? null,
    file_size_bytes: file_size_bytes ?? null,
    uploaded_by: user.id,
    published: true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, version: data })
}
