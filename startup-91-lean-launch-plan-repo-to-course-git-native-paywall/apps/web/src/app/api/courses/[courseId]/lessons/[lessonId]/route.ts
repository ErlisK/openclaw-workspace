import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { resolveUser } from '@/lib/auth/resolve-user';

// Use a direct client with service key, falling back to anon key if service key unavailable
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string; lessonId: string } }
) {
  const courseIdParsed = z.string().uuid().safeParse(params.courseId);
  const lessonIdParsed = z.string().uuid().safeParse(params.lessonId);
  if (!courseIdParsed.success || !lessonIdParsed.success) {
    return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 });
  }

  const supa = getSupabaseClient();
  const { data: lesson, error } = await supa
    .from('lessons')
    .select('id, slug, title, description, order_index, is_preview, estimated_minutes, content_md, sandbox_url, has_quiz, course_id')
    .eq('id', lessonIdParsed.data)
    .eq('course_id', courseIdParsed.data)
    .single();

  if (error || !lesson) {
    return NextResponse.json({ error: 'Not found', debug: error?.message }, { status: 404 });
  }

  if (!lesson.is_preview) {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: course } = await supa.from('courses').select('creator_id, price_cents').eq('id', courseIdParsed.data).single();
    const isCreator = course?.creator_id === user.id;
    if (!isCreator) {
      const { data: enrollment } = await supa
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseIdParsed.data)
        .is('entitlement_revoked_at', null)
        .maybeSingle();
      if (!enrollment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ lesson });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
