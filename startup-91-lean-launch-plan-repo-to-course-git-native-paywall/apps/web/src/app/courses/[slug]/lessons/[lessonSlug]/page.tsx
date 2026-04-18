import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { checkEntitlement } from '@/lib/entitlement/check';
import { compileLessonMdx } from '@/lib/mdx/compile';
import { SandboxEmbed } from '@/components/mdx/SandboxEmbed';
import { Quiz } from '@/components/mdx/Quiz';

interface LessonPageProps {
  params: {
    slug: string;
    lessonSlug: string;
  };
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const supabase = createServerClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug')
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LessonPage({ params }: LessonPageProps) {
  const supabase = createServerClient();

  // 1. Fetch course
  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title, price_cents, currency, pricing_model')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();

  if (!course) notFound();

  // 2. Fetch lesson (body_md and sandbox_url are NOT returned yet — await entitlement check)
  const { data: lesson } = await supabase
    .from('lessons')
    .select(
      'id, slug, title, description, order_index, is_preview, estimated_minutes, quiz_id, body_md, sandbox_url'
    )
    .eq('course_id', course.id)
    .eq('slug', params.lessonSlug)
    .single();

  if (!lesson) notFound();

  // 3. Entitlement check
  const { enrolled, userId } = await checkEntitlement({ courseId: course.id });

  const canAccess = lesson.is_preview || enrolled;

  if (!canAccess) {
    // Redirect to course landing page with paywall CTA
    redirect(`/courses/${params.slug}?paywall=1`);
  }

  // 4. Fetch quiz data (if applicable)
  let quizData: unknown = null;
  if (lesson.quiz_id) {
    const { data: quizRow } = await supabase
      .from('quizzes')
      .select(
        `id, external_id, title, pass_threshold, ai_generated,
         quiz_questions(id, order_index, type, prompt, choices, correct_answer, points, explanation)`
      )
      .eq('course_id', course.id)
      .eq('external_id', lesson.quiz_id)
      .single();
    quizData = quizRow;
  }

  // 5. Resolve sandbox URL (only send to browser if enrolled)
  const sandboxUrl: string =
    enrolled && lesson.sandbox_url ? lesson.sandbox_url : '';

  // Detect sandbox provider from URL
  const sandboxProvider = sandboxUrl.includes('stackblitz')
    ? 'stackblitz'
    : sandboxUrl.includes('codesandbox')
    ? 'codesandbox'
    : sandboxUrl.includes('codepen')
    ? 'codepen'
    : 'stackblitz';

  // 6. Build custom MDX components with runtime props injected
  const runtimeComponents = {
    // <SandboxEmbed /> in MDX → uses lesson's sandbox props
    SandboxEmbed: () => (
      <SandboxEmbed
        url={sandboxUrl}
        enrolled={enrolled}
        provider={sandboxProvider}
        courseSlug={params.slug}
        title={`${lesson.title} — Live Sandbox`}
      />
    ),
  };

  // 7. Compile MDX
  const lessonContent = await compileLessonMdx({
    bodyMd: lesson.body_md,
    components: runtimeComponents,
  });

  // 8. Fetch sibling lessons for navigation
  const { data: siblingLessons } = await supabase
    .from('lessons')
    .select('id, slug, title, order_index, is_preview')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true });

  const currentIndex = siblingLessons?.findIndex((l) => l.slug === params.lessonSlug) ?? -1;
  const prevLesson = currentIndex > 0 ? siblingLessons![currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < (siblingLessons?.length ?? 0) - 1
      ? siblingLessons![currentIndex + 1]
      : null;

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10 lg:px-8">
      {/* Sidebar — Table of Contents */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <nav aria-label="Course lessons">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {course.title}
          </p>
          <ul className="space-y-1">
            {siblingLessons?.map((l) => (
              <li key={l.id}>
                <a
                  href={`/courses/${params.slug}/lessons/${l.slug}`}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    l.slug === params.lessonSlug
                      ? 'bg-violet-100 font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="flex-1">{l.title}</span>
                  {l.is_preview && (
                    <span className="rounded px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-300 dark:text-green-400 dark:ring-green-700">
                      Free
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main lesson content */}
      <main className="min-w-0 flex-1">
        {/* Lesson header */}
        <header className="mb-8 border-b border-gray-200 pb-6 dark:border-gray-700">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <a href={`/courses/${params.slug}`} className="hover:text-violet-600">
              {course.title}
            </a>
            <span>›</span>
            <span>{lesson.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{lesson.title}</h1>
          {lesson.estimated_minutes && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              ~{lesson.estimated_minutes} min read
            </p>
          )}
        </header>

        {/* MDX content */}
        <article className="prose prose-gray max-w-none dark:prose-invert prose-headings:font-semibold prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 dark:prose-code:bg-gray-800">
          {lessonContent}
        </article>

        {/* Quiz (after lesson content) */}
        {lesson.quiz_id && quizData && (
          <div className="mt-10">
            <Quiz
              quiz={normalizeQuizData(quizData)}
              lessonId={lesson.id}
              courseId={course.id}
            />
          </div>
        )}

        {/* Lesson navigation */}
        <nav
          className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-700"
          aria-label="Lesson navigation"
        >
          {prevLesson ? (
            <a
              href={`/courses/${params.slug}/lessons/${prevLesson.slug}`}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm transition-colors hover:border-violet-300 hover:bg-violet-50 dark:border-gray-700 dark:hover:border-violet-700"
            >
              ← {prevLesson.title}
            </a>
          ) : (
            <div />
          )}
          {nextLesson ? (
            <a
              href={`/courses/${params.slug}/lessons/${nextLesson.slug}`}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              {nextLesson.title} →
            </a>
          ) : (
            <div className="rounded-lg bg-green-100 px-4 py-3 text-sm font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
              🎉 Course complete!
            </div>
          )}
        </nav>
      </main>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalize the Supabase quiz row (with quiz_questions join) into QuizFile shape
 * expected by the Quiz component.
 */
function normalizeQuizData(row: unknown): import('@teachrepo/types').QuizFile {
  const r = row as {
    external_id: string;
    title: string;
    pass_threshold: number;
    ai_generated: boolean;
    quiz_questions: Array<{
      order_index: number;
      type: string;
      prompt: string;
      choices: string[] | null;
      correct_answer: string;
      points: number;
      explanation: string | null;
    }>;
  };

  const questions = [...(r.quiz_questions ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => {
      if (q.type === 'multiple_choice') {
        return {
          type: 'multiple_choice' as const,
          prompt: q.prompt,
          choices: q.choices ?? [],
          answer: parseInt(q.correct_answer, 10),
          points: q.points,
          explanation: q.explanation ?? undefined,
        };
      }
      if (q.type === 'true_false') {
        return {
          type: 'true_false' as const,
          prompt: q.prompt,
          answer: q.correct_answer === 'true',
          points: q.points,
          explanation: q.explanation ?? undefined,
        };
      }
      return {
        type: 'short_answer' as const,
        prompt: q.prompt,
        answer: q.correct_answer,
        points: q.points,
        explanation: q.explanation ?? undefined,
      };
    });

  return {
    id: r.external_id,
    title: r.title,
    pass_threshold: r.pass_threshold,
    ai_generated: r.ai_generated,
    questions,
  };
}
