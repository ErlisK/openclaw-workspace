import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { importFromGitHub, type ImportPayload } from '@teachrepo/importer';

// ─── Request schema ───────────────────────────────────────────────────────────

const ImportRequestSchema = z.object({
  repo_url: z.string().url('repo_url must be a valid URL'),
  /** Branch name — defaults to repo's default branch */
  branch: z.string().optional(),
  /** Tag name — mutually exclusive with branch */
  tag: z.string().optional(),
  /** Optional GitHub PAT — allows private repos and raises rate limits */
  token: z.string().optional(),
});

// ─── POST /api/import ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — only authenticated creators can import
  const supabase = createServiceClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') ?? '');

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { repo_url, branch, tag, token } = parsed.data;

  // Determine ref and refType
  const ref = tag ?? branch ?? undefined;
  const refType: 'branch' | 'tag' | undefined = tag ? 'tag' : branch ? 'branch' : undefined;

  // 3. Ensure creator record exists
  const { data: creator, error: creatorError } = await supabase
    .from('creators')
    .select('id')
    .eq('id', user.id)
    .single();

  if (creatorError || !creator) {
    return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 });
  }

  // 4. Run the GitHub import pipeline
  let payload: ImportPayload;
  try {
    payload = await importFromGitHub({ repoUrl: repo_url, ref, refType, token });
  } catch (err) {
    const message = (err as Error).message;

    // Record the failed import attempt
    await supabase.from('repo_imports').insert({
      creator_id: user.id,
      repo_url,
      branch,
      status: 'failed',
      error_log: message,
    });

    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { config, lessons, quizzes, errors, headSha, shortSha, versionLabel, ref: resolvedRef, refType: resolvedRefType, defaultBranch } = payload;

  // 5. Upsert course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .upsert(
      {
        creator_id: user.id,
        slug: config.slug,
        title: config.title,
        description: config.description,
        price_cents: config.price_cents,
        currency: config.currency,
        pricing_model: config.price_cents === 0 ? 'free' : 'one_time',
        affiliate_pct: config.affiliate_pct,
        repo_url,
        version: config.version,
        tags: config.tags,
      },
      { onConflict: 'creator_id,slug', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (courseError || !course) {
    return NextResponse.json(
      { error: 'Failed to upsert course', details: courseError?.message },
      { status: 500 }
    );
  }

  const courseId: string = course.id;

  // 6. Create course_version entry
  // Check if this SHA was already imported
  const { data: existingVersion } = await supabase
    .from('course_versions')
    .select('id, is_current, version_label')
    .eq('course_id', courseId)
    .eq('commit_sha', headSha)
    .maybeSingle();

  if (existingVersion?.is_current) {
    // Already the current version — return early
    return NextResponse.json({
      success: true,
      courseId,
      courseSlug: config.slug,
      alreadyCurrent: true,
      versionLabel: existingVersion.version_label,
      commitSha: headSha,
      shortSha,
      imported: { lessons: lessons.length, quizzes: quizzes.length },
    });
  }

  if (!existingVersion) {
    // Insert new version row
    await supabase.from('course_versions').insert({
      course_id: courseId,
      commit_sha: headSha,
      branch: resolvedRefType === 'branch' ? resolvedRef : defaultBranch,
      tag: resolvedRefType === 'tag' ? resolvedRef : null,
      version_label: versionLabel,
      lesson_count: lessons.length,
      quiz_count: quizzes.length,
      is_current: true,
      published_at: new Date().toISOString(),
      imported_by: user.id,
    });
  } else {
    // Re-promote an older version to current
    await supabase
      .from('course_versions')
      .update({ is_current: true, published_at: new Date().toISOString() })
      .eq('id', existingVersion.id);
  }

  // Demote all other versions for this course
  await supabase
    .from('course_versions')
    .update({ is_current: false })
    .eq('course_id', courseId)
    .neq('commit_sha', headSha);

  // 7. Upsert lessons
  const lessonRows = lessons.map((l) => ({
    course_id: courseId,
    slug: l.slug,
    title: l.frontmatter.title,
    order_index: l.frontmatter.order,
    is_preview: l.frontmatter.access === 'free',
    description: l.frontmatter.description ?? null,
    estimated_minutes: l.frontmatter.estimated_minutes ?? null,
    sandbox_url: l.frontmatter.sandbox_url ?? null,
    quiz_id: l.frontmatter.quiz_id ?? null,
    body_md: l.bodyMd,
  }));

  if (lessonRows.length > 0) {
    const { error: lessonError } = await supabase
      .from('lessons')
      .upsert(lessonRows, { onConflict: 'course_id,slug', ignoreDuplicates: false });

    if (lessonError) {
      errors.push({ path: 'lessons', message: lessonError.message });
    }
  }

  // 8. Upsert quizzes + quiz_questions
  for (const quiz of quizzes) {
    const { error: quizError } = await supabase.from('quizzes').upsert(
      {
        course_id: courseId,
        external_id: quiz.id,
        title: quiz.data.title,
        pass_threshold: quiz.data.pass_threshold,
        ai_generated: quiz.data.ai_generated,
        question_count: quiz.data.questions.length,
      },
      { onConflict: 'course_id,external_id', ignoreDuplicates: false }
    );

    if (quizError) {
      errors.push({ path: `quizzes/${quiz.id}`, message: quizError.message });
      continue;
    }

    // Fetch the quiz DB id for question upsert
    const { data: quizRow } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId)
      .eq('external_id', quiz.id)
      .single();

    if (!quizRow) continue;

    // Delete existing questions and re-insert (questions can change between versions)
    await supabase.from('quiz_questions').delete().eq('quiz_id', quizRow.id);

    const questionRows = quiz.data.questions.map((q, i) => ({
      quiz_id: quizRow.id,
      order_index: i,
      type: q.type,
      prompt: q.prompt,
      choices: q.type === 'multiple_choice' ? q.choices : null,
      correct_answer:
        q.type === 'multiple_choice'
          ? String(q.answer)
          : q.type === 'true_false'
          ? String(q.answer)
          : q.answer,
      points: q.points,
      explanation: q.explanation ?? null,
    }));

    if (questionRows.length > 0) {
      const { error: qError } = await supabase
        .from('quiz_questions')
        .insert(questionRows);
      if (qError) {
        errors.push({ path: `quizzes/${quiz.id}/questions`, message: qError.message });
      }
    }
  }

  // 9. Record repo_import
  await supabase.from('repo_imports').insert({
    creator_id: user.id,
    course_id: courseId,
    repo_url,
    branch,
    commit_sha: headSha,
    status: errors.length === 0 ? 'success' : 'partial',
    lesson_count: lessons.length,
    quiz_count: quizzes.length,
    error_log: errors.length > 0 ? JSON.stringify(errors) : null,
  });

  return NextResponse.json(
    {
      success: true,
      courseId,
      courseSlug: config.slug,
      versionLabel,
      commitSha: headSha,
      shortSha,
      ref: resolvedRef,
      refType: resolvedRefType,
      imported: {
        lessons: lessons.length,
        quizzes: quizzes.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: 200 }
  );
}
