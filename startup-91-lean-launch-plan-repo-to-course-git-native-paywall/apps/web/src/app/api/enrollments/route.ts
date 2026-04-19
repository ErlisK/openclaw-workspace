import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveUser } from '@/lib/auth/resolve-user';

const BodySchema = z.object({ courseId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error' }, { status: 400 });

  const { courseId } = parsed.data;
  const supa = createServiceClient();

  const { data: course } = await supa.from('courses').select('id, price_cents').eq('id', courseId).single();
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  if (course.price_cents > 0) return NextResponse.json({ error: 'Course is not free' }, { status: 400 });

  const { data: enrollment, error } = await supa
    .from('enrollments')
    .upsert(
      { user_id: user.id, course_id: courseId, entitlement_granted_at: new Date().toISOString(), entitlement_revoked_at: null },
      { onConflict: 'user_id,course_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  return NextResponse.json({ enrollment }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
