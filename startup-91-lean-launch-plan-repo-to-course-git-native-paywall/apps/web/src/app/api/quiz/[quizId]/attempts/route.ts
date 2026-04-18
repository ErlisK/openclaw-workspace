import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveUser } from '@/lib/auth/resolve-user';

/**
 * GET /api/quiz/[quizId]/attempts
 *
 * Returns the authenticated user's attempt history for a quiz.
 * Groups by attempt_number, returns per-attempt summary + per-question results.
 *
 * Query params: ?course_id=UUID (required for ownership verification)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } },
) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('course_id');
  if (!courseId) {
    return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
  }

  const serviceSupa = createServiceClient();

  // Verify quiz exists and belongs to this course
  const { data: quiz } = await serviceSupa
    .from('quizzes')
    .select('id, title, pass_threshold')
    .eq('id', params.quizId)
    .eq('course_id', courseId)
    .single();

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  // Fetch all attempts for this user + quiz
  const { data: attempts } = await serviceSupa
    .from('quiz_attempts')
    .select(`
      id, attempt_number, is_correct, score_pct, passed,
      selected_index, selected_bool, selected_text, attempted_at,
      question_id
    `)
    .eq('quiz_id', params.quizId)
    .eq('user_id', user.id)
    .order('attempt_number', { ascending: false })
    .order('attempted_at', { ascending: true });

  if (!attempts || attempts.length === 0) {
    return NextResponse.json({ attempts: [], best_score: null, total_attempts: 0 });
  }

  // Group by attempt_number
  const attemptMap = new Map<number, {
    attempt_number: number;
    score_pct: number | null;
    passed: boolean | null;
    attempted_at: string;
    correct: number;
    total: number;
  }>();

  for (const row of attempts) {
    const num = row.attempt_number as number;
    if (!attemptMap.has(num)) {
      attemptMap.set(num, {
        attempt_number: num,
        score_pct: row.score_pct as number | null,
        passed: row.passed as boolean | null,
        attempted_at: row.attempted_at as string,
        correct: 0,
        total: 0,
      });
    }
    const entry = attemptMap.get(num)!;
    entry.total++;
    if (row.is_correct) entry.correct++;
  }

  const history = Array.from(attemptMap.values()).sort(
    (a, b) => b.attempt_number - a.attempt_number,
  );

  const scores = history.map((h) => h.score_pct ?? 0).filter((s) => s > 0);
  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  return NextResponse.json({
    attempts: history,
    best_score: bestScore,
    total_attempts: history.length,
    pass_threshold: quiz.pass_threshold,
    ever_passed: history.some((h) => h.passed),
  });
}
