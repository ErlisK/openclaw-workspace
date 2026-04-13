/**
 * Checklist engine — auto-generate compliance checklists from RFP requirements,
 * attachments, and standard federal grant requirements.
 */

export interface ChecklistItem {
  id: string
  category: ChecklistCategory
  title: string
  description: string | null
  is_required: boolean
  due_phase: 'before_submit' | 'at_submit' | 'after_award' | 'ongoing'
  format?: string | null    // "PDF", "Form", "DOCX"
  source: 'rfp' | 'standard' | 'federal_reg' | 'funder_specific'
  status: 'pending' | 'in_progress' | 'complete' | 'na'
  notes?: string
  sort_order: number
}

export type ChecklistCategory =
  | 'forms'
  | 'narrative'
  | 'budget'
  | 'attachments'
  | 'certifications'
  | 'registrations'
  | 'pre_submission'
  | 'post_award'

export const CATEGORY_META: Record<ChecklistCategory, { label: string; icon: string; color: string }> = {
  forms:          { label: 'Required Forms',        icon: '📋', color: 'bg-purple-100 text-purple-800' },
  narrative:      { label: 'Narrative Sections',    icon: '✍️', color: 'bg-blue-100 text-blue-800' },
  budget:         { label: 'Budget & Financial',    icon: '💰', color: 'bg-green-100 text-green-800' },
  attachments:    { label: 'Attachments',           icon: '📎', color: 'bg-orange-100 text-orange-800' },
  certifications: { label: 'Certifications',        icon: '✅', color: 'bg-teal-100 text-teal-800' },
  registrations:  { label: 'Registrations',         icon: '🏛️', color: 'bg-gray-100 text-gray-700' },
  pre_submission: { label: 'Pre-Submission Review', icon: '🔍', color: 'bg-yellow-100 text-yellow-800' },
  post_award:     { label: 'Post-Award',            icon: '🎯', color: 'bg-indigo-100 text-indigo-800' },
}

