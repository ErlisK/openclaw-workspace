import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { checkEntitlement } from '@/lib/entitlement/check';
import type { QuizFile } from '@/lib/types/quiz';

interface LessonPageProps {
  params: { slug: string; lessonSlug: string };
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const supabase = createServerClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();
  if (!course) return { title: 'Lesson not found' };
  const { data: lesson } = await supabase
    .from('lessons')
    .select('title, description')
    .eq('course_id', course.id)
    .eq('slug', params.lessonSlug)
    .single();
  return {
    title: lesson ? `${lesson.title} — ${course.title}` : course.title,
    description: lesson?.description ?? undefined,
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const supabase = createServerClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title, price_cents, currency, pricing_model')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();
  if (!course) notFound();

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, slug, title, description, order_index, is_preview, estimated_minutes, quiz_id, body_md, sandbox_url')
    .eq('course_id', course.id)
    .eq('slug', params.lessonSlug)
    .single();
  if (!lesson) notFound();

  const { enrolled } = await checkEntitlement({ courseId: course.id });
  if (!lesson.is_preview && !enrolled) {
    redirect(`/courses/${params.slug}?paywall=1`);
  }

  // Fetch sibling lessons for nav
  const { data: siblings } = await supabase
    .from('lessons')
    .select('id, slug, title, order_index, is_preview')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true });

  const idx = siblings?.findIndex((l) => l.slug === params.lessonSlug) ?? -1;
  const prev = idx > 0 ? siblings![idx - 1] : null;
  const next = idx >= 0 && idx < (siblings?.length ?? 0) - 1 ? siblings![idx + 1] : null;

  // Fetch quiz if attached
  let quiz: QuizFile | null = null;
  if (lesson.quiz_id) {
    const { data: quizRow } = await supabase
      .from('quizzes')
      .select('id, external_id, title, pass_threshold, ai_generated, quiz_questions(order_index, type, prompt, choices, correct_answer, points, explanation)')
      .eq('course_id', course.id)
      .eq('external_id', lesson.quiz_id)
      .single();
    if (quizRow) quiz = normalizeQuiz(quizRow);
  }

  const sandboxUrl = enrolled && lesson.sandbox_url ? lesson.sandbox_url : '';

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10 lg:px-8">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 lg:block">
        <nav aria-label="Course lessons">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{course.title}</p>
          <ul className="space-y-1">
            {siblings?.map((l) => (
              <li key={l.id}>
                <a
                  href={`/courses/${params.slug}/lessons/${l.slug}`}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    l.slug === params.lessonSlug
                      ? 'bg-violet-100 font-medium text-violet-800'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex-1">{l.title}</span>
                  {l.is_preview && (
                    <span className="rounded px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-300">Free</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        <header className="mb-8 border-b border-gray-200 pb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <a href={`/courses/${params.slug}`} className="hover:text-violet-600">{course.title}</a>
            <span>›</span>
            <span>{lesson.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
          {lesson.estimated_minutes && (
            <p className="mt-2 text-sm text-gray-500">~{lesson.estimated_minutes} min read</p>
          )}
        </header>

        {/* Lesson body — rendered as plain markdown prose */}
        <article className="prose prose-gray max-w-none">
          <div dangerouslySetInnerHTML={{ __html: '' }} />
          {/* Body stored as MD — render as pre-formatted for now */}
          <div className="whitespace-pre-wrap font-mono text-sm text-gray-700 rounded bg-gray-50 p-4">
            {lesson.body_md}
          </div>
        </article>

        {/* Sandbox embed (if enrolled) */}
        {sandboxUrl && (
          <div className="my-8 overflow-hidden rounded-xl border border-gray-200" style={{ height: 500 }}>
            <iframe src={sandboxUrl} title="Live sandbox" className="h-full w-full border-0" loading="lazy" />
          </div>
        )}

        {/* Quiz placeholder */}
        {quiz && (
          <div className="my-8 rounded-xl border border-violet-200 bg-violet-50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-violet-900">{quiz.title}</h3>
            <p className="text-sm text-violet-700">{quiz.questions.length} questions · {quiz.pass_threshold}% to pass</p>
          </div>
        )}

        {/* Lesson nav */}
        <nav className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6">
          {prev ? (
            <a href={`/courses/${params.slug}/lessons/${prev.slug}`} className="rounded-lg border border-gray-200 px-4 py-3 text-sm hover:border-violet-300">
              ← {prev.title}
            </a>
          ) : <div />}
          {next ? (
            <a href={`/courses/${params.slug}/lessons/${next.slug}`} className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700">
              {next.title} →
            </a>
          ) : (
            <div className="rounded-lg bg-green-100 px-4 py-3 text-sm font-medium text-green-800">🎉 Course complete!</div>
          )}
        </nav>
      </main>
    </div>
  );
}

function normalizeQuiz(row: Record<string, unknown>): QuizFile {
  const questions = (row.quiz_questions as Array<Record<string, unknown>> ?? [])
    .sort((a, b) => (a.order_index as number) - (b.order_index as number))
    .map((q) => {
      if (q.type === 'multiple_choice') {
        return { type: 'multiple_choice' as const, prompt: q.prompt as string, choices: (q.choices as string[]) ?? [], answer: parseInt(q.correct_answer as string, 10), points: q.points as number, explanation: (q.explanation as string) ?? undefined };
      }
      if (q.type === 'true_false') {
        return { type: 'true_false' as const, prompt: q.prompt as string, answer: q.correct_answer === 'true', points: q.points as number, explanation: (q.explanation as string) ?? undefined };
      }
      return { type: 'short_answer' as const, prompt: q.prompt as string, answer: q.correct_answer as string, points: q.points as number, explanation: (q.explanation as string) ?? undefined };
    });
  return {
    id: row.external_id as string,
    title: row.title as string,
    pass_threshold: row.pass_threshold as number,
    ai_generated: row.ai_generated as boolean,
    questions,
  };
}
