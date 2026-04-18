import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Marketplace — TeachRepo',
  description:
    'Browse Git-native mini-courses built by engineers, for engineers. Buy once, access forever.',
  openGraph: {
    title: 'TeachRepo Marketplace',
    description: 'Git-native mini-courses for engineers',
    url: 'https://teachrepo.com/marketplace',
    siteName: 'TeachRepo',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  pricing_model: string;
  author_handle: string;
  free_lesson_count: number;
  total_lesson_count: number;
  enrollment_count: number;
  published_at: string;
  tags: string[];
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
  const supabase = createServerClient();

  // Build query
  let query = supabase
    .from('courses')
    .select(
      `
      id, slug, title, description, price_cents, currency, pricing_model, published_at, tags,
      creators!inner(handle),
      lessons(id, is_preview),
      enrollments(id)
    `
    )
    .eq('published', true);

  // Price filter
  if (searchParams.price === 'free') {
    query = query.eq('pricing_model', 'free');
  } else if (searchParams.price === 'paid') {
    query = query.neq('pricing_model', 'free');
  }

  // Tag filter
  if (searchParams.tags) {
    const tags = searchParams.tags.split(',').map((t) => t.trim());
    query = query.overlaps('tags', tags);
  }

  // Text search
  if (searchParams.q) {
    query = query.ilike('title', `%${searchParams.q}%`);
  }

  // Sort
  const sort = searchParams.sort ?? 'newest';
  if (sort === 'price_asc') {
    query = query.order('price_cents', { ascending: true });
  } else if (sort === 'popular') {
    // popularity = enrollment_count — handled client-side since it's computed
    query = query.order('published_at', { ascending: false });
  } else {
    query = query.order('published_at', { ascending: false });
  }

  const { data: rawCourses, error } = await query.limit(60);

  if (error) {
    console.error('[marketplace] query error:', error.message);
  }

  // Normalize to CourseCard shape
  const courses: CourseCard[] = (rawCourses ?? []).map((c: unknown) => {
    const row = c as {
      id: string; slug: string; title: string; description: string;
      price_cents: number; currency: string; pricing_model: string;
      published_at: string; tags: string[];
      creators: { handle: string } | { handle: string }[];
      lessons: { id: string; is_preview: boolean }[];
      enrollments: { id: string }[];
    };
    const creator = Array.isArray(row.creators) ? row.creators[0] : row.creators;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      price_cents: row.price_cents,
      currency: row.currency,
      pricing_model: row.pricing_model,
      author_handle: creator?.handle ?? 'unknown',
      free_lesson_count: (row.lessons ?? []).filter((l) => l.is_preview).length,
      total_lesson_count: (row.lessons ?? []).length,
      enrollment_count: (row.enrollments ?? []).length,
      published_at: row.published_at,
      tags: row.tags ?? [],
    };
  });

  // Sort by popularity post-fetch if needed
  if (sort === 'popular') {
    courses.sort((a, b) => b.enrollment_count - a.enrollment_count);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Marketplace
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Git-native mini-courses built by engineers, for engineers.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <SearchBar defaultValue={searchParams.q} />

        <FilterChips
          currentPrice={searchParams.price}
          currentSort={sort}
          currentTags={searchParams.tags}
        />
      </div>

      {/* Results count */}
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {courses.length} course{courses.length !== 1 ? 's' : ''}
        {searchParams.q ? ` matching "${searchParams.q}"` : ''}
      </p>

      {/* Course grid */}
      {courses.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCardComponent key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CourseCardComponent({ course }: { course: CourseCard }) {
  const priceLabel =
    course.pricing_model === 'free' || course.price_cents === 0
      ? 'Free'
      : `$${(course.price_cents / 100).toFixed(0)}`;

  const gradientClass = hashToGradient(course.id);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Course thumbnail / gradient */}
      <div className={`h-32 w-full ${gradientClass} flex items-end p-4`}>
        {course.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="mr-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="mb-1 font-semibold text-gray-900 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-400">
          {course.title}
        </h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          by @{course.author_handle}
        </p>
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-gray-700 dark:text-gray-300">
          {course.description}
        </p>

        {/* Stats row */}
        <div className="mb-4 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{course.total_lesson_count} lessons</span>
          {course.free_lesson_count > 0 && (
            <>
              <span>·</span>
              <span className="text-green-600 dark:text-green-400">
                {course.free_lesson_count} free preview{course.free_lesson_count !== 1 ? 's' : ''}
              </span>
            </>
          )}
          {course.enrollment_count > 0 && (
            <>
              <span>·</span>
              <span>{course.enrollment_count.toLocaleString()} students</span>
            </>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <span
            className={`text-lg font-bold ${
              course.pricing_model === 'free'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {priceLabel}
          </span>
          <span className="rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-950 dark:text-violet-300">
            Preview →
          </span>
        </div>
      </div>
    </Link>
  );
}

function SearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="get" action="/marketplace" className="flex-1">
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search courses…"
        className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />
    </form>
  );
}

function FilterChips({
  currentPrice,
  currentSort,
  currentTags,
}: {
  currentPrice?: string;
  currentSort: string;
  currentTags?: string;
}) {
  const priceOptions: Array<{ label: string; value: string }> = [
    { label: 'All', value: '' },
    { label: 'Free', value: 'free' },
    { label: 'Paid', value: 'paid' },
  ];

  const sortOptions: Array<{ label: string; value: string }> = [
    { label: 'Newest', value: 'newest' },
    { label: 'Popular', value: 'popular' },
    { label: 'Price ↑', value: 'price_asc' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {priceOptions.map((opt) => (
        <a
          key={opt.value}
          href={buildFilterUrl({ price: opt.value || undefined, sort: currentSort, tags: currentTags })}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            (currentPrice ?? '') === opt.value
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {opt.label}
        </a>
      ))}
      <span className="text-gray-300 dark:text-gray-600">|</span>
      {sortOptions.map((opt) => (
        <a
          key={opt.value}
          href={buildFilterUrl({ sort: opt.value, price: currentPrice, tags: currentTags })}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            currentSort === opt.value
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {opt.label}
        </a>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl" aria-hidden="true">📚</p>
      <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
        No courses found
      </h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Try adjusting your filters or{' '}
        <a href="/marketplace" className="text-violet-600 underline">
          clear all filters
        </a>
      </p>
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function buildFilterUrl(params: {
  sort?: string;
  price?: string;
  tags?: string;
  q?: string;
}) {
  const sp = new URLSearchParams();
  if (params.sort && params.sort !== 'newest') sp.set('sort', params.sort);
  if (params.price) sp.set('price', params.price);
  if (params.tags) sp.set('tags', params.tags);
  if (params.q) sp.set('q', params.q);
  const qs = sp.toString();
  return `/marketplace${qs ? `?${qs}` : ''}`;
}

/** Deterministic gradient class from course ID hash */
function hashToGradient(id: string): string {
  const gradients = [
    'bg-gradient-to-br from-violet-500 to-indigo-600',
    'bg-gradient-to-br from-blue-500 to-cyan-600',
    'bg-gradient-to-br from-emerald-500 to-teal-600',
    'bg-gradient-to-br from-amber-500 to-orange-600',
    'bg-gradient-to-br from-rose-500 to-pink-600',
    'bg-gradient-to-br from-slate-600 to-gray-700',
  ];
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}
