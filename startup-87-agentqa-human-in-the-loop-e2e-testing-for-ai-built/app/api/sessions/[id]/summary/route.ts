import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { gateway } from 'ai'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/sessions/[id]/summary
 *
 * Generates a structured AI summary of a test session.
 * Reads session_events (network + console) and feedback for context.
 *
 * Returns:
 * {
 *   overall_assessment: string        — one-sentence verdict
 *   what_worked: string[]             — bullets of positives
 *   issues_found: string[]            — bullets of problems
 *   network_observations: string[]    — network anomalies
 *   console_observations: string[]    — console errors/warnings
 *   priority_fixes: string[]          — ordered fix recommendations
 *   tester_sentiment: 'positive'|'neutral'|'negative'
 *   confidence: 'high'|'medium'|'low' — based on data volume
 * }
 *
 * Auth: tester who owns the session, or client who owns the job.
 */

const IssueSchema = z.object({
  title: z.string().describe('Short issue title (5-10 words)'),
  severity: z.enum(['critical', 'high', 'medium', 'low']).describe('Impact severity'),
  description: z.string().describe('Clear description of what went wrong (1-3 sentences)'),
  repro_steps: z.array(z.string()).describe('Numbered steps to reproduce this issue. Each step is a single concrete action.'),
  expected: z.string().describe('What the user expected to happen'),
  actual: z.string().describe('What actually happened'),
  evidence: z.string().optional().describe('Supporting evidence: console error message, HTTP status code, or specific UI element observed'),
})