// Standard items always included for federal grants
const FEDERAL_STANDARD_ITEMS: Omit<ChecklistItem, 'id' | 'sort_order'>[] = [
  {
    category: 'registrations',
    title: 'SAM.gov Registration Active',
    description: 'System for Award Management registration must be active. Renews annually.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'federal_reg', status: 'pending',
  },
  {
    category: 'registrations',
    title: 'UEI (Unique Entity Identifier) Obtained',
    description: 'Required for all federal applicants. Obtained via SAM.gov.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'federal_reg', status: 'pending',
  },
  {
    category: 'registrations',
    title: 'Grants.gov Registration',
    description: 'Organization must be registered in Grants.gov to submit applications.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'federal_reg', status: 'pending',
  },
  {
    category: 'forms',
    title: 'SF-424 Application for Federal Assistance',
    description: 'Standard federal application form. Fields auto-populated from org profile.',
    is_required: true, due_phase: 'at_submit', format: 'Form/PDF', source: 'standard', status: 'pending',
  },
  {
    category: 'forms',
    title: 'SF-424A Budget Information (Non-Construction)',
    description: 'Standard budget summary form for non-construction programs.',
    is_required: true, due_phase: 'at_submit', format: 'Form/PDF', source: 'standard', status: 'pending',
  },
  {
    category: 'forms',
    title: 'SF-424B Assurances (Non-Construction)',
    description: 'Standard assurances form. Organizational certifications.',
    is_required: true, due_phase: 'at_submit', format: 'Form', source: 'standard', status: 'pending',
  },
  {
    category: 'certifications',
    title: 'Certification Regarding Lobbying (SF-LLL)',
    description: 'Required for awards over $100,000. Certifies no federal funds used for lobbying.',
    is_required: true, due_phase: 'at_submit', format: 'Form', source: 'federal_reg', status: 'pending',
  },
  {
    category: 'certifications',
    title: 'Drug-Free Workplace Certification',
    description: 'Required under Public Law 100-690. Certifies drug-free workplace policy.',
    is_required: true, due_phase: 'at_submit', format: 'Form', source: 'federal_reg', status: 'pending',
  },
  {
    category: 'attachments',
    title: 'IRS Tax Exemption Letter (501c3)',
    description: 'Current IRS determination letter confirming 501(c)(3) status.',
    is_required: true, due_phase: 'at_submit', format: 'PDF', source: 'standard', status: 'pending',
  },
  {
    category: 'attachments',
    title: 'Most Recent Audited Financial Statements',
    description: 'Required if organization expends >$750K in federal awards. A-133/Single Audit.',
    is_required: false, due_phase: 'at_submit', format: 'PDF', source: 'standard', status: 'pending',
  },
  {
    category: 'narrative',
    title: 'Project Abstract / Summary',
    description: 'Brief summary of proposed project, typically 35–500 words.',
    is_required: true, due_phase: 'at_submit', format: 'DOCX/PDF', source: 'standard', status: 'pending',
  },
  {
    category: 'budget',
    title: 'Budget Narrative / Justification',
    description: 'Line-by-line justification of all budget costs. Auto-generated from budget builder.',
    is_required: true, due_phase: 'at_submit', format: 'DOCX', source: 'standard', status: 'pending',
  },
  {
    category: 'pre_submission',
    title: 'Internal Sign-off from Authorized Representative',
    description: 'Authorized Organizational Representative (AOR) must review and approve submission.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'standard', status: 'pending',
  },
  {
    category: 'pre_submission',
    title: 'Budget Review by Finance Staff/Board',
    description: 'Financial review of budget for accuracy, allowability, and allocability.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'standard', status: 'pending',
  },
  {
    category: 'pre_submission',
    title: 'Narrative Proofread and Word Count Verified',
    description: 'All narrative sections proofread; word/page limits verified against RFP.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'standard', status: 'pending',
  },
  {
    category: 'pre_submission',
    title: 'Submission Test (Grants.gov Package Validation)',
    description: 'Validate application package before final submission. Fix any errors.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'federal_reg', status: 'pending',
  },
  {
    category: 'post_award',
    title: 'Grant Award Notice (GAN) Review',
    description: 'Review award terms and conditions. Sign GAN within required timeframe.',
    is_required: false, due_phase: 'after_award', format: null, source: 'standard', status: 'pending',
  },
  {
    category: 'post_award',
    title: 'Financial Management System Setup',
    description: 'Set up grant-specific accounting codes and cost tracking.',
    is_required: false, due_phase: 'after_award', format: null, source: 'standard', status: 'pending',
  },
]

// Foundation-specific standard items
const FOUNDATION_STANDARD_ITEMS: Omit<ChecklistItem, 'id' | 'sort_order'>[] = [
  {
    category: 'attachments',
    title: 'IRS Tax Exemption Letter (501c3)',
    description: 'Current IRS determination letter.',
    is_required: true, due_phase: 'at_submit', format: 'PDF', source: 'standard', status: 'pending',
  },
  {
    category: 'attachments',
    title: 'Organizational Budget (Current Year)',
    description: 'Board-approved organizational operating budget for current fiscal year.',
    is_required: true, due_phase: 'at_submit', format: 'PDF/XLSX', source: 'standard', status: 'pending',
  },
  {
    category: 'attachments',
    title: 'Most Recent Audited Financials or 990',
    description: 'Most recent independent audit or IRS Form 990.',
    is_required: true, due_phase: 'at_submit', format: 'PDF', source: 'standard', status: 'pending',
  },
  {
    category: 'attachments',
    title: 'Board of Directors List',
    description: 'Current board list with affiliations.',
    is_required: false, due_phase: 'at_submit', format: 'PDF/DOCX', source: 'standard', status: 'pending',
  },
  {
    category: 'pre_submission',
    title: 'Executive Director Sign-off',
    description: 'Final review and approval by Executive Director or authorized signer.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'standard', status: 'pending',
  },
  {
    category: 'pre_submission',
    title: 'Budget Matches Narrative',
    description: 'Verify budget totals and line items align with narrative descriptions.',
    is_required: true, due_phase: 'before_submit', format: null, source: 'standard', status: 'pending',
  },
]

