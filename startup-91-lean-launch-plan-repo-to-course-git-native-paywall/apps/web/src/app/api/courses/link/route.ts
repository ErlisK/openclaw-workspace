/**
 * POST /api/courses/link
 *
 * Called by `teachrepo link` — creates a course record if one doesn't exist,
 * or returns the existing one. Idempotent by slug + creator.
 *
 * Request body:
 *   { slug: string, title: string, courseYml?: string }
 *
 * Response:
 *   { courseId: string, slug: string, isNew: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

const RequestSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase kebab-case'),
  title: z.string().min(1).max(200).default('Untitled Course'),
  courseYml: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Validate input ──────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { slug, title } = parsed.data;
  const supabase = createServiceClient();

  // ── 3. Check if course already exists for this creator ────────────────
  const { data: existing } = await supabase
    .from('courses')
    .select('id, slug, title, published')
    .eq('slug', slug)
    .eq('creator_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { courseId: existing.id, slug: existing.slug, isNew: false },
      { status: 409 },
    );
  }

  // ── 4. Create new course ──────────────────────────────────────────────
  const { data: newCourse, error } = await supabase
    .from('courses')
    .insert({
      slug,
      title,
      description: '',
      creator_id: user.id,
      published: false,
      price_cents: 2900,
      currency: 'usd',
    })
    .select('id, slug, title')
    .single();

  if (error || !newCourse) {
    console.error('[courses/link] insert error:', error?.message);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }

  return NextResponse.json(
    { courseId: newCourse.id, slug: newCourse.slug, isNew: true },
    { status: 201 },
  );
}
