import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { gateway } from 'ai'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/sessions/[id]/classify
 *
 * Fast (Haiku) classification of issue severity + affected areas for a session.
 *
 * Can operate in two modes:
 * 1. If the session already has an ai_summary with key_issues, re-classifies them
 *    (faster, cheaper — no need to re-read all events)
 * 2. If no summary exists, reads session events + feedback and classifies on the fly
 *
 * Body (optional): { issues?: Array<{ title: string; description: string }> }
 * If body.issues is provided, classifies those specific issues directly.
 *
 * Returns:
 * {
 *   classifications: Array<{
 *     issue_ref: string           — title or index
 *     severity: 'critical'|'high'|'medium'|'low'
 *     affected_areas: string[]
 *     rationale: string           — brief reason for severity assignment
 *   }>
 *   severity_breakdown: { critical: n, high: n, medium: n, low: n }
 *   affected_areas_summary: Array<{ area: string; issue_count: n; max_severity: string }>
 *   risk_score: number            — 0-100 composite risk score
 *   risk_label: 'critical'|'high'|'medium'|'low'
 * }
 */

const AFFECTED_AREAS = [
  'authentication', 'navigation', 'forms', 'payments', 'api',
  'ui_layout', 'performance', 'data_display', 'search_filter',
  'notifications', 'file_upload', 'permissions', 'onboarding',
  'settings', 'other',
] as const

const ClassificationSchema = z.object({
  classifications: z.array(z.object({
    issue_ref: z.string().describe('Issue title or index reference'),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    affected_areas: z.array(z.enum(AFFECTED_AREAS)).min(1).max(3),
    rationale: z.string().describe('1-2 sentence reason for this severity classification'),
  })).describe('Classification for each issue'),
  severity_breakdown: z.object({
    critical: z.number().int().min(0),
    high: z.number().int().min(0),
    medium: z.number().int().min(0),
    low: z.number().int().min(0),
  }),
  affected_areas_summary: z.array(z.object({
    area: z.enum(AFFECTED_AREAS),
    issue_count: z.number().int().min(1),
    max_severity: z.enum(['critical', 'high', 'medium', 'low']),
  })).describe('Aggregated area breakdown, sorted by severity then count'),
  risk_score: z.number().min(0).max(100).describe(
    'Composite 0-100 risk score: critical issues = 25pts each, high = 10pts, medium = 4pts, low = 1pt. Cap at 100.'
  ),
  risk_label: z.enum(['critical', 'high', 'medium', 'low']).describe(
    'Overall risk label derived from risk_score: >=75=critical, >=40=high, >=15=medium, else low'
  ),
})

export type ClassificationResult = z.infer<typeof ClassificationSchema>

