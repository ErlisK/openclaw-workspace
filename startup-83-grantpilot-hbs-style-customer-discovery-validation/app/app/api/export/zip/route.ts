import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { computeTotals, generateJustification, toCSV } from '@/lib/budget-engine'
import { generateSF424PDF, generateSF424APDF } from '@/lib/pdf-forms'
import { generateChecklist } from '@/lib/checklist-engine'
import type { BudgetState } from '@/lib/budget-engine'
import { getEntitlementState, limitExceededResponse } from '@/lib/entitlements'
import { trackServer } from '@/lib/analytics.server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const { application_id } = body as { application_id: string }
    if (!application_id) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

    // ── Entitlement gate ──────────────────────────────────────────────────
    const ent = await getEntitlementState(user.id)
    if (!ent.can.export) {
      return limitExceededResponse(
        'exports_per_month',
        ent.tier,
        ent.usage['export'] || 0,
        ent.limits.exports_per_month
      )
    }
    // ─────────────────────────────────────────────────────────────────

    // Load everything
    const [appRes, narrativesRes, budgetRes, rfpRes] = await Promise.all([
      admin.from('grant_applications').select('*').eq('id', application_id).single(),
      admin.from('narratives').select('*').eq('application_id', application_id).order('updated_at', { ascending: false }),
      admin.from('budgets').select('*').eq('application_id', application_id).order('version', { ascending: false }).limit(1),
      admin.from('grant_applications').select('rfp_document_id').eq('id', application_id).single(),
    ])

    const app = appRes.data
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    const narratives = narrativesRes.data || []
    const budget = budgetRes.data?.[0]

    let rfpParsed: Record<string, unknown> | null = null
    if (rfpRes.data?.rfp_document_id) {
      const { data: rfp } = await admin.from('rfp_documents').select('parsed_data').eq('id', rfpRes.data.rfp_document_id).single()
      rfpParsed = rfp?.parsed_data || null
    }

    // Build ZIP using JSZip
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    const appFolder = zip.folder(`${app.title.replace(/[^a-zA-Z0-9-_ ]/g, '_').slice(0, 40)}`)!

    // ── 1. Narratives DOCX-equivalent (text files for now) ────────────────────
    const narrativesFolder = appFolder.folder('narratives')!
    const allNarrativeText: string[] = [
      `APPLICATION: ${app.title}`,
      `FUNDER: ${app.funder_name || ''}`,
      `DEADLINE: ${app.deadline || ''}`,
      `GENERATED: ${new Date().toISOString()}`,
      '━'.repeat(60),
      '',
    ]
    for (const n of narratives) {
      const fileName = `${n.section_key}.txt`
      const content = `${n.section_title || n.section_key}\n${'─'.repeat(50)}\n${n.content_md || ''}\n\n[Word count: ${n.word_count || 0}]\n`
      narrativesFolder.file(fileName, content)
      allNarrativeText.push(`## ${n.section_title || n.section_key}\n\n${n.content_md || ''}`, '')
    }
    appFolder.file('all_narratives.txt', allNarrativeText.join('\n'))

    // ── 2. Budget CSV + Justification ─────────────────────────────────────────
    if (budget) {
      const budgetFolder = appFolder.folder('budget')!
      const budgetState: BudgetState = {
        application_id,
        periods: budget.assumptions?.periods || 1,
        period_months: budget.assumptions?.period_months || 12,
        indirect_rate_pct: Number(budget.indirect_rate_pct) || 10,
        indirect_method: budget.indirect_method || 'MTDC',
        indirect_base_custom: null,
        line_items: budget.line_items || [],
        version: budget.version || 1,
        locked: !!budget.locked_at,
      }
      const totals = computeTotals(budgetState)
      const csv = toCSV(budgetState, totals)
      budgetFolder.file('budget.csv', csv)

      const justification = generateJustification(budgetState, totals, app.funder_name)
      budgetFolder.file('budget_narrative.txt', justification)

      // SF-424A PDF
      try {
        const byCategory = totals.by_category
        const get = (key: string) => byCategory.find(c => c.key === key)?.total || 0
        const sf424aBytes = await generateSF424APDF({
          org_name: app.title || '',
          project_title: app.title || '',
          section_a_personnel: get('personnel'),
          section_a_fringe: get('fringe'),
          section_a_travel: get('travel'),
          section_a_equipment: get('equipment'),
          section_a_supplies: get('supplies'),
          section_a_contractual: get('contractual'),
          section_a_construction: get('construction'),
          section_a_other: get('other'),
          section_a_indirect: totals.indirect_amount,
          federal_share: totals.federal_total,
          nonfederal_share: totals.match_total,
        })
        budgetFolder.file('SF-424A_budget_summary.pdf', sf424aBytes)
      } catch (e) {
        console.error('SF-424A generation failed:', e)
      }
    }

    // ── 3. SF-424 Main Application Form PDF ──────────────────────────────────
    const formsFolder = appFolder.folder('forms')!
    try {
      const sf424Data = {
        type_of_submission: 'Application' as const,
        type_of_application: 'New' as const,
        date_received: new Date().toLocaleDateString(),
        org_legal_name: '[ORGANIZATION LEGAL NAME]',
        employer_id: '[EIN XX-XXXXXXX]',
        uei: '[UEI]',
        org_type: 'Nonprofit with 501C3 IRS Status',
        org_address_street: '[Street Address]',
        org_address_city: '[City]',
        org_address_state: '[ST]',
        org_address_zip: '[ZIP]',
        project_title: app.title || '',
        program_name: app.program_name || '',
        cfda_number: app.cfda_number || (rfpParsed?.cfda_number as string) || '',
        federal_amount_requested: Number(app.ask_amount_usd) || 0,
        auth_rep_name: '[Authorized Representative Name]',
        auth_rep_title: '[Title]',
        signature_date: new Date().toLocaleDateString(),
      }
      const sf424Bytes = await generateSF424PDF(sf424Data)
      formsFolder.file('SF-424_application.pdf', sf424Bytes)
    } catch (e) {
      console.error('SF-424 generation failed:', e)
    }

    // ── 4. Compliance checklist ───────────────────────────────────────────────
    const checklistItems = generateChecklist({
      funder_type: (rfpParsed?.funder_type as string) || 'federal',
      rfp_attachments: (rfpParsed?.attachments as ChecklistAtt[]) || [],
      deadline: app.deadline,
    })

    let checklistMd = `# Compliance Checklist\n## ${app.title}\nFunder: ${app.funder_name || ''} | Deadline: ${app.deadline || ''}\nGenerated: ${new Date().toISOString()}\n\n`
    const categories = [...new Set(checklistItems.map(i => i.category))]
    for (const cat of categories) {
      const catItems = checklistItems.filter(i => i.category === cat)
      checklistMd += `### ${cat.replace(/_/g, ' ').toUpperCase()}\n`
      for (const item of catItems) {
        checklistMd += `- [${item.status === 'complete' ? 'x' : ' '}] ${item.is_required ? '**[REQUIRED]** ' : ''}${item.title}\n`
        if (item.description) checklistMd += `  *${item.description}*\n`
      }
      checklistMd += '\n'
    }
    appFolder.file('compliance_checklist.md', checklistMd)

    // ── 5. Attachments list ───────────────────────────────────────────────────
    const attachList = [
      `# Attachments Required`,
      `## ${app.title}`,
      '',
      '| # | Attachment | Required | Format | Status |',
      '|---|-----------|----------|--------|--------|',
    ]
    const attItems = checklistItems.filter(i => i.category === 'attachments')
    attItems.forEach((item, i) => {
      attachList.push(`| ${i + 1} | ${item.title} | ${item.is_required ? '✓ YES' : 'Optional'} | ${item.format || 'Any'} | ☐ |`)
    })
    appFolder.file('attachments_list.md', attachList.join('\n'))

    // ── 6. README ──────────────────────────────────────────────────────────────
    const readmeParts = [
      `# ${app.title}`,
      `**Funder**: ${app.funder_name || ''}`,
      `**Deadline**: ${app.deadline || ''}`,
      `**Requested**: $${Number(app.ask_amount_usd || 0).toLocaleString()}`,
      `**Exported**: ${new Date().toISOString()}`,
      `**Generated by**: GrantPilot (https://pilotgrant.io)`,
      '',
      '## Contents',
      '',
      '```',
      '├── all_narratives.txt        — All narrative sections combined',
      '├── narratives/               — Individual section text files',
      '├── budget/',
      '│   ├── budget.csv            — Line-item budget spreadsheet',
      '│   ├── budget_narrative.txt  — Budget justification text',
      '│   └── SF-424A_budget_summary.pdf',
      '├── forms/',
      '│   └── SF-424_application.pdf',
      '├── compliance_checklist.md   — Pre-submission compliance checklist',
      '└── attachments_list.md       — Required attachments tracker',
      '```',
      '',
      '## Next Steps',
      '1. ☐ Fill in bracketed [PLACEHOLDERS] in all files',
      '2. ☐ Collect all required attachments (see attachments_list.md)',
      '3. ☐ Complete compliance checklist',
      '4. ☐ Have Authorized Representative review and sign',
      '5. ☐ Submit through official grants portal by deadline',
      '',
      '---',
      '*This bundle was generated by GrantPilot. All forms are analogs for reference.*',
      '*Always verify requirements against the official RFP and submit through official channels.*',
    ]
    appFolder.file('README.md', readmeParts.join('\n'))

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    const safeTitle = app.title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)

    // Audit log + usage event
    const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()
    if (member) {
      await admin.from('audit_log').insert({
        organization_id: member.organization_id, user_id: user.id,
        event_type: 'export_zip', table_name: 'grant_applications', record_id: application_id,
        metadata: { narratives_count: narratives.length, has_budget: !!budget, zip_size_kb: Math.round(zipBuffer.length / 1024) },
      })

      // Log export usage event (for usage metering)
      await admin.from('usage_events').insert({
        user_id: user.id,
        organization_id: member.organization_id,
        event_type: 'export',
        resource_type: 'grant_application',
        resource_id: application_id,
        metadata: { zip_size_kb: Math.round(zipBuffer.length / 1024) },
      }).catch(() => {})
    }

    // Auto-trigger escrow condition for export
    // Analytics
    if (member) {
      trackServer('export_completed', user.id, member.organization_id, {
        application_id,
        narratives_count: narratives.length,
        has_budget: !!budget,
        zip_size_kb: Math.round(zipBuffer.length / 1024),
      }).catch(() => {})
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pilotgrant.io'
    const { data: activeOrder } = await admin.from('orders')
      .select('id, escrow_status')
      .eq('application_id', application_id)
      .eq('order_type', 'deliverable_pack')
      .neq('escrow_status', 'released')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeOrder?.id) {
      fetch(`${appUrl}/api/orders/${activeOrder.id}/escrow-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal': 'true' },
        body: JSON.stringify({
          source: 'export',
          note: 'Submission ZIP exported successfully.',
        }),
      }).catch((e: unknown) => console.error('[EXPORT] escrow trigger failed:', e))
    }

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeTitle}-grant-bundle.zip"`,
      },
    })

  } catch (err) {
    console.error('ZIP export error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

interface ChecklistAtt { name: string; is_required: boolean; format?: string | null }
