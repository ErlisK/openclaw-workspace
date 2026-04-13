import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { runDualPassQA } from '@/lib/qa-engine'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const { narrative_id, content, section_key, section_title, word_limit, funder_type, tone, cfda_number } = body

    if (!narrative_id && !content) return NextResponse.json({ error: 'narrative_id or content required' }, { status: 400 })

    let narrativeContent = content
    let narrativeSectionKey = section_key || 'unknown'
    let narrativeSectionTitle = section_title || 'Section'
    let narrativeWordLimit = word_limit
    let appId: string | null = null

    if (narrative_id) {
      const { data: n } = await admin.from('narratives').select('*').eq('id', narrative_id).single()
      if (n) {
        narrativeContent = n.content_md || ''
        narrativeSectionKey = n.section_key || section_key || 'unknown'
        narrativeSectionTitle = n.section_title || section_title || 'Section'
        narrativeWordLimit = n.word_limit || word_limit
        appId = n.application_id
      }
    }

    if (!narrativeContent || narrativeContent.trim().length < 5) {
      return NextResponse.json({ error: 'No content to review' }, { status: 400 })
    }

    // Run dual-pass QA
    const result = runDualPassQA({
      content: narrativeContent,
      section_key: narrativeSectionKey,
      section_title: narrativeSectionTitle,
      word_limit: narrativeWordLimit,
      funder_type: funder_type || 'federal',
      tone,
      cfda_number,
    })

    const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()

    // Save QA run to qa_runs
    if (narrative_id) {
      await admin.from('qa_runs').insert({
        narrative_id,
        application_id: appId,
        organization_id: member?.organization_id,
        user_id: user.id,
        pass_type: 'dual',
        score: result.combined_score,
        grade: result.combined_grade,
        issues: result.style.issues.concat(result.compliance.issues),
        strengths: result.style.strengths.concat(result.compliance.strengths),
        suggestions: result.style.suggestions.concat(result.compliance.suggestions),
        model: 'heuristic-v1',
      })

      // Update narrative with latest QA result
      await admin.from('narratives').update({
        qa_status: result.combined_grade,
        qa_score: result.combined_score,
        qa_notes: JSON.stringify({
          style_score: result.style.score,
          compliance_score: result.compliance.score,
          issues_count: result.blocking_issues.length,
          ready: result.ready_for_submission,
          timestamp: result.timestamp,
        }),
        updated_at: new Date().toISOString(),
      }).eq('id', narrative_id)

      // Auto-trigger escrow condition if QA passed
      if (result.ready_for_submission && appId) {
        // Find active deliverable_pack order for this application
        const { data: activeOrder } = await admin.from('orders')
          .select('id, escrow_status')
          .eq('application_id', appId)
          .eq('order_type', 'deliverable_pack')
          .neq('escrow_status', 'released')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (activeOrder?.id) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pilotgrant.io'
          // Fire-and-forget: trigger escrow condition for QA pass
          fetch(`${appUrl}/api/orders/${activeOrder.id}/escrow-release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal': 'true' },
            body: JSON.stringify({
              source: 'qa',
              note: `QA passed automatically. Score: ${result.combined_score}/100 (${result.combined_grade}).`,
            }),
          }).catch((e: unknown) => console.error('[QA] escrow trigger failed:', e))
        }
      }

      // Immutable audit log entry
      await admin.from('audit_log').insert({
        organization_id: member?.organization_id,
        user_id: user.id,
        application_id: appId,
        event_type: 'qa_run',
        table_name: 'narratives',
        record_id: narrative_id,
        new_value: {
          qa_score: result.combined_score,
          qa_grade: result.combined_grade,
          style_score: result.style.score,
          compliance_score: result.compliance.score,
          blocking_issues: result.blocking_issues.length,
          ready_for_submission: result.ready_for_submission,
          issues_count: result.style.issues.length + result.compliance.issues.length,
        },
      })
    }

    return NextResponse.json({ result })
  } catch (err) {
    console.error('QA error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
