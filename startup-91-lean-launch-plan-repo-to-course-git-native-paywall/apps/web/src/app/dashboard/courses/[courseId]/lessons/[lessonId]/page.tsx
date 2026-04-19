import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { QuizGenerator } from '@/components/dashboard/QuizGenerator';

interface LessonDetailPageProps {
  params: { courseId: string; lessonId: string };
}

export async function generateMetadata({ params }: LessonDetailPageProps): Promise<Metadata> {
  const supa = createServiceClient();
  const { data: lesson } = await supa.from('lessons').select('title').eq('id', params.lessonId).single();
  return {
    title: lesson ? `${lesson.title} — Lesson Editor | TeachRepo` : 'Lesson — Dashboard',
    robots: { index: false },
  };
}

export default async function LessonDetailPage({ params }: LessonDetailPageProps) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard');

  const supa = createServiceClient();

  // Verify the course belongs to this creator
  const { data: course } = await supa
    .from('courses')
    .select('id, slug, title, creator_id')
    .eq('id', params.courseId)
    .eq('creator_id', user.id)
    .single();

  if (!course) notFound();

  // Fetch lesson
  const { data: lesson } = await supa
    .from('lessons')
    .select('id, slug, title, description, content_md, order_index, is_preview, estimated_minutes, has_quiz, quiz_slug')
    .eq('id', params.lessonId)
    .eq('course_id', params.courseId)
    .single();

  if (!lesson) notFound();

  // Fetch existing quiz if any
  const { data: quiz } = lesson.quiz_slug
    ? await supa
        .from('quizzes')
        .select('id, slug, title, ai_generated, created_at')
        .eq('lesson_id', lesson.id)
        .single()
    : { data: null };

  // Fetch quiz questions if quiz exists
  const { data: questions } = quiz
    ? await supa
        .from('quiz_questions')
        .select('id, question, question_type, options, correct_index, explanation, order_index, ai_generated')
        .eq('quiz_id', quiz.id)
        .order('order_index', { ascending: true })
    : { data: [] };

  const previewUrl = `/courses/${course.slug}/lessons/${lesson.slug}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <a href="/dashboard" className="hover:text-violet-600">Dashboard</a>
        <span>›</span>
        <a href={`/dashboard/courses/${params.courseId}`} className="hover:text-violet-600">{course.title}</a>
        <span>›</span>
        <span className="text-gray-900 font-medium">{lesson.title}</span>
      </nav>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
            {lesson.is_preview ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Free preview</span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Paid</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            <span>#{lesson.order_index}</span>
            {lesson.estimated_minutes && <span>{lesson.estimated_minutes} min</span>}
            <span>slug: <code className="font-mono">{lesson.slug}</code></span>
          </div>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>👁</span> Preview
        </a>
      </div>

      <div className="space-y-6">

        {/* ── Lesson content preview ───────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Lesson Content
            </h2>
            <span className="text-xs text-gray-400">
              {lesson.content_md ? `${lesson.content_md.length.toLocaleString()} chars` : 'No content'}
            </span>
          </div>
          <div className="px-6 py-4">
            {lesson.content_md ? (
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 font-mono text-xs text-gray-600 leading-relaxed">
                {lesson.content_md.slice(0, 1500)}{lesson.content_md.length > 1500 ? '\n…' : ''}
              </pre>
            ) : (
              <p className="text-sm text-gray-400">No content stored for this lesson yet.</p>
            )}
          </div>
        </section>

        {/* ── Existing quiz ────────────────────────────────────────────── */}
        {quiz && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Current Quiz
              </h2>
              {quiz.ai_generated && (
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                  ✨ AI-generated
                </span>
              )}
            </div>
            <div className="px-6 py-4">
              <p className="text-sm font-medium text-gray-800">{quiz.title}</p>
              <p className="mt-1 text-xs text-gray-400">
                {questions?.length ?? 0} question{(questions?.length ?? 0) !== 1 ? 's' : ''}
                {' · '}slug: <code className="font-mono">{quiz.slug}</code>
              </p>

              {questions && questions.length > 0 && (
                <div className="mt-4 space-y-3">
                  {questions.map((q, i) => (
                    <div key={q.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Q{i + 1} · {q.question_type}</p>
                      <p className="text-sm text-gray-800">{q.question}</p>
                      {q.question_type === 'multiple_choice' && q.options && (
                        <div className="mt-2 space-y-1">
                          {(q.options as string[]).map((opt, oi) => (
                            <div key={oi} className={`flex items-center gap-2 text-xs ${oi === q.correct_index ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${oi === q.correct_index ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                                {oi === q.correct_index ? '✓' : String.fromCharCode(65 + oi)}
                              </span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.explanation && (
                        <p className="mt-2 text-xs text-gray-400 italic">{q.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── AI Quiz Generator ────────────────────────────────────────── */}
        <QuizGenerator
          courseId={params.courseId}
          lessonId={lesson.id}
          lessonSlug={lesson.slug}
          lessonTitle={lesson.title}
          existingQuizSlug={lesson.quiz_slug}
        />

      </div>
    </div>
  );
}
