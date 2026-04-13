import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateSF424PDF, generateSF424APDF } from '@/lib/pdf-forms'
import { computeTotals } from '@/lib/budget-engine'
import type { BudgetState } from '@/lib/budget-engine'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const { application_id, form_type } = body as { application_id: string; form_type: 'sf424' | 'sf424a' }

    const { data: app } = await admin.from('grant_applications').select('*').eq('id', application_id).single()
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()

    // Get org profile for pre-population
    const orgId = app.organization_id || member?.organization_id
    const { data: org } = orgId ? await admin.from('organizations').select('*').eq('id', orgId).single() : { data: null }

    let pdfBytes: Uint8Array

    if (form_type === 'sf424') {
      pdfBytes = await generateSF424PDF({
        type_of_submission: 'Application',
        type_of_application: 'New',
        date_received: new Date().toLocaleDateString(),
        org_legal_name: org?.name || '[ORGANIZATION LEGAL NAME]',
        employer_id: org?.settings?.ein || '[EIN XX-XXXXXXX]',
        uei: org?.settings?.uei || '',
        org_type: 'Nonprofit with 501C3 IRS Status',
        org_address_street: org?.settings?.address_street || '[Street Address]',
        org_address_city: org?.settings?.address_city || '[City]',
        org_address_state: org?.settings?.address_state || '[ST]',
        org_address_zip: org?.settings?.address_zip || '[ZIP]',
        project_title: app.title || '',
        program_name: app.program_name || '',
        cfda_number: app.cfda_number || '',
        federal_amount_requested: Number(app.ask_amount_usd) || 0,
        auth_rep_name: '[Authorized Representative Name]',
        auth_rep_title: '[Executive Director / CEO]',
        signature_date: new Date().toLocaleDateString(),
      })
    } else {
      // SF-424A: load budget
      const { data: budget } = await admin
        .from('budgets')
        .select('*')
        .eq('application_id', application_id)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      let totals
      if (budget) {
        const state: BudgetState = {
          application_id,
          periods: budget.assumptions?.periods || 1,
          period_months: budget.assumptions?.period_months || 12,
          indirect_rate_pct: Number(budget.indirect_rate_pct) || 10,
          indirect_method: budget.indirect_method || 'MTDC',
          indirect_base_custom: null,
          line_items: budget.line_items || [],
          version: budget.version || 1,
          locked: false,
        }
        totals = computeTotals(state)
      }
      const get = (key: string) => totals?.by_category.find(c => c.key === key)?.total || 0

      pdfBytes = await generateSF424APDF({
        org_name: org?.name || app.title || '',
        project_title: app.title || '',
        section_a_personnel: get('personnel'),
        section_a_fringe: get('fringe'),
        section_a_travel: get('travel'),
        section_a_equipment: get('equipment'),
        section_a_supplies: get('supplies'),
        section_a_contractual: get('contractual'),
        section_a_construction: get('construction'),
        section_a_other: get('other'),
        section_a_indirect: totals?.indirect_amount || 0,
        federal_share: totals?.federal_total || Number(app.ask_amount_usd) || 0,
        nonfederal_share: totals?.match_total || 0,
      })
    }

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${form_type}-${Date.now()}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Form fill error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
