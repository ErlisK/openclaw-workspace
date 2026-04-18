import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

/**
 * GET /api/courses
 *
 * Public JSON endpoint for listing published courses.
 * Used by the marketplace page and any external consumers.
 *
 * Query params:
 *   q         — full-text title search
 *   price     — 'free' | 'paid'
 *   sort      — 'newest' (default) | 'popular' | 'price_asc'
 *   tags      — comma-separated list
 *   limit     — default 60, max 100
 *   offset    — for pagination, default 0
 */

const QuerySchema = z.object({
  q: z.string().optional(),
  price: z.enum(['free', 'paid', '']).optional(),
  sort: z.enum(['newest', 'popular', 'price_asc']).optional(),
  tags: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(60),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const parsed = QuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    price: searchParams.get('price') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    tags: searchParams.get('tags') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { q, price, sort = 'newest', tags, limit, offset } = parsed.data;
  const serviceSupa = createServiceClient();

  let query = serviceSupa
    .from('courses')
    .select(`
      id, slug, title, description, price_cents, currency, pricing_model,
      published_at, tags, version,
      creators!inner(id, display_name, avatar_url),
      lessons(id, is_preview, estimated_minutes),
      enrollments(id)
    `)
    .eq('published', true);

  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  if (price === 'free') {
    query = query.eq('price_cents', 0);
  } else if (price === 'paid') {
    query = query.gt('price_cents', 0);
  }

  if (tags) {
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      query = query.overlaps('tags', tagList);
    }
  }

  if (sort === 'price_asc') {
    query = query.order('price_cents', { ascending: true });
  } else {
    query = query.order('published_at', { ascending: false });
  }

  const { data: rawCourses, error, count } = await query
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const courses = (rawCourses ?? []).map((c: unknown) => {
    const row = c as {
      id: string; slug: string; title: string; description: string | null;
      price_cents: number; currency: string; pricing_model: string;
      published_at: string; tags: string[] | null; version: string | null;
      creators: { id: string; display_name: string; avatar_url: string | null }
        | { id: string; display_name: string; avatar_url: string | null }[];
      lessons: { id: string; is_preview: boolean; estimated_minutes: number | null }[];
      enrollments: { id: string }[];
    };

    const creator = Array.isArray(row.creators) ? row.creators[0] : row.creators;
    const lessons = row.lessons ?? [];
    const totalMinutes = lessons.reduce((s, l) => s + (l.estimated_minutes ?? 0), 0);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description ?? null,
      price_cents: row.price_cents,
      price_display: row.price_cents === 0
        ? 'Free'
        : `$${(row.price_cents / 100).toFixed(0)} ${(row.currency ?? 'usd').toUpperCase()}`,
      currency: row.currency ?? 'usd',
      pricing_model: row.pricing_model,
      version: row.version,
      tags: row.tags ?? [],
      published_at: row.published_at,
      creator: {
        id: creator?.id ?? null,
        display_name: creator?.display_name ?? 'unknown',
        avatar_url: creator?.avatar_url ?? null,
      },
      stats: {
        total_lessons: lessons.length,
        free_lessons: lessons.filter((l) => l.is_preview).length,
        total_minutes: totalMinutes,
        enrollment_count: (row.enrollments ?? []).length,
      },
      url: `/courses/${row.slug}`,
    };
  });

  // Sort by popularity post-fetch if needed
  if (sort === 'popular') {
    courses.sort((a, b) => b.stats.enrollment_count - a.stats.enrollment_count);
  }

  return NextResponse.json(
    {
      courses,
      total: count ?? courses.length,
      limit,
      offset,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
