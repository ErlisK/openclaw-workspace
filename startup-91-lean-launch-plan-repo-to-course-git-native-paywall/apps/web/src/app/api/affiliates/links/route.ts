import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveUser } from '@/lib/auth/resolve-user';
import { randomBytes } from 'crypto';

const BodySchema = z.object({
  course_id: z.string().uuid(),
});

function generateCode(): string {
  return randomBytes(6).toString('base64url');
}

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error' }, { status: 400 });

  const supa = createServiceClient();

  // Verify user owns the course
  const { data: course } = await supa
    .from('courses')
    .select('id, creator_id, affiliate_pct')
    .eq('id', parsed.data.course_id)
    .single();

  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  if (course.creator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const code = generateCode();
  const { data: link, error } = await supa
    .from('affiliate_links')
    .insert({
      code,
      course_id: course.id,
      creator_id: user.id,
      commission_pct: course.affiliate_pct ?? 20,
    })
    .select()
    .single();

  if (error) {
    console.error('[affiliates/links] insert error:', error.message);
    return NextResponse.json({ error: 'Failed to create affiliate link' }, { status: 500 });
  }

  return NextResponse.json({ link }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