// ─── Main checklist generator ─────────────────────────────────────────────────
export function generateChecklist(params: {
  funder_type: string
  rfp_requirements?: Array<{ title: string; req_type: string; is_required: boolean; word_limit?: number | null; format?: string | null }>
  rfp_attachments?: Array<{ name: string; is_required: boolean; format?: string | null }>
  rfp_scoring?: Array<{ criterion: string; points: number }>
  cfda_number?: string | null
  deadline?: string | null
}): ChecklistItem[] {
  const items: ChecklistItem[] = []
  let order = 0
  const addItem = (item: Omit<ChecklistItem, 'id' | 'sort_order'>) => {
    items.push({ ...item, id: `item-${order}`, sort_order: order++ })
  }

  const isFederal = ['federal', 'state'].includes(params.funder_type)

  // Standard items based on funder type
  const standardItems = isFederal ? FEDERAL_STANDARD_ITEMS : FOUNDATION_STANDARD_ITEMS
  for (const item of standardItems) addItem(item)

  // RFP-specific narrative sections
  if (params.rfp_requirements) {
    for (const req of params.rfp_requirements.filter(r => r.req_type === 'narrative')) {
      const alreadyInStandard = ['Project Abstract', 'Budget Narrative'].some(t => req.title.toLowerCase().includes(t.toLowerCase()))
      if (!alreadyInStandard) {
        addItem({
          category: 'narrative',
          title: req.title,
          description: req.word_limit ? `Word limit: ${req.word_limit} words` : null,
          is_required: req.is_required,
          due_phase: 'at_submit',
          format: 'DOCX/PDF',
          source: 'rfp',
          status: 'pending',
        })
      }
    }

    // RFP-specified forms
    for (const req of params.rfp_requirements.filter(r => r.req_type === 'form' || r.req_type === 'certification')) {
      const alreadyInStandard = ['SF-424', 'SF-424A', 'SF-424B', 'Lobbying', 'Drug-Free'].some(t => req.title.includes(t))
      if (!alreadyInStandard) {
        addItem({
          category: req.req_type === 'form' ? 'forms' : 'certifications',
          title: req.title,
          description: null,
          is_required: req.is_required,
          due_phase: 'at_submit',
          format: req.format || 'Form',
          source: 'rfp',
          status: 'pending',
        })
      }
    }
  }

  // RFP-specified attachments
  if (params.rfp_attachments) {
    const standardAttachmentNames = ['IRS', '501', 'Audit', 'Financial', 'Board']
    for (const att of params.rfp_attachments) {
      const isStandard = standardAttachmentNames.some(s => att.name.includes(s))
      if (!isStandard) {
        addItem({
          category: 'attachments',
          title: att.name,
          description: null,
          is_required: att.is_required,
          due_phase: 'at_submit',
          format: att.format || 'PDF',
          source: 'rfp',
          status: 'pending',
        })
      }
    }
  }

  // Deadline reminder items
  if (params.deadline) {
    const daysOut = Math.ceil((new Date(params.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysOut > 0 && daysOut <= 30) {
      addItem({
        category: 'pre_submission',
        title: `⚠️ Deadline in ${daysOut} days — ${params.deadline}`,
        description: 'Final submission must be received by deadline time. Allow buffer for technical issues.',
        is_required: true, due_phase: 'before_submit', format: null, source: 'rfp', status: 'pending',
      })
    }
  }

  return items
}

// ─── Progress summary ─────────────────────────────────────────────────────────
export function checklistProgress(items: ChecklistItem[]) {
  const required = items.filter(i => i.is_required)
  const complete = required.filter(i => i.status === 'complete')
  const na = required.filter(i => i.status === 'na')
  const effective = required.length - na.length
  const pct = effective > 0 ? Math.round((complete.length / effective) * 100) : 0
  return { total: items.length, required: required.length, complete: complete.length, pct }
}
