import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveUser } from '@/lib/auth/resolve-user';

const SubmitSchema = z.object({
  quiz_id: z.string().uuid(),
  course_id: z.string().uuid(),
  lesson_id: z.string().uuid().optional().nullable(),
  answers: z.record(z.string(), z.union([z.number(), z.boolean(), z.string(), z.null()])),
});

/**
 * POST /api/quiz/submit
 *
 * Grades a quiz attempt server-side against stored correct answers.
 * Stores per-question results in quiz_attempts table.
 *
 * Returns:
 *   { score, passed, correct, total, feedback }
 */
export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
  }

  const { quiz_id, course_id, lesson_id, answers } = parsed.data;
  const serviceSupa = createServiceClient();

  // Fetch quiz + questions
  const { data: quiz } = await serviceSupa
    .from('quizzes')
    .select('id, title, pass_threshold, course_id')
    .eq('id', quiz_id)
    .eq('course_id', course_id)
    .single();

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const { data: questions } = await serviceSupa
    .from('quiz_questions')
    .select('id, question, question_type, options, correct_index, correct_bool, correct_text, explanation, order_index')
    .eq('quiz_id', quiz_id)
    .order('order_index', { ascending: true });

  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'No questions found for this quiz' }, { status: 404 });
  }

  // Get current attempt number
  const { count: prevAttempts } = await serviceSupa
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('quiz_id', quiz_id);
  const attemptNumber = (prevAttempts ?? 0) + 1;

  // Grade each question
  let correct = 0;
  const feedback: Record<string, { correct: boolean; explanation: string | null }> = {};
  const attemptRows: Array<{
    user_id: string;
    quiz_id: string;
    question_id: string;
    lesson_id: string | null;
    course_id: string;
    selected_index: number | null;
    selected_bool: boolean | null;
    selected_text: string | null;
    is_correct: boolean;
    attempt_number: number;
    score_pct: number | null;
    passed: boolean | null;
  }> = [];

  for (const q of questions) {
    const userAnswer = answers[q.id];
    let isCorrect = false;
    let selectedIndex: number | null = null;
    let selectedBool: boolean | null = null;
    let selectedText: string | null = null;

    switch (q.question_type) {
      case 'multiple_choice':
        selectedIndex = typeof userAnswer === 'number' ? userAnswer : null;
        isCorrect = selectedIndex !== null && selectedIndex === q.correct_index;
        break;
      case 'true_false':
        selectedBool = typeof userAnswer === 'boolean' ? userAnswer : null;
        isCorrect = selectedBool !== null && selectedBool === q.correct_bool;
        break;
      case 'short_answer':
        selectedText = typeof userAnswer === 'string' ? userAnswer : null;
        if (selectedText && q.correct_text) {
          isCorrect = selectedText.trim().toLowerCase().includes(q.correct_text.toLowerCase()) ||
            q.correct_text.toLowerCase().includes(selectedText.trim().toLowerCase());
        }
        break;
    }

    if (isCorrect) correct++;
    feedback[q.id] = { correct: isCorrect, explanation: q.explanation };

    attemptRows.push({
      user_id: user.id,
      quiz_id,
      question_id: q.id,
      lesson_id: lesson_id ?? null,
      course_id,
      selected_index: selectedIndex,
      selected_bool: selectedBool,
      selected_text: selectedText,
      is_correct: isCorrect,
      attempt_number: attemptNumber,
      score_pct: null, // set after all questions
      passed: null,    // set after all questions
    });
  }

  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= quiz.pass_threshold;

  // Update score_pct + passed on all rows
  for (const row of attemptRows) {
    row.score_pct = score;
    row.passed = passed;
  }

  // Insert attempt rows
  await serviceSupa.from('quiz_attempts').insert(attemptRows).then(() => null, () => null);

  return NextResponse.json({ score, passed, correct, total, feedback });
}