export async function POST(
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
    .select('title, url, instructions, client_id')
    .eq('id', session.job_id)
    .single()

  const isTester = session.tester_id === user.id
  const isClient = job?.client_id === user.id
  if (!isTester && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse optional body
  let bodyIssues: Array<{ title: string; description: string }> | null = null
  try {
    const body = await req.json().catch(() => ({}))
    if (Array.isArray(body?.issues)) bodyIssues = body.issues
  } catch { /* ignore */ }

  // Determine issues to classify
  type IssueInput = { title: string; description: string; severity?: string }
  let issuesToClassify: IssueInput[] = []

  if (bodyIssues && bodyIssues.length > 0) {
    // Mode 1: explicit issues provided in body
    issuesToClassify = bodyIssues.slice(0, 20) as IssueInput[]
  } else if (session.ai_summary) {
    // Mode 2: re-classify from existing summary
    const summary = session.ai_summary as Record<string, unknown>
    const keyIssues = summary.key_issues as IssueInput[] | undefined
    if (keyIssues && Array.isArray(keyIssues) && keyIssues.length > 0) {
      issuesToClassify = keyIssues.slice(0, 20).map(i => ({
        title: i.title ?? 'Unknown issue',
        description: i.description ?? '',
        severity: i.severity,
      }))
    }
  } else {
    // Mode 3: read feedback bugs and session events as proxy
    const { data: feedbackRows } = await admin
      .from('feedback')
      .select('feedback_bugs(*)')
      .eq('session_id', sessionId)
      .limit(3)

    type BugRow = { title?: string | null; description?: string | null; severity?: string | null }
    const bugs: BugRow[] = (feedbackRows ?? []).flatMap((fb: { feedback_bugs?: BugRow[] }) =>
      (fb.feedback_bugs ?? [])
    )

    if (bugs.length > 0) {
      issuesToClassify = bugs.slice(0, 20).map(b => ({
        title: b.title ?? 'Untitled bug',
        description: b.description ?? '',
        severity: b.severity ?? undefined,
      }))
    } else {
      // No issues to classify — return empty classification
      return NextResponse.json({
        classifications: [],
        severity_breakdown: { critical: 0, high: 0, medium: 0, low: 0 },
        affected_areas_summary: [],
        risk_score: 0,
        risk_label: 'low',
        source: 'no_issues',
      })
    }
  }

  const issuesText = issuesToClassify.map((issue, i) =>
    `Issue ${i + 1}: "${issue.title}"\nDescription: ${issue.description}${issue.severity ? `\nPrevious severity: ${issue.severity}` : ''}`
  ).join('\n\n')

  const prompt = `You are a QA analyst classifying issues found in a web application test.

App: ${job?.title ?? 'Unknown'} (${job?.url ?? 'Unknown'})
Instructions: ${job?.instructions ?? 'None provided'}

Classify each issue below for severity and affected product areas.

Severity rubric:
- critical: App is completely broken, data loss, security vulnerability, or core flow unusable
- high: Major feature doesn't work, blocks a primary user journey
- medium: Feature works with workarounds, degraded experience, visual bugs with functional impact
- low: Cosmetic issues, minor UI misalignment, typos, non-functional polish

Available affected_areas: authentication, navigation, forms, payments, api, ui_layout, performance, data_display, search_filter, notifications, file_upload, permissions, onboarding, settings, other

Risk score formula: critical issues = 25pts each, high = 10pts, medium = 4pts, low = 1pt (cap at 100).
Risk label: >=75 = critical, >=40 = high, >=15 = medium, else low.

Issues to classify:
${issuesText}`

  try {
    const result = await generateObject({
      model: gateway('anthropic/claude-sonnet-4-5'),
      schema: ClassificationSchema,
      prompt,
    })

    // Cache updated classification back into ai_summary if it exists
    if (session.ai_summary) {
      const updatedSummary = {
        ...(session.ai_summary as Record<string, unknown>),
        severity_breakdown: result.object.severity_breakdown,
        affected_areas_summary: result.object.affected_areas_summary,
      }
      await admin
        .from('test_sessions')
        .update({ ai_summary: updatedSummary } as Record<string, unknown>)
        .eq('id', sessionId)
        .catch(() => {})
    }

    return NextResponse.json({
      ...result.object,
      source: bodyIssues ? 'provided' : session.ai_summary ? 'summary' : 'feedback',
    })
  } catch (err) {
    console.error('Classification error:', err)
    // Fallback: compute breakdown from existing key_issues if available without AI
    if (!bodyIssues && session.ai_summary) {
      const summary = session.ai_summary as Record<string, unknown>
      const keyIssues = (summary.key_issues as Array<{ severity?: string; affected_areas?: string[] }>) ?? []
      const breakdown = { critical: 0, high: 0, medium: 0, low: 0 }
      for (const issue of keyIssues) {
        const s = issue.severity ?? 'medium'
        if (s in breakdown) breakdown[s as keyof typeof breakdown]++
      }
      const riskScore = Math.min(100,
        breakdown.critical * 25 + breakdown.high * 10 + breakdown.medium * 4 + breakdown.low
      )
      return NextResponse.json({
        classifications: keyIssues.map((issue, i) => ({
          issue_ref: (issue as Record<string, unknown>).title ?? `Issue ${i + 1}`,
          severity: issue.severity ?? 'medium',
          affected_areas: issue.affected_areas ?? ['other'],
          rationale: 'Classification from stored summary data.',
        })),
        severity_breakdown: breakdown,
        affected_areas_summary: summary.affected_areas_summary ?? [],
        risk_score: riskScore,
        risk_label: riskScore >= 75 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 15 ? 'medium' : 'low',
        source: 'summary_fallback',
        fallback: true,
      })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
