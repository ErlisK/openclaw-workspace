import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase-server'

/**
 * GET /api/rule-versions/diff?from=<versionId>&to=<versionId>
 * GET /api/rule-versions/diff?project_id=<id>&to=<versionId>  (from = parent of `to`)
 * GET /api/rule-versions/diff?session_id=<id>  (diff from parent → session's rule version)
 * 
 * Public endpoint — used in pre/post surveys and consent pages.
 * Returns structured changelog diff between two versions.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fromId = searchParams.get('from')
  const toId = searchParams.get('to')
  const sessionId = searchParams.get('session_id')

  const supabase = createServiceClient()

  // ── Resolve session → version pair ─────────────────────────────────────────
  if (sessionId) {
    const { data: session } = await supabase
      .from('playtest_sessions')
      .select('rule_version_id')
      .eq('id', sessionId)
      .single()

    if (!session?.rule_version_id) {
      return NextResponse.json({ diff: null, message: 'No rule version linked to this session' })
    }

    return buildDiff(supabase, null, session.rule_version_id)
  }

  if (!toId) {
    return NextResponse.json({ error: 'to version id required' }, { status: 400 })
  }

  return buildDiff(supabase, fromId, toId)
}

async function buildDiff(supabase: any, fromId: string | null, toId: string) {
  // Fetch "to" version
  const { data: toVersion } = await supabase
    .from('rule_versions')
    .select('id, version_label, semver, semver_major, semver_minor, semver_patch, changelog, diff_summary, is_breaking_change, parent_version_id, notes, created_at')
    .eq('id', toId)
    .single()

  if (!toVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  // Resolve "from" version
  let fromVersion = null
  const resolvedFromId = fromId ?? toVersion.parent_version_id

  if (resolvedFromId) {
    const { data } = await supabase
      .from('rule_versions')
      .select('id, version_label, semver, diff_summary')
      .eq('id', resolvedFromId)
      .single()
    fromVersion = data
  }

  // Parse changelog entries
  const changelog: ChangeEntry[] = Array.isArray(toVersion.changelog)
    ? toVersion.changelog
    : []

  // Categorize by type
  const categorized = {
    added: changelog.filter((c: ChangeEntry) => c.type === 'added'),
    changed: changelog.filter((c: ChangeEntry) => c.type === 'changed'),
    fixed: changelog.filter((c: ChangeEntry) => c.type === 'fixed'),
    removed: changelog.filter((c: ChangeEntry) => c.type === 'removed'),
    balance: changelog.filter((c: ChangeEntry) => c.type === 'balance'),
  }

  return NextResponse.json({
    diff: {
      fromVersion: fromVersion ? {
        id: fromVersion.id,
        label: fromVersion.version_label,
        semver: fromVersion.semver,
        summary: fromVersion.diff_summary,
      } : null,
      toVersion: {
        id: toVersion.id,
        label: toVersion.version_label,
        semver: toVersion.semver,
        summary: toVersion.diff_summary,
        isBreakingChange: toVersion.is_breaking_change,
        createdAt: toVersion.created_at,
      },
      changelog,
      categorized,
      totalChanges: changelog.length,
      hasChanges: changelog.length > 0 || !!toVersion.diff_summary,
      isFirstVersion: !fromVersion,
      isBreakingChange: toVersion.is_breaking_change,
    }
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300' },
  })
}

interface ChangeEntry {
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'balance'
  section: string
  description: string
}
