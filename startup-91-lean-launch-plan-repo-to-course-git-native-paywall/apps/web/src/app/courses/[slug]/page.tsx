export const dynamic = 'force-dynamic';

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
    .select('title, description, price_cents, currency')
    .eq('slug', params.slug)
    .single();

  if (!course) return { title: 'Course not found — TeachRepo' };

  const canonicalUrl = `https://teachrepo.com/courses/${params.slug}`;
  const price = course.price_cents
    ? `$${(course.price_cents / 100).toFixed(2)}`
    : 'Free';

  return {
    title: `${course.title} | TeachRepo`,
    description: course.description ?? `Learn ${course.title} on TeachRepo — Git-native courses for engineers.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: course.title,
      description: course.description ?? `Learn ${course.title} on TeachRepo.`,
      url: canonicalUrl,
      siteName: 'TeachRepo',
      type: 'website',
      images: [{ url: `https://teachrepo.com/og-default.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${course.title} — ${price}`,
      description: course.description ?? `Git-native course by engineers, for engineers.`,
      images: [`https://teachrepo.com/og-default.png`],
    },
  };
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const supabase = createServerClient();
  const serviceSupa = createServiceClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title, description, price_cents, currency, pricing_model, version')
    .eq('slug', params.slug)
    .eq('published', true)
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

  // Build JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description ?? `Learn ${course.title} on TeachRepo.`,
    url: `https://teachrepo.com/courses/${params.slug}`,
    provider: {
      '@type': 'Organization',
      name: 'TeachRepo',
      url: 'https://teachrepo.com',
    },
    ...(creator?.display_name
      ? {
          author: {
            '@type': 'Person',
            name: creator.display_name,
            ...(creator.github_handle
              ? { url: `https://github.com/${creator.github_handle}` }
              : {}),
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: isFree ? '0' : (course.price_cents / 100).toFixed(2),
      priceCurrency: (course.currency ?? 'usd').toUpperCase(),
      availability: 'https://schema.org/InStock',
      url: `https://teachrepo.com/courses/${params.slug}`,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
    },
    numberOfCredits: lessons?.length ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 font-bold">
            <span className="text-xl">📚</span>
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent text-lg">TeachRepo</span>
          </a>
          <nav className="hidden sm:flex items-center gap-7 text-sm text-gray-400">
            <a href="/marketplace" className="hover:text-white transition-colors">Marketplace</a>
            <a href="/docs" className="hover:text-white transition-colors">Docs</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/auth/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign in</a>
            <a href="/auth/signup" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-all">Get started</a>
          </div>
        </div>
      </header>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="relative overflow-hidden border-b border-white/5 px-4 py-16 lg:px-8">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-600/[0.06] blur-3xl" />
        <div className="relative mx-auto max-w-4xl">
          {showPaywallBanner && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="text-sm font-semibold text-amber-200">This lesson requires enrollment</p>
                <p className="text-xs text-amber-400">Enroll below to access all paid lessons.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                  v{course.version ?? '1.0.0'}
                </span>
                {isFree && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    Free
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-white lg:text-4xl">{course.title}</h1>
              {course.description && (
                <p className="mt-3 text-lg text-gray-400 leading-relaxed">{course.description}</p>
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
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="mb-1 text-3xl font-bold text-white">{priceDisplay}</p>
                <p className="mb-4 text-sm text-gray-400">
                  {isFree ? 'No credit card required' : 'One-time purchase, lifetime access'}
                </p>

                {enrolled ? (
                  firstLesson && (
                    <a
                      href={`/courses/${params.slug}/lessons/${firstLesson.slug}`}
                      className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
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
                    className="mt-3 block w-full rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all"
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
        <h2 className="mb-6 text-xl font-bold text-white">Course content</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {lessons?.map((lesson, i) => {
            const isLocked = !lesson.is_preview && !enrolled;
            return (
              <div key={lesson.id} className="flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-gray-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {isLocked ? (
                    <p className="text-sm font-medium text-gray-400">{lesson.title}</p>
                  ) : (
                    <a
                      href={`/courses/${params.slug}/lessons/${lesson.slug}`}
                      className="text-sm font-medium text-white hover:text-violet-300 transition-colors"
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
                    <span className="text-xs text-gray-500">🧪 Quiz</span>
                  )}
                  {lesson.estimated_minutes && (
                    <span className="text-xs text-gray-500">{lesson.estimated_minutes}m</span>
                  )}
                  {lesson.is_preview ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">Free</span>
                  ) : isLocked ? (
                    <span className="text-gray-600 text-sm">🔒</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <a href="/" className="font-semibold text-white">TeachRepo</a>
          <nav className="flex flex-wrap gap-6 justify-center text-gray-500">
            <a href="/marketplace" className="hover:text-gray-300 transition-colors">Marketplace</a>
            <a href="/docs" className="hover:text-gray-300 transition-colors">Docs</a>
            <a href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
          </nav>
          <div className="text-xs text-gray-700">&copy; {new Date().getFullYear()} TeachRepo</div>
        </div>
      </footer>
    </div>
  );
}
