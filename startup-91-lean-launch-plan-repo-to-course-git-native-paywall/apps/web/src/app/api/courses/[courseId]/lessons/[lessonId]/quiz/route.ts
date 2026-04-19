/**
 * POST /api/courses/[courseId]/lessons/[lessonId]/quiz
 *
 * Saves AI-generated (or manually edited) quiz questions to the database.
 * Creates a quiz record + quiz_questions rows, then links the quiz back to the lesson.
 *
 * Request body:
 *   {
 *     quizId: string        — slug/identifier for the quiz
 *     title: string
 *     questions: GeneratedQuestion[]
 *     yaml?: string         — raw YAML (stored for reference)
 *   }
 *
 * Response:
 *   { quizId: string, quizSlug: string, questionsCreated: number }
 *
 * Auth: Bearer token — creator must own the course.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

interface RouteParams {
  params: { courseId: string; lessonId: string };
}

// ── Validation ────────────────────────────────────────────────────────────────

const QuestionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('multiple_choice'),
    prompt: z.string().min(5),
    choices: z.array(z.string()).min(2).max(6),
    answer: z.number().int().min(0),
    explanation: z.string().optional().default(''),
    points: z.number().int().min(1).max(10).default(1),
  }),
  z.object({
    type: z.literal('true_false'),
    prompt: z.string().min(5),
    answer: z.boolean(),
    explanation: z.string().optional().default(''),
    points: z.number().int().min(1).max(10).default(1),
  }),
]);

const SaveQuizSchema = z.object({
  quizId: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  questions: z.array(QuestionSchema).min(1).max(20),
  yaml: z.string().optional(),
});

// ── POST /api/courses/[courseId]/lessons/[lessonId]/quiz ──────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  // 1. Auth
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Parse body
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SaveQuizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { quizId: quizSlug, title, questions } = parsed.data;
  const supa = createServiceClient();

  // 3. Verify course ownership
  const { data: course } = await supa
    .from('courses')
    .select('id')
    .eq('id', params.courseId)
    .eq('creator_id', user.id)
    .single();

  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  // 4. Verify lesson belongs to this course
  const { data: lesson } = await supa
    .from('lessons')
    .select('id, slug')
    .eq('id', params.lessonId)
    .eq('course_id', params.courseId)
    .single();

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  // 5. Upsert quiz record (by slug + lesson_id to allow regeneration)
  const { data: existingQuiz } = await supa
    .from('quizzes')
    .select('id')
    .eq('lesson_id', lesson.id)
    .maybeSingle();

  let quizDbId: string;

  if (existingQuiz) {
    // Update existing quiz
    await supa
      .from('quizzes')
      .update({
        slug: quizSlug,
        title,
        ai_generated: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingQuiz.id);
    quizDbId = existingQuiz.id;

    // Delete old questions
    await supa.from('quiz_questions').delete().eq('quiz_id', existingQuiz.id);
  } else {
    // Insert new quiz
    const { data: newQuiz, error: quizErr } = await supa
      .from('quizzes')
      .insert({
        lesson_id: lesson.id,
        course_id: params.courseId,
        slug: quizSlug,
        title,
        ai_generated: true,
        pass_threshold: 70,
      })
      .select('id')
      .single();

    if (quizErr || !newQuiz) {
      console.error('[quiz/save] insert quiz error:', quizErr?.message);
      return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }
    quizDbId = newQuiz.id;
  }

  // 6. Insert quiz questions
  const questionRows = questions.map((q, idx) => ({
    quiz_id: quizDbId,
    lesson_id: lesson.id,
    question: q.prompt,
    question_type: q.type,
    options: q.type === 'multiple_choice' ? q.choices : ['True', 'False'],
    correct_index: q.type === 'multiple_choice' ? (q.answer as number) : (q.answer ? 0 : 1),
    correct_bool: q.type === 'true_false' ? (q.answer as boolean) : null,
    explanation: q.explanation || '',
    order_index: idx,
    ai_generated: true,
  }));

  const { error: questionsErr } = await supa.from('quiz_questions').insert(questionRows);

  if (questionsErr) {
    console.error('[quiz/save] insert questions error:', questionsErr.message);
    return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  }

  // 7. Update lesson to mark it as having a quiz
  await supa
    .from('lessons')
    .update({ has_quiz: true, quiz_slug: quizSlug })
    .eq('id', lesson.id);

  return NextResponse.json({
    quizId: quizDbId,
    quizSlug,
    questionsCreated: questionRows.length,
  });
}

// ── GET — fetch existing quiz for a lesson ────────────────────────────────────

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

  const { data: quiz } = await supa
    .from('quizzes')
    .select('id, slug, title, ai_generated, created_at')
    .eq('lesson_id', params.lessonId)
    .maybeSingle();

  if (!quiz) return NextResponse.json({ quiz: null });

  const { data: questions } = await supa
    .from('quiz_questions')
    .select('id, question, question_type, options, correct_index, correct_bool, explanation, order_index, ai_generated')
    .eq('quiz_id', quiz.id)
    .order('order_index', { ascending: true });

  return NextResponse.json({ quiz, questions: questions ?? [] });
}
