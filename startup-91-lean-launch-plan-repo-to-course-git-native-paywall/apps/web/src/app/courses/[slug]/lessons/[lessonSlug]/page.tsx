import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { checkEntitlement } from '@/lib/entitlement/check';
import { compileLessonMdx } from '@/lib/mdx/compile';
import { Quiz } from '@/components/lesson/Quiz';
import { SandboxEmbed } from '@/components/lesson/SandboxEmbed';
import { PaywallGate } from '@/components/lesson/PaywallGate';

interface LessonPageProps {
  params: { slug: string; lessonSlug: string };
  searchParams: { unlocking?: string; session_id?: string };
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const supabase = createServerClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('slug', params.slug)
    .single();

  if (!course) return { title: 'Lesson not found — TeachRepo' };

  const { data: lesson } = await supabase
    .from('lessons')
    .select('title, description')
    .eq('course_id', course.id)
    .eq('slug', params.lessonSlug)
    .single();

  return {
    title: lesson ? `${lesson.title} — ${course.title} | TeachRepo` : `${course.title} | TeachRepo`,
    description: lesson?.description ?? undefined,
  };
}

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  const supabase = createServerClient();
  const serviceSupa = createServiceClient();

  // ── 1. Fetch course ──────────────────────────────────────────────────────
  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title, price_cents, currency, pricing_model, published')
    .eq('slug', params.slug)
    .single();

  if (!course) notFound();

  // ── 2. Fetch lesson ──────────────────────────────────────────────────────
  const { data: lesson } = await serviceSupa
    .from('lessons')
    .select('id, slug, title, description, order_index, is_preview, estimated_minutes, content_md, sandbox_url, has_quiz, quiz_slug')
    .eq('course_id', course.id)
    .eq('slug', params.lessonSlug)
    .single();

  if (!lesson) notFound();

  // ── 3. Entitlement check ─────────────────────────────────────────────────
  const { enrolled } = await checkEntitlement({ courseId: course.id });

  // Determine if user just returned from Stripe Checkout
  const returningFromCheckout = !!searchParams.unlocking || !!searchParams.session_id;

  // If the lesson is locked:
  // - Returning from checkout: render inline PaywallGate with polling spinner
  // - Otherwise: redirect to course overview paywall
  if (!lesson.is_preview && !enrolled) {
    if (returningFromCheckout) {
      // Stay on the lesson page — PaywallGate will poll and reload when enrolled
      const isFree = course.price_cents === 0;
      const priceDisplay = isFree ? 'Free' : `$${(course.price_cents / 100).toFixed(0)} ${course.currency?.toUpperCase()}`;
      const checkoutHref = isFree
        ? `/api/enroll/free?course_id=${course.id}`
        : `/api/checkout?course_id=${course.id}`;

      return (
        <div className="min-h-screen bg-white">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <a href={`/courses/${params.slug}`} className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600">
              ← {course.title}
            </a>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
            <PaywallGate
              courseId={course.id}
              priceDisplay={priceDisplay}
              checkoutHref={checkoutHref}
              polling={true}
            />
          </div>
        </div>
      );
    }
    redirect(`/courses/${params.slug}?paywall=1`);
  }

  // ── 4. Sibling lessons for sidebar + nav ─────────────────────────────────
  const { data: siblings } = await serviceSupa
    .from('lessons')
    .select('id, slug, title, order_index, is_preview')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true });

  const idx = siblings?.findIndex((l) => l.slug === params.lessonSlug) ?? -1;
  const prev = idx > 0 ? siblings![idx - 1] : null;
  const next = idx >= 0 && idx < (siblings?.length ?? 0) - 1 ? siblings![idx + 1] : null;

  // ── 5. Fetch quiz (if lesson has one) ────────────────────────────────────
  let quizData: {
    id: string;
    title: string;
    pass_threshold: number;
    questions: Array<{
      id: string;
      question: string;
      question_type: 'multiple_choice' | 'true_false' | 'short_answer';
      options: string[] | null;
      correct_index: number | null;
      correct_bool: boolean | null;
      explanation: string | null;
      order_index: number;
    }>;
  } | null = null;

  if (lesson.has_quiz && lesson.quiz_slug) {
    const { data: quiz } = await serviceSupa
      .from('quizzes')
      .select('id, title, pass_threshold, lesson_id')
      .eq('course_id', course.id)
      .eq('slug', lesson.quiz_slug)
      .single();

    if (quiz) {
      const { data: questions } = await serviceSupa
        .from('quiz_questions')
        .select('id, question, question_type, options, correct_index, correct_bool, explanation, order_index')
        .eq('quiz_id', quiz.id)
        .order('order_index', { ascending: true });

      if (questions && questions.length > 0) {
        quizData = {
          id: quiz.id,
          title: quiz.title,
          pass_threshold: quiz.pass_threshold,
          questions: questions as NonNullable<typeof quizData>['questions'],
        };
      }
    }
  }

  // ── 6. Compile MDX ───────────────────────────────────────────────────────
  let renderedContent: React.ReactElement | null = null;
  try {
    renderedContent = await compileLessonMdx(lesson.content_md ?? '', {
      enrolled,
      courseSlug: params.slug,
    });
  } catch {
    // Fallback to plain text if MDX compilation fails
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-7xl gap-0 lg:gap-8 px-0 lg:px-8 py-0 lg:py-10">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-6">
            <a href={`/courses/${params.slug}`} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600">
              ← {course.title}
            </a>
            <nav aria-label="Course lessons">
              <ul className="space-y-0.5">
                {siblings?.map((l, i) => {
                  const isCurrent = l.slug === params.lessonSlug;
                  const isLocked = !l.is_preview && !enrolled;
                  return (
                    <li key={l.id}>
                      <a
                        href={isLocked ? `#locked` : `/courses/${params.slug}/lessons/${l.slug}`}
                        aria-disabled={isLocked || undefined}
                        tabIndex={isLocked ? -1 : undefined}
                        className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isCurrent
                            ? 'bg-violet-100 font-semibold text-violet-800'
                            : isLocked
                            ? 'cursor-default text-gray-400'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ring-1 ring-gray-200 bg-white">
                          {i + 1}
                        </span>
                        <span className="flex-1 leading-tight">{l.title}</span>
                        {l.is_preview && !isLocked && (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Free</span>
                        )}
                        {isLocked && <span className="text-gray-300">🔒</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 px-4 py-8 lg:px-0">

          {/* Lesson header */}
          <header className="mb-8 border-b border-gray-200 pb-6">
            {/* Mobile breadcrumb */}
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-500 lg:hidden">
              <a href={`/courses/${params.slug}`} className="hover:text-violet-600">{course.title}</a>
              <span>›</span>
              <span>{lesson.title}</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">{lesson.title}</h1>
              {lesson.is_preview && (
                <span className="flex-shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  Free preview
                </span>
              )}
            </div>

            {lesson.description && (
              <p className="mt-2 text-base text-gray-600">{lesson.description}</p>
            )}
            {lesson.estimated_minutes && (
              <p className="mt-2 text-sm text-gray-400">~{lesson.estimated_minutes} min read</p>
            )}
          </header>

          {/* Lesson body — MDX rendered */}
          <article className="prose prose-gray prose-headings:font-bold prose-h2:text-xl prose-h3:text-lg prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:text-sm prose-pre:rounded-xl prose-pre:bg-gray-900 max-w-none">
            {renderedContent ?? (
              <div className="whitespace-pre-wrap font-mono text-sm text-gray-700 rounded-xl bg-gray-50 p-5 leading-relaxed">
                {lesson.content_md}
              </div>
            )}
          </article>

          {/* Sandbox embed */}
          {lesson.sandbox_url && (
            <SandboxEmbed
              url={lesson.sandbox_url}
              enrolled={enrolled}
              title="Interactive Sandbox"
            />
          )}

          {/* Quiz */}
          {quizData && (
            <Quiz
              quizId={quizData.id}
              title={quizData.title}
              passThreshold={quizData.pass_threshold}
              questions={quizData.questions}
              courseId={course.id}
              lessonId={lesson.id}
            />
          )}

          {/* ── Lesson navigation ───────────────────────────────────────── */}
          <nav className="mt-12 flex items-center justify-between gap-4 border-t border-gray-200 pt-6">
            {prev ? (
              <a
                href={`/courses/${params.slug}/lessons/${prev.slug}`}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-violet-300 hover:text-violet-700"
              >
                <span>←</span>
                <span className="hidden sm:inline">{prev.title}</span>
                <span className="sm:hidden">Previous</span>
              </a>
            ) : <div />}

            {next ? (
              <a
                href={`/courses/${params.slug}/lessons/${next.slug}`}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                <span className="hidden sm:inline">{next.title}</span>
                <span className="sm:hidden">Next</span>
                <span>→</span>
              </a>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white">
                🎉 <span>Course complete!</span>
              </div>
            )}
          </nav>
        </main>
      </div>
    </div>
  );
}
