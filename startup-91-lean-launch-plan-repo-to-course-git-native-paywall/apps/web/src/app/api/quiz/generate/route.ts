/**
 * POST /api/quiz/generate
 *
 * Generates quiz questions for a lesson using Vercel AI Gateway.
 * Called by the TeachRepo CLI (`teachrepo quiz generate`) and the creator dashboard.
 *
 * Request body:
 *   { lessonContent: string, numQuestions?: number, quizId?: string }
 *
 * Response:
 *   { yaml: string, questions: QuizQuestion[], quizId: string }
 *
 * Auth: Bearer token (creator must be authenticated)
 *
 * AI: Uses Vercel AI Gateway (VERCEL_OIDC_TOKEN auto-injected at runtime).
 * Only works on deployed Vercel functions — not in local dev.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackAiQuizGenerated } from '@/lib/analytics/server';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';
import { checkCreatorFeature } from '@/lib/entitlement/check';

import { generateObject } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from 'zod';

// ── Input validation ─────────────────────────────────────────────────────────
const RequestSchema = z.object({
  lessonContent: z.string().max(50000).optional(),  // optional if lessonId provided
  lessonId: z.string().uuid().optional(),            // fetch content from DB if provided
  numQuestions: z.number().int().min(1).max(10).default(3),
  quizId: z.string().optional(),
});

// ── Output schema ────────────────────────────────────────────────────────────
const QuestionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('multiple_choice'),
    prompt: z.string().min(10),
    choices: z.array(z.string()).length(4),
    answer: z.number().int().min(0).max(3),
    points: z.number().int().min(1).max(3).default(1),
    explanation: z.string().min(10),
  }),
  z.object({
    type: z.literal('true_false'),
    prompt: z.string().min(10),
    answer: z.boolean(),
    points: z.number().int().min(1).max(2).default(1),
    explanation: z.string().min(10),
  }),
]);

const QuizSchema = z.object({
  title: z.string(),
  questions: z.array(QuestionSchema).min(1).max(10),
});

// ── YAML serialiser ───────────────────────────────────────────────────────────
function questionsToYaml(quizId: string, title: string, questions: z.infer<typeof QuizSchema>['questions']): string {
  const lines: string[] = [
    `id: "${quizId}"`,
    `title: "${title}"`,
    `pass_threshold: 70`,
    `ai_generated: true`,
    ``,
    `questions:`,
  ];

  for (const q of questions) {
    lines.push(`  - type: ${q.type}`);
    lines.push(`    prompt: "${q.prompt.replace(/"/g, '\\"')}"`);

    if (q.type === 'multiple_choice') {
      lines.push(`    choices:`);
      for (const c of q.choices) {
        lines.push(`      - "${c.replace(/"/g, '\\"')}"`);
      }
      lines.push(`    answer: ${q.answer}`);
    } else if (q.type === 'true_false') {
      lines.push(`    answer: ${q.answer}`);
    }

    lines.push(`    points: ${q.points}`);
    lines.push(`    explanation: "${q.explanation.replace(/"/g, '\\"')}"`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. Auth (creator must be logged in) ──────────────────────────────────
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 1b. Check monthly AI quiz quota for free plan ────────────────────
  const { plan: creatorPlan } = await checkCreatorFeature(user.id, 'aiQuizzesPerMonth');
  if (creatorPlan === 'free') {
    // Count AI quizzes this calendar month
    const supa2 = createServiceClient();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const { count } = await supa2
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('event_name', 'ai_quiz_generated')
      .gte('created_at', monthStart.toISOString());
    if ((count ?? 0) >= 3) {
      return NextResponse.json({
        error: 'Free plan limit: 3 AI quiz generations per month. Upgrade to Creator for unlimited.',
        upgradeUrl: '/pricing',
        plan: creatorPlan,
      }, { status: 402 });
    }
  }

  // ── 2. Parse + validate input ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { lessonContent: inputContent, lessonId, numQuestions, quizId: inputQuizId } = parsed.data;

  // If lessonId provided but no content, fetch from DB
  let lessonContent = inputContent || '';
  if (lessonId && !lessonContent) {
    const supa = createServiceClient();
    const { data: lessonRow } = await supa
      .from('lessons')
      .select('content_md, title, slug, is_preview, course_id')
      .eq('id', lessonId)
      .single();
    if (!lessonRow) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    // IDOR fix: verify creator or enrollment access for non-preview lessons
    if (!lessonRow.is_preview) {
      const { data: lessonCourse } = await supa.from('courses').select('creator_id').eq('id', lessonRow.course_id).single();
      const isCreator = lessonCourse?.creator_id === user.id;
      if (!isCreator) {
        const { data: enrollment } = await supa.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', lessonRow.course_id).is('entitlement_revoked_at', null).maybeSingle();
        if (!enrollment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    lessonContent = lessonRow.content_md || '';
    if (!lessonContent || lessonContent.length < 50) {
      return NextResponse.json(
        { error: 'Lesson content is too short to generate a quiz (need at least 50 chars)' },
        { status: 400 },
      );
    }
  } else if (!lessonContent || lessonContent.length < 50) {
    return NextResponse.json(
      { error: 'lessonContent must be at least 50 characters, or provide a lessonId' },
      { status: 400 },
    );
  }

  // Extract lesson title from frontmatter (for quiz title)
  const titleMatch = lessonContent.match(/^---\r?\n[\s\S]*?title:\s*["']?([^"'\n]+)["']?/m);
  const slugMatch = lessonContent.match(/^---\r?\n[\s\S]*?slug:\s*["']?([^"'\n]+)["']?/m);

  const lessonTitle = titleMatch?.[1]?.trim() || 'Lesson';
  const lessonSlug = slugMatch?.[1]?.trim() || 'lesson';
  const quizId = inputQuizId || `${lessonSlug}-quiz`;

  // Strip frontmatter from lesson content for cleaner AI input
  const lessonBody = lessonContent.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();

  // ── 3. Generate quiz via AI ───────────────────────────────────────────────
  try {
    const { object: quiz } = await generateObject({
      model: gateway('anthropic/claude-haiku-4-5'),
      schema: QuizSchema,
      prompt: `You are a professional course quiz author. Generate exactly ${numQuestions} quiz questions for the following lesson content.

Guidelines:
- Questions must test understanding of concepts taught in this specific lesson
- Multiple choice: 4 plausible options, only one clearly correct
- True/false: use for clear factual statements, not ambiguous ones
- Vary question difficulty: ~60% medium, ~30% easy, ~10% hard
- Explanations should be educational (explain WHY the answer is correct)
- Use the exact terminology from the lesson
- Never ask trick questions
- Question types: use a mix of multiple_choice and true_false

Lesson title: "${lessonTitle}"

Lesson content:
${lessonBody.slice(0, 8000)}

Generate ${numQuestions} quiz questions.`,
    });

    const yaml = questionsToYaml(quizId, `${lessonTitle} — Check Your Understanding`, quiz.questions);

    // Track AI quiz generation for discovery analytics
    void trackAiQuizGenerated({ userId: user.id, properties: { lessonId, quizId, numGenerated: quiz.questions.length } });

    return NextResponse.json({
      yaml,
      quizId,
      questions: quiz.questions,
      title: `${lessonTitle} — Check Your Understanding`,
      numGenerated: quiz.questions.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // AI Gateway not available in local dev (no VERCEL_OIDC_TOKEN)
    if (msg.includes('VERCEL_OIDC_TOKEN') || msg.includes('OIDC') || msg.includes('gateway')) {
      return NextResponse.json(
        {
          error: 'AI quiz generation requires a deployed Vercel environment',
          hint: 'Deploy to Vercel and call this endpoint from there. Local dev does not have VERCEL_OIDC_TOKEN.',
        },
        { status: 503 },
      );
    }

    console.error('[quiz/generate] AI error:', msg);
    return NextResponse.json({ error: 'AI generation failed', detail: msg }, { status: 500 });
  }
}
