import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { checkEntitlement } from '@/lib/entitlement/check';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

interface CoursePageProps {
  params: { slug: string };
  searchParams: { paywall?: string };
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const supabase = createServerClient();
  const { data: course } = await supabase
    .from('courses')
    .select('title, description')
    .eq('slug', params.slug)
    .single();

  if (!course) return { title: 'Course not found — TeachRepo' };
  return {
    title: `${course.title} | TeachRepo`,
    description: course.description ?? undefined,
  };
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const supabase = createServerClient();
  const serviceSupa = createServiceClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title, description, price_cents, currency, pricing_model, version')
    .eq('slug', params.slug)
    .single();

  if (!course) notFound();

  // Fetch creator info
  const { data: creator } = await serviceSupa
    .from('creators')
    .select('id, display_name, avatar_url, bio, github_handle, twitter_handle')
    .eq('id', (
      await serviceSupa.from('courses').select('creator_id').eq('id', course.id).single()
    ).data?.creator_id ?? '')
    .single();

  const { data: lessons } = await serviceSupa
    .from('lessons')
    .select('id, slug, title, description, order_index, is_preview, estimated_minutes, has_quiz')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true });

  const { enrolled } = await checkEntitlement({ courseId: course.id });
  const showPaywallBanner = searchParams.paywall === '1' && !enrolled;

  const firstLesson = lessons?.[0];
  const isFree = course.price_cents === 0;
  const priceDisplay = isFree ? 'Free' : `$${(course.price_cents / 100).toFixed(0)} ${course.currency?.toUpperCase()}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="border-b border-gray-200 bg-gradient-to-br from-violet-50 to-white px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {showPaywallBanner && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">This lesson requires enrollment</p>
                <p className="text-xs text-amber-700">Enroll below to access all paid lessons.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                  v{course.version ?? '1.0.0'}
                </span>
                {isFree && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Free
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 lg:text-4xl">{course.title}</h1>
              {course.description && (
                <p className="mt-3 text-lg text-gray-600">{course.description}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {lessons && (
                  <span>📚 {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</span>
                )}
                {lessons && (
                  <span>⏱ ~{lessons.reduce((s, l) => s + (l.estimated_minutes ?? 0), 0)} min</span>
                )}
                {creator?.display_name && (
                  <span>👤 {creator.display_name}</span>
                )}
              </div>
            </div>

            {/* Enroll card */}
            <div className="w-full lg:w-72 flex-shrink-0">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="mb-1 text-3xl font-bold text-gray-900">{priceDisplay}</p>
                <p className="mb-4 text-sm text-gray-500">
                  {isFree ? 'No credit card required' : 'One-time purchase, lifetime access'}
                </p>

                {enrolled ? (
                  firstLesson && (
                    <a
                      href={`/courses/${params.slug}/lessons/${firstLesson.slug}`}
                      className="block w-full rounded-xl bg-green-600 py-3 text-center text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Continue learning →
                    </a>
                  )
                ) : (
                  <CheckoutButton
                    courseId={course.id}
                    courseSlug={params.slug}
                    priceDisplay={priceDisplay}
                    isFree={isFree}
                  />
                )}

                {firstLesson?.is_preview && !enrolled && (
                  <a
                    href={`/courses/${params.slug}/lessons/${firstLesson.slug}`}
                    className="mt-3 block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Preview first lesson
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson list */}
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <h2 className="mb-6 text-xl font-bold text-gray-900">Course content</h2>
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200">
          {lessons?.map((lesson, i) => {
            const isLocked = !lesson.is_preview && !enrolled;
            return (
              <div key={lesson.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {isLocked ? (
                    <p className="text-sm font-medium text-gray-700">{lesson.title}</p>
                  ) : (
                    <a
                      href={`/courses/${params.slug}/lessons/${lesson.slug}`}
                      className="text-sm font-medium text-gray-700 hover:text-violet-700"
                    >
                      {lesson.title}
                    </a>
                  )}
                  {lesson.description && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{lesson.description}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {lesson.has_quiz && (
                    <span className="text-xs text-gray-400">🧪 Quiz</span>
                  )}
                  {lesson.estimated_minutes && (
                    <span className="text-xs text-gray-400">{lesson.estimated_minutes}m</span>
                  )}
                  {lesson.is_preview ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Free</span>
                  ) : isLocked ? (
                    <span className="text-gray-300 text-sm">🔒</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
