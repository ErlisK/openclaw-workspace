/**
 * GET  /api/courses/[courseId]/versions  — list version history for a course
 * POST /api/courses/[courseId]/versions  — promote a version to current
 *
 * Both endpoints require the caller to own the course (creator_id = user.id).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

interface RouteParams {
  params: { courseId: string };
}

// ── GET — list versions ───────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supa = createServiceClient();

  // Verify ownership
  const { data: course } = await supa
    .from('courses')
    .select('id')
    .eq('id', params.courseId)
    .eq('creator_id', user.id)
    .single();

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: versions, error } = await supa
    .from('course_versions')
    .select(
      'id, version_label, version, commit_sha, branch, tag, lesson_count, quiz_count, is_current, is_latest, published_at, imported_at, repo_url',
    )
    .eq('course_id', params.courseId)
    .order('imported_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ versions: versions ?? [] });
}

// ── POST — promote a version to current ──────────────────────────────────────

const PromoteSchema = z.object({
  versionId: z.string().uuid(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PromoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'versionId required' }, { status: 400 });
  }

  const supa = createServiceClient();

  // Verify course ownership
  const { data: course } = await supa
    .from('courses')
    .select('id')
    .eq('id', params.courseId)
    .eq('creator_id', user.id)
    .single();

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify the version belongs to this course
  const { data: version } = await supa
    .from('course_versions')
    .select('id, commit_sha, version_label')
    .eq('id', parsed.data.versionId)
    .eq('course_id', params.courseId)
    .single();

  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  // Atomically: clear current from all, set on this one
  await supa
    .from('course_versions')
    .update({ is_current: false, is_latest: false })
    .eq('course_id', params.courseId);

  const { error: promoteErr } = await supa
    .from('course_versions')
    .update({ is_current: true, is_latest: true, published_at: new Date().toISOString() })
    .eq('id', parsed.data.versionId);

  if (promoteErr) {
    return NextResponse.json({ error: promoteErr.message }, { status: 500 });
  }

  // Also update the course's version field
  await supa
    .from('courses')
    .update({ version: version.version_label })
    .eq('id', params.courseId);

  return NextResponse.json({
    ok: true,
    courseId: params.courseId,
    promotedVersionId: version.id,
    versionLabel: version.version_label,
    commitSha: version.commit_sha,
  });
}
