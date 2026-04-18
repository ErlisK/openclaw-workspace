import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';

export const metadata: Metadata = {
  title: 'Marketplace — TeachRepo',
  description:
    'Browse Git-native mini-courses built by engineers, for engineers. Buy once, access forever.',
  openGraph: {
    title: 'TeachRepo Marketplace',
    description: 'Git-native mini-courses for engineers',
    url: 'https://teachrepo.com/marketplace',
    siteName: 'TeachRepo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TeachRepo Marketplace',
    description: 'Git-native mini-courses for engineers',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseCard {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string | null;
  pricing_model: string | null;
  author_name: string;
  author_id: string | null;
  free_lesson_count: number;
  total_lesson_count: number;
  total_minutes: number;
  enrollment_count: number;
  published_at: string | null;
  tags: string[];
  version: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface MarketplacePageProps {
  searchParams: {
    tags?: string;
    price?: 'free' | 'paid';
    sort?: 'newest' | 'popular' | 'price_asc';
    q?: string;
  };
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const serviceSupa = createServiceClient();

  // Build query
  let query = serviceSupa
    .from('courses')
    .select(`
      id, slug, title, description, price_cents, currency, pricing_model,
      published_at, tags, version,
      creators!inner(id, display_name),
      lessons(id, is_preview, estimated_minutes),
      enrollments(id)
    `)
    .eq('published', true);

  if (searchParams.price === 'free') {
    query = query.eq('price_cents', 0);
  } else if (searchParams.price === 'paid') {
    query = query.gt('price_cents', 0);
  }

  if (searchParams.tags) {
    const tags = searchParams.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) query = query.overlaps('tags', tags);
  }

  if (searchParams.q) {
    query = query.ilike('title', `%${searchParams.q}%`);
  }

  const sort = searchParams.sort ?? 'newest';
  if (sort === 'price_asc') {
    query = query.order('price_cents', { ascending: true });
  } else {
    query = query.order('published_at', { ascending: false });
  }

  const { data: rawCourses } = await query.limit(60);

  const courses: CourseCard[] = (rawCourses ?? []).map((c: unknown) => {
    const row = c as {
      id: string; slug: string; title: string; description: string | null;
      price_cents: number; currency: string | null; pricing_model: string | null;
      published_at: string | null; tags: string[] | null; version: string | null;
      creators: { id: string; display_name: string }
        | { id: string; display_name: string }[];
      lessons: { id: string; is_preview: boolean; estimated_minutes: number | null }[];
      enrollments: { id: string }[];
    };
    const creator = Array.isArray(row.creators) ? row.creators[0] : row.creators;
    const lessons = row.lessons ?? [];
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      price_cents: row.price_cents,
      currency: row.currency,
      pricing_model: row.pricing_model,
      author_name: creator?.display_name ?? 'unknown',
      author_id: creator?.id ?? null,
      free_lesson_count: lessons.filter((l) => l.is_preview).length,
      total_lesson_count: lessons.length,
      total_minutes: lessons.reduce((s, l) => s + (l.estimated_minutes ?? 0), 0),
      enrollment_count: (row.enrollments ?? []).length,
      published_at: row.published_at,
      tags: row.tags ?? [],
      version: row.version,
    };
  });

  if (sort === 'popular') {
    courses.sort((a, b) => b.enrollment_count - a.enrollment_count);
  }

  const isFiltered = !!(searchParams.q || searchParams.price || searchParams.tags);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <span>🎓</span> TeachRepo Marketplace
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 lg:text-5xl">
              Learn from engineers,<br />
              <span className="text-violet-600">built in Git.</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Mini-courses authored in Markdown and version-controlled on GitHub.
              Buy once, fork anytime, learn at your own pace.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="/auth/signup"
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                Start creating →
              </a>
              <a
                href="#courses"
                className="text-sm font-medium text-gray-600 hover:text-violet-600"
              >
                Browse {courses.length} course{courses.length !== 1 ? 's' : ''} ↓
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8" id="courses">
        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {/* Search */}
          <form method="get" action="/marketplace" className="flex-1 min-w-48">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                name="q"
                type="search"
                defaultValue={searchParams.q}
                placeholder="Search courses…"
                className="w-full max-w-xs rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </form>

          {/* Price chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: 'All', value: '' },
              { label: '🎁 Free', value: 'free' },
              { label: '💳 Paid', value: 'paid' },
            ].map((opt) => (
              <a
                key={opt.value}
                href={buildUrl({ price: opt.value || undefined, sort, q: searchParams.q, tags: searchParams.tags })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  (searchParams.price ?? '') === opt.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-violet-300'
                }`}
              >
                {opt.label}
              </a>
            ))}

            <span className="text-gray-200 px-1">|</span>

            {/* Sort chips */}
            {[
              { label: 'Newest', value: 'newest' },
              { label: '🔥 Popular', value: 'popular' },
              { label: 'Price ↑', value: 'price_asc' },
            ].map((opt) => (
              <a
                key={opt.value}
                href={buildUrl({ sort: opt.value, price: searchParams.price, q: searchParams.q, tags: searchParams.tags })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </a>
            ))}
          </div>
        </div>

        {/* ── Results summary ──────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {courses.length === 0
              ? 'No courses found'
              : `${courses.length} course${courses.length !== 1 ? 's' : ''}`}
            {searchParams.q && (
              <> matching &ldquo;<strong>{searchParams.q}</strong>&rdquo;</>
            )}
          </p>
          {isFiltered && (
            <a href="/marketplace" className="text-xs text-violet-600 hover:underline">
              Clear filters ×
            </a>
          )}
        </div>

        {/* ── Course grid ──────────────────────────────────────────────── */}
        {courses.length === 0 ? (
          <EmptyState hasFilters={isFiltered} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="courses-grid">
            {courses.map((course) => (
              <CourseCardUI key={course.id} course={course} />
            ))}
          </div>
        )}

        {/* ── Become a creator CTA ─────────────────────────────────────── */}
        <div className="mt-16 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">Build your own course</h2>
          <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
            Write your curriculum in Markdown, push to GitHub, and publish your course in minutes.
            Keep 100% of revenue on the free tier.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="/auth/signup"
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Start for free →
            </a>
            <a
              href="https://github.com/ErlisK/openclaw-workspace/tree/main/sample-course"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-violet-300"
            >
              View sample repo ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Course card ───────────────────────────────────────────────────────────────

function CourseCardUI({ course }: { course: CourseCard }) {
  const isFree = course.price_cents === 0;
  const priceLabel = isFree
    ? 'Free'
    : `$${(course.price_cents / 100).toFixed(0)}`;

  const gradientClass = idToGradient(course.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Gradient banner */}
      <div className={`relative h-28 w-full ${gradientClass}`}>
        {/* Tags on banner */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {course.tags.slice(0, 3).map((tag) => (
            <a
              key={tag}
              href={buildUrl({ tags: tag })}
              className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30"
            >
              {tag}
            </a>
          ))}
        </div>
        {/* Version badge */}
        {course.version && (
          <div className="absolute right-3 top-3">
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs font-mono text-white backdrop-blur-sm">
              v{course.version}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title */}
        <h2 className="mb-1 font-bold text-gray-900 group-hover:text-violet-700 leading-snug line-clamp-2">
          <a href={`/courses/${course.slug}`} className="stretched-link">
            {course.title}
          </a>
        </h2>

        {/* Author */}
        <p className="mb-3 text-xs text-gray-500">
          by <span className="font-medium text-gray-700">{course.author_name}</span>
        </p>

        {/* Description */}
        {course.description && (
          <p className="mb-4 flex-1 line-clamp-2 text-sm text-gray-600">
            {course.description}
          </p>
        )}

        {/* Stats row */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>{course.total_lesson_count} lesson{course.total_lesson_count !== 1 ? 's' : ''}</span>
          {course.total_minutes > 0 && (
            <>
              <span>·</span>
              <span>~{course.total_minutes} min</span>
            </>
          )}
          {course.free_lesson_count > 0 && (
            <>
              <span>·</span>
              <span className="text-green-600 font-medium">
                {course.free_lesson_count} free preview{course.free_lesson_count !== 1 ? 's' : ''}
              </span>
            </>
          )}
          {course.enrollment_count > 0 && (
            <>
              <span>·</span>
              <span>{course.enrollment_count.toLocaleString()} student{course.enrollment_count !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-3 mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-extrabold ${
                isFree ? 'text-green-600' : 'text-gray-900'
              }`}
            >
              {priceLabel}
            </span>
            {!isFree && (
              <span className="text-xs text-gray-400">one-time</span>
            )}
          </div>

          <a
            href={`/courses/${course.slug}`}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              isFree
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {isFree ? 'Enroll free →' : 'View course →'}
          </a>
        </div>
      </div>
    </article>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-5xl" aria-hidden="true">📚</span>
      <h2 className="mt-4 text-xl font-semibold text-gray-900">No courses found</h2>
      <p className="mt-2 text-sm text-gray-500">
        {hasFilters ? (
          <>
            Try adjusting your filters or{' '}
            <a href="/marketplace" className="text-violet-600 underline">clear all filters</a>.
          </>
        ) : (
          <>Be the first to publish a course on TeachRepo!</>
        )}
      </p>
      {!hasFilters && (
        <a
          href="/auth/signup"
          className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Start creating →
        </a>
      )}
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function buildUrl(params: { sort?: string; price?: string; tags?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params.sort && params.sort !== 'newest') sp.set('sort', params.sort);
  if (params.price) sp.set('price', params.price);
  if (params.tags) sp.set('tags', params.tags);
  if (params.q) sp.set('q', params.q);
  const qs = sp.toString();
  return `/marketplace${qs ? `?${qs}` : ''}`;
}

function idToGradient(id: string): string {
  const gradients = [
    'bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500',
    'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600',
    'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500',
    'bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500',
    'bg-gradient-to-br from-slate-500 via-gray-600 to-zinc-700',
    'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600',
    'bg-gradient-to-br from-lime-500 via-green-500 to-emerald-600',
  ];
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}
