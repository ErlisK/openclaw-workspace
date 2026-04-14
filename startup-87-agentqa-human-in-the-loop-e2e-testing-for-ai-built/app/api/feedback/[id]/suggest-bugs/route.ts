import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { gateway } from 'ai'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/feedback/[id]/suggest-bugs
 *
 * Generates suggested bug titles for a feedback record using AI.
 * Uses Haiku for speed/cost — titles are short and fast to generate.
 *
 * Sources used (in priority order):
 * 1. feedback.summary + repro_steps + expected_behavior + actual_behavior
 * 2. session_events (console errors + failed network requests)
 * 3. feedback_bugs already filed (to avoid duplicates)
 * 4. session ai_summary.key_issues (if available)
 *
 * Returns:
 * {
 *   suggestions: Array<{
 *     title: string              — suggested bug title (5-12 words)
 *     severity: string           — estimated severity
 *     area: string               — product area (authentication|navigation|forms|...)
 *     reason: string             — 1 sentence why this is likely a bug
 *     already_filed: boolean     — true if a bug with similar title already exists
 *   }>
 * }
 *
 * Auth: tester who owns the feedback.
 *
 * Caches result in feedback.suggested_bug_titles (jsonb).
 * Pass ?force=true to regenerate.
 */

const SuggestionItemSchema = z.object({
  title: z.string().describe('Concise bug title, 5-12 words, action-oriented'),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  area: z.enum([
    'authentication', 'navigation', 'forms', 'payments', 'api',
    'ui_layout', 'performance', 'data_display', 'search_filter',
    'notifications', 'file_upload', 'permissions', 'onboarding',
    'settings', 'other',
  ]),
  reason: z.string(),
  already_filed: z.boolean().default(false),
})

const SuggestionSchema = z.object({
  suggestions: z.array(SuggestionItemSchema).describe('3-8 suggested bug titles based on the test session data'),
})

export type BugSuggestions = z.infer<typeof SuggestionSchema>

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: feedbackId } = await params
  const force = new URL(req.url).searchParams.get('force') === 'true'

  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: feedback } = await admin
    .from('feedback')
    .select('id, tester_id, job_id, session_id, summary, repro_steps, expected_behavior, actual_behavior, bugs_found, suggested_bug_titles, feedback_bugs(*)')
    .eq('id', feedbackId)
    .single()

  if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  if (feedback.tester_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Return cached result if available and not forcing regeneration
  if (feedback.suggested_bug_titles && !force) {
    return NextResponse.json({
      suggestions: feedback.suggested_bug_titles,
      cached: true,
    })
  }

  // Fetch job context
  const { data: job } = await admin
    .from('test_jobs')
    .select('title, url, instructions')
    .eq('id', feedback.job_id)
    .single()

  // Fetch session events — focus on errors and failures
  type EventRow = { event_type: string | null; log_level?: string | null; log_message?: string | null; url?: string | null; method?: string | null; status_code?: number | null }
  let eventContext = ''
  if (feedback.session_id) {
    const { data: events } = await admin
      .from('session_events')
      .select('event_type, log_level, log_message, url, method, status_code')
      .eq('session_id', feedback.session_id)
      .order('ts', { ascending: true })
      .limit(100)

    const errEvents = (events as EventRow[] ?? []).filter(e =>
      (e.event_type === 'console_log' && (e.log_level === 'error' || e.log_level === 'warn')) ||
      (e.event_type === 'network_response' && e.status_code && e.status_code >= 400)
    )

    if (errEvents.length > 0) {
      eventContext = errEvents.slice(0, 20).map(e => {
        if (e.event_type === 'console_log') return `[console.${e.log_level}] ${e.log_message ?? ''}`
        return `[${e.status_code}] ${e.method ?? 'GET'} ${e.url ?? ''}`
      }).join('\n')
    }
  }

  // Fetch AI summary key_issues if available
  let summaryContext = ''
  if (feedback.session_id) {
    const { data: sess } = await admin
      .from('test_sessions')
      .select('ai_summary')
      .eq('id', feedback.session_id)
      .single()

    if (sess?.ai_summary) {
      const s = sess.ai_summary as Record<string, unknown>
      const keyIssues = s.key_issues as Array<{ title?: string }> | undefined
      if (keyIssues && keyIssues.length > 0) {
        summaryContext = 'AI summary identified these issues:\n' +
          keyIssues.map(i => `- ${i.title ?? ''}`).join('\n')
      }
    }
  }

  // Collect already-filed bug titles to flag duplicates
  type BugRow = { title?: string | null }
  const filedTitles = ((feedback.feedback_bugs as BugRow[] ?? [])).map(b => b.title ?? '').filter(Boolean)

  const prompt = `You are a QA assistant helping a tester write good bug reports for a web application.

App: ${job?.title ?? 'Unknown'} (${job?.url ?? 'Unknown'})
Testing instructions: ${job?.instructions ?? 'None provided'}

The tester has submitted this feedback:
Summary: ${feedback.summary ?? 'Not provided'}
${feedback.repro_steps ? `Repro steps: ${feedback.repro_steps}` : ''}
${feedback.expected_behavior ? `Expected behavior: ${feedback.expected_behavior}` : ''}
${feedback.actual_behavior ? `Actual behavior: ${feedback.actual_behavior}` : ''}

${eventContext ? `Session errors and failures detected:\n${eventContext}\n` : ''}
${summaryContext ? `\n${summaryContext}\n` : ''}
${filedTitles.length > 0 ? `\nBugs already filed by tester:\n${filedTitles.map(t => `- ${t}`).join('\n')}\n` : ''}

Generate 3-8 suggested bug titles that the tester should file based on the above data.

Requirements for titles:
- 5-12 words, action-oriented (e.g. "Login button does not respond to click")
- Specific enough to be searchable and actionable by a developer
- Cover different issues (don't repeat the same bug)
- Use the evidence from console errors and network failures where specific
- If similar to an already-filed bug, mark already_filed=true

Focus on: what broke, what failed to load, what errors appeared, what user actions had no effect.`

  try {
    const result = await generateObject({
      model: gateway('anthropic/claude-sonnet-4-5'),
      schema: SuggestionSchema,
      prompt,
    })

    // Cache in feedback.suggested_bug_titles
    try {
      await admin
        .from('feedback')
        .update({
          suggested_bug_titles: result.object.suggestions,
          suggested_bug_titles_generated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', feedbackId)
    } catch { /* cache failure is non-fatal */ }

    return NextResponse.json({
      suggestions: result.object.suggestions,
      cached: false,
    }, { status: 201 })
  } catch (err) {
    console.error('Bug suggestion error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/feedback/[id]/suggest-bugs
 * Returns cached suggestions (or 404 if none generated yet).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: feedbackId } = await params

  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: feedback } = await admin
    .from('feedback')
    .select('tester_id, suggested_bug_titles, suggested_bug_titles_generated_at')
    .eq('id', feedbackId)
    .single()

  if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  if (feedback.tester_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!feedback.suggested_bug_titles) return NextResponse.json({ error: 'No suggestions yet' }, { status: 404 })

  return NextResponse.json({
    suggestions: feedback.suggested_bug_titles,
    generated_at: feedback.suggested_bug_titles_generated_at,
    cached: true,
  })
}