const SummarySchema = z.object({
  overall_assessment: z.string().describe('One-sentence verdict on the app quality and test result'),
  what_worked: z.array(z.string()).describe('Bullet list of things that worked correctly during testing'),
  key_issues: z.array(IssueSchema).describe('Structured list of key issues found, each with repro steps. Max 8 issues, ordered by severity.'),
  issues_found: z.array(z.string()).describe('Quick summary bullet list of bugs/problems (one line each, same issues as key_issues but condensed)'),
  network_observations: z.array(z.string()).describe('Notable network request observations (errors, slow calls, unexpected calls)'),
  console_observations: z.array(z.string()).describe('Notable console errors, warnings, or log anomalies'),
  priority_fixes: z.array(z.string()).describe('Ordered list of recommended fixes, most critical first'),
  tester_sentiment: z.enum(['positive', 'neutral', 'negative']).describe('Overall sentiment inferred from the testing session'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level in the summary based on data volume and feedback quality'),
})

export type SessionSummary = z.infer<typeof SummarySchema>

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch session + job
  const { data: session } = await admin
    .from('test_sessions')
    .select('id, tester_id, job_id, status, started_at, ended_at, notes, end_reason')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Fetch job for context
  const { data: job } = await admin
    .from('test_jobs')
    .select('title, url, tier, instructions, client_id')
    .eq('id', session.job_id)
    .single()

  // Auth check: tester or client
  const isTester = session.tester_id === user.id
  const isClient = job?.client_id === user.id
  if (!isTester && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch session events (limit to most recent 200 for context window)
  const { data: events } = await admin
    .from('session_events')
    .select('event_type, ts, url, method, status_code, log_level, log_message, element_selector')
    .eq('session_id', sessionId)
    .order('ts', { ascending: true })
    .limit(200)

  // Fetch feedback
  const { data: feedbackRows } = await admin
    .from('feedback')
    .select('overall_rating, summary, repro_steps, expected_behavior, actual_behavior, bugs_found, feedback_bugs(*)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(3)

  // If summary already cached in DB, return it (cache by session)
  const { data: cached } = await admin
    .from('test_sessions')
    .select('ai_summary')
    .eq('id', sessionId)
    .single()

  // Force re-generation if ?force=true
  const force = new URL(req.url).searchParams.get('force') === 'true'
  if (cached?.ai_summary && !force) {
    return NextResponse.json({ summary: cached.ai_summary, cached: true })
  }

  type EventRow = {
    event_type: string | null
    ts: string | null
    url: string | null
    method: string | null
    status_code: number | null
    log_level: string | null
    log_message: string | null
    element_selector: string | null
  }

  // Build context
  const networkEvents = (events as EventRow[] ?? []).filter(e =>
    e.event_type === 'network_request' || e.event_type === 'network_response'
  )
  const consoleEvents = (events as EventRow[] ?? []).filter(e => e.event_type === 'console_log')
  const navEvents = (events as EventRow[] ?? []).filter(e => e.event_type === 'navigation')
  const clickEvents = (events as EventRow[] ?? []).filter(e => e.event_type === 'click')

  const networkSummary = networkEvents.slice(0, 40).map((e: EventRow) =>
    `[${e.event_type}] ${e.method ?? ''} ${e.url ?? ''} ${e.status_code ? `→ ${e.status_code}` : ''}`
  ).join('\n')

  const consoleSummary = consoleEvents.slice(0, 30).map((e: EventRow) =>
    `[${e.log_level ?? 'log'}] ${e.log_message ?? ''}`
  ).join('\n')

  const navSummary = navEvents.slice(0, 20).map((e: EventRow) =>
    `Navigated to: ${e.url ?? ''}`
  ).join('\n')

  const clickSummary = clickEvents.slice(0, 20).map((e: EventRow) =>
    `Clicked: ${e.element_selector ?? '(unknown)'}`
  ).join('\n')

  type FbRow = { overall_rating?: number | null; summary?: string | null; repro_steps?: string | null; expected_behavior?: string | null; actual_behavior?: string | null; bugs_found?: number | null; feedback_bugs?: unknown }
  const feedbackSummary = ((feedbackRows ?? []) as FbRow[]).map((fb: FbRow) => {
    const bugs = (fb.feedback_bugs as Array<{title?: string; severity?: string; description?: string}> | null) ?? []
    return `
Rating: ${fb.overall_rating ?? 'N/A'}/5
Summary: ${fb.summary ?? ''}
${fb.repro_steps ? `Repro steps: ${fb.repro_steps}` : ''}
${fb.expected_behavior ? `Expected: ${fb.expected_behavior}` : ''}
${fb.actual_behavior ? `Actual: ${fb.actual_behavior}` : ''}
Bugs found: ${fb.bugs_found ?? 0}
${bugs.length > 0 ? 'Bugs:\n' + bugs.map(b => `  - [${b.severity ?? 'medium'}] ${b.title ?? ''}: ${b.description ?? ''}`).join('\n') : ''}
`.trim()
  }).join('\n\n---\n\n')

  const sessionNotes = session.notes ?? ''
  const endReason = session.end_reason ?? session.status ?? ''

  const prompt = `You are an expert QA analyst summarizing a human test session of an AI-built web application.

## App Under Test
Title: ${job?.title ?? 'Unknown'}
URL: ${job?.url ?? 'Unknown'}
Tier: ${job?.tier ?? 'standard'} (${job?.tier === 'quick' ? '10 min' : job?.tier === 'deep' ? '30 min' : '20 min'} session)
Instructions given to tester: ${job?.instructions ?? 'None provided'}

## Session Info
Status: ${session.status}
End reason: ${endReason}
${sessionNotes ? `Tester notes: ${sessionNotes}` : ''}

## Event Counts
- Network events: ${networkEvents.length}
- Console events: ${consoleEvents.length}
- Navigation events: ${navEvents.length}
- Click events: ${clickEvents.length}

${networkEvents.length > 0 ? `## Network Activity (sample)\n${networkSummary}\n` : ''}
${consoleEvents.length > 0 ? `## Console Output (sample)\n${consoleSummary}\n` : ''}
${navEvents.length > 0 ? `## Navigation Path\n${navSummary}\n` : ''}
${clickEvents.length > 0 ? `## User Interactions\n${clickSummary}\n` : ''}
${feedbackSummary ? `## Tester Feedback\n${feedbackSummary}` : '## Tester Feedback\nNo feedback submitted yet.'}

Generate a structured, actionable QA report that helps the developer understand what to fix.
Be specific and concrete. If there are console errors, name them. If network calls failed, list them.
If the app has no issues, say so clearly and explain what was verified.

For EACH issue in key_issues:
- Give a clear 5-10 word title
- Assign severity (critical=app broken/data loss, high=major feature broken, medium=degraded UX, low=cosmetic)
- Write repro_steps as numbered concrete actions (e.g. "1. Open the homepage", "2. Click the Login button")
- State expected vs actual behavior
- Include supporting evidence from console/network logs if available

Use the navigation path and click events to reconstruct repro steps accurately.
If multiple bugs share the same repro path, note it.
Keep issues_found as a quick one-line summary of each key_issue.
Keep bullets concise (1-2 sentences each). Prioritize severity in key_issues and issues_found.`

  try {
    const result = await generateObject({
      model: gateway('anthropic/claude-sonnet-4-5'),
      schema: SummarySchema,
      prompt,
    })

    const summary = result.object

    // Cache in DB (add ai_summary column if needed — it's safe to try)
    try {
      await admin
        .from('test_sessions')
        .update({ ai_summary: summary } as Record<string, unknown>)
        .eq('id', sessionId)
    } catch { /* column may not exist yet — that's OK, we still return */ }

    return NextResponse.json({ summary, cached: false })
  } catch (err) {
    console.error('AI summary error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/sessions/[id]/summary
 * Returns cached summary if available, otherwise returns 404.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: session } = await admin
    .from('test_sessions')
    .select('tester_id, job_id, ai_summary')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { data: job } = await admin
    .from('test_jobs')
    .select('client_id')
    .eq('id', session.job_id)
    .single()

  const isTester = session.tester_id === user.id
  const isClient = job?.client_id === user.id
  if (!isTester && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!session.ai_summary) return NextResponse.json({ error: 'No summary yet' }, { status: 404 })

  return NextResponse.json({ summary: session.ai_summary, cached: true })
}
