/**
 * Budget engine — types, category definitions, calculation helpers,
 * and justification text generator.
 * No LLM required; all text is template-driven with field interpolation.
 */

// ─── Category constants ────────────────────────────────────────────────────────
export const BUDGET_CATEGORIES = [
  { key: 'personnel',     label: 'A. Personnel',                icon: '👥', indirect_base: true },
  { key: 'fringe',        label: 'B. Fringe Benefits',          icon: '🏥', indirect_base: true },
  { key: 'travel',        label: 'C. Travel',                   icon: '✈️', indirect_base: true },
  { key: 'equipment',     label: 'D. Equipment',                icon: '🖥️', indirect_base: false },
  { key: 'supplies',      label: 'E. Supplies',                 icon: '📦', indirect_base: true },
  { key: 'contractual',   label: 'F. Contractual / Subcontracts', icon: '📋', indirect_base: false },
  { key: 'construction',  label: 'G. Construction',             icon: '🔨', indirect_base: false },
  { key: 'other',         label: 'H. Other Direct Costs',       icon: '📎', indirect_base: true },
  { key: 'indirect',      label: 'I. Indirect Costs',           icon: '⚙️', indirect_base: false },
] as const

export type CategoryKey = typeof BUDGET_CATEGORIES[number]['key']

export interface BudgetLineItem {
  id: string
  category: CategoryKey
  description: string
  quantity: number
  unit: string
  unit_cost: number
  total: number
  months?: number
  fringe_rate_pct?: number    // for personnel rows
  notes?: string
  is_federal: boolean         // federal share vs. match
  sort_order: number
}

export interface BudgetPeriod {
  period: number   // 1, 2, 3…
  label: string    // "Year 1", "Month 1–12"
  months: number
  items: BudgetLineItem[]
}

export interface BudgetState {
  id?: string
  application_id: string
  periods: number         // 1 = single period, 2 = biennial, 3 = 3-year
  period_months: number   // months per period (usually 12)
  indirect_rate_pct: number
  indirect_method: 'MTDC' | 'TDC' | 'personnel_fringe' | 'none'
  indirect_base_custom?: number | null
  line_items: BudgetLineItem[]
  version: number
  locked: boolean
}

// ─── Totals computation ────────────────────────────────────────────────────────
export interface CategoryTotal {
  key: CategoryKey
  label: string
  total: number
  federal: number
  match: number
}

export interface BudgetTotals {
  by_category: CategoryTotal[]
  total_direct: number
  indirect_base: number
  indirect_amount: number
  grand_total: number
  federal_total: number
  match_total: number
  match_pct: number
}

export function computeTotals(state: BudgetState): BudgetTotals {
  const items = state.line_items.filter(li => li.category !== 'indirect')

  const by_category: CategoryTotal[] = BUDGET_CATEGORIES.filter(c => c.key !== 'indirect').map(cat => {
    const catItems = items.filter(li => li.category === cat.key)
    return {
      key: cat.key,
      label: cat.label,
      total:   catItems.reduce((s, li) => s + li.total, 0),
      federal: catItems.filter(li => li.is_federal).reduce((s, li) => s + li.total, 0),
      match:   catItems.filter(li => !li.is_federal).reduce((s, li) => s + li.total, 0),
    }
  })

  const total_direct = by_category.reduce((s, c) => s + c.total, 0)
  const federal_direct = by_category.reduce((s, c) => s + c.federal, 0)
  const match_direct = by_category.reduce((s, c) => s + c.match, 0)

  // Indirect base per method
  let indirect_base: number
  switch (state.indirect_method) {
    case 'MTDC': {
      // Modified Total Direct Costs: exclude equipment, contractual >$25K, construction
      const exclusions = ['equipment', 'contractual', 'construction'] as CategoryKey[]
      indirect_base = by_category
        .filter(c => !exclusions.includes(c.key))
        .reduce((s, c) => s + c.total, 0)
      break
    }
    case 'personnel_fringe': {
      const pf = by_category.filter(c => c.key === 'personnel' || c.key === 'fringe')
      indirect_base = pf.reduce((s, c) => s + c.total, 0)
      break
    }
    case 'none': {
      indirect_base = 0
      break
    }
    default: // TDC
      indirect_base = total_direct
  }

  if (state.indirect_base_custom != null) indirect_base = state.indirect_base_custom

  const indirect_amount = Math.round(indirect_base * (state.indirect_rate_pct / 100))
  const grand_total = total_direct + indirect_amount
  const federal_total = federal_direct + indirect_amount
  const match_total = match_direct

  return {
    by_category,
    total_direct,
    indirect_base,
    indirect_amount,
    grand_total,
    federal_total,
    match_total,
    match_pct: grand_total > 0 ? Math.round((match_total / grand_total) * 100) : 0,
  }
}

// ─── Auto-justification generator ─────────────────────────────────────────────
export function generateJustification(state: BudgetState, totals: BudgetTotals, funderName?: string): string {
  const parts: string[] = []

  parts.push(`## Budget Narrative\n`)
  parts.push(`**Total Budget: $${totals.grand_total.toLocaleString()}**\n`)
  parts.push(`Federal Request: $${totals.federal_total.toLocaleString()} | Non-Federal Match: $${totals.match_total.toLocaleString()} (${totals.match_pct}% of total)\n`)

  const periodLabel = state.periods === 1 ? `${state.period_months}-month project period` : `${state.periods}-year project period (${state.period_months} months per year)`
  parts.push(`All costs are reasonable and necessary for the proposed ${periodLabel}.\n`)

  // A. Personnel
  const personnelItems = state.line_items.filter(li => li.category === 'personnel')
  if (personnelItems.length > 0) {
    parts.push(`### A. Personnel — $${totals.by_category.find(c=>c.key==='personnel')?.total.toLocaleString() || '0'}`)
    for (const item of personnelItems) {
      const annualSalary = item.unit === 'annual salary' ? item.unit_cost : item.unit_cost * (item.months || 12)
      const pct = item.quantity <= 1 ? `${(item.quantity * 100).toFixed(0)}% FTE` : `${item.quantity} FTE`
      parts.push(`**${item.description}** (${pct}): $${item.total.toLocaleString()}`)
      if (item.unit === 'annual salary') {
        parts.push(`Annual salary of $${annualSalary.toLocaleString()} × ${item.quantity} FTE × ${state.period_months/12 || 1} year(s) = $${item.total.toLocaleString()}.`)
      } else if (item.unit === 'hourly') {
        parts.push(`${item.quantity} hours × $${item.unit_cost.toLocaleString()}/hour = $${item.total.toLocaleString()}.`)
      }
      if (item.notes) parts.push(item.notes)
    }
  }

  // B. Fringe
  const fringeItems = state.line_items.filter(li => li.category === 'fringe')
  const fringeTotal = totals.by_category.find(c=>c.key==='fringe')?.total || 0
  if (fringeItems.length > 0 || (state.line_items.some(li => li.fringe_rate_pct) && personnelItems.length > 0)) {
    parts.push(`\n### B. Fringe Benefits — $${fringeTotal.toLocaleString()}`)
    const personnelTotal = totals.by_category.find(c=>c.key==='personnel')?.total || 0
    if (personnelTotal > 0 && fringeTotal > 0) {
      const effectiveRate = Math.round((fringeTotal / personnelTotal) * 100)
      parts.push(`Fringe benefits calculated at ${effectiveRate}% of personnel costs ($${personnelTotal.toLocaleString()}). Includes FICA (7.65%), health insurance, retirement contribution, and applicable state taxes.`)
    }
    for (const item of fringeItems) {
      if (item.notes) parts.push(`${item.description}: ${item.notes}`)
    }
  }

  // C. Travel
  const travelTotal = totals.by_category.find(c=>c.key==='travel')?.total || 0
  const travelItems = state.line_items.filter(li => li.category === 'travel')
  if (travelTotal > 0) {
    parts.push(`\n### C. Travel — $${travelTotal.toLocaleString()}`)
    for (const item of travelItems) {
      if (item.unit === 'trip') {
        parts.push(`**${item.description}**: ${item.quantity} trip(s) × $${item.unit_cost.toLocaleString()} = $${item.total.toLocaleString()}.${item.notes ? ' ' + item.notes : ''} All travel at or below GSA per diem rates.`)
      } else if (item.unit === 'mile') {
        parts.push(`**${item.description}**: ${item.quantity} miles × $${item.unit_cost}/mile = $${item.total.toLocaleString()}. Mileage reimbursed at current IRS standard rate.`)
      } else {
        parts.push(`**${item.description}**: $${item.total.toLocaleString()}.${item.notes ? ' ' + item.notes : ''}`)
      }
    }
  }

  // D. Equipment
  const equipTotal = totals.by_category.find(c=>c.key==='equipment')?.total || 0
  if (equipTotal > 0) {
    parts.push(`\n### D. Equipment — $${equipTotal.toLocaleString()}`)
    parts.push(`Equipment is defined as items with a per-unit cost of $5,000 or more and a useful life of more than one year. All items are necessary for program implementation and not available through the organization's existing inventory.`)
    for (const item of state.line_items.filter(li => li.category === 'equipment')) {
      parts.push(`**${item.description}**: ${item.quantity} unit(s) × $${item.unit_cost.toLocaleString()} = $${item.total.toLocaleString()}.${item.notes ? ' ' + item.notes : ''}`)
    }
  }

  // E. Supplies
  const suppliesTotal = totals.by_category.find(c=>c.key==='supplies')?.total || 0
  if (suppliesTotal > 0) {
    parts.push(`\n### E. Supplies — $${suppliesTotal.toLocaleString()}`)
    for (const item of state.line_items.filter(li => li.category === 'supplies')) {
      parts.push(`**${item.description}**: $${item.total.toLocaleString()}.${item.notes ? ' ' + item.notes : ''}`)
    }
  }

  // F. Contractual
  const contractTotal = totals.by_category.find(c=>c.key==='contractual')?.total || 0
  if (contractTotal > 0) {
    parts.push(`\n### F. Contractual/Subcontracts — $${contractTotal.toLocaleString()}`)
    for (const item of state.line_items.filter(li => li.category === 'contractual')) {
      parts.push(`**${item.description}**: $${item.total.toLocaleString()}.${item.notes ? ' ' + item.notes : ''} Contractor will be selected through a competitive procurement process consistent with 2 CFR §200.320.`)
    }
  }

  // H. Other Direct Costs
  const otherTotal = totals.by_category.find(c=>c.key==='other')?.total || 0
  if (otherTotal > 0) {
    parts.push(`\n### H. Other Direct Costs — $${otherTotal.toLocaleString()}`)
    for (const item of state.line_items.filter(li => li.category === 'other')) {
      parts.push(`**${item.description}**: $${item.total.toLocaleString()}.${item.notes ? ' ' + item.notes : ''}`)
    }
  }

  // I. Indirect
  if (state.indirect_rate_pct > 0 && totals.indirect_amount > 0) {
    parts.push(`\n### I. Indirect Costs — $${totals.indirect_amount.toLocaleString()}`)
    const methodLabel = state.indirect_method === 'MTDC' ? 'Modified Total Direct Costs (MTDC)' : state.indirect_method === 'personnel_fringe' ? 'Personnel and Fringe Benefits' : 'Total Direct Costs (TDC)'
    parts.push(`Indirect costs calculated at ${state.indirect_rate_pct}% of ${methodLabel} ($${totals.indirect_base.toLocaleString()} base) = $${totals.indirect_amount.toLocaleString()}. ${state.indirect_rate_pct <= 10 ? 'This rate does not exceed the 10% de minimis rate allowed under 2 CFR §200.414(f).' : 'Rate supported by a negotiated indirect cost rate agreement (NICRA) on file.'}`)
  }

  // Summary
  parts.push(`\n### Budget Summary`)
  parts.push(`| Category | Amount |`)
  parts.push(`|----------|--------|`)
  for (const cat of totals.by_category.filter(c => c.total > 0)) {
    parts.push(`| ${cat.label} | $${cat.total.toLocaleString()} |`)
  }
  if (totals.indirect_amount > 0) parts.push(`| I. Indirect Costs | $${totals.indirect_amount.toLocaleString()} |`)
  parts.push(`| **TOTAL** | **$${totals.grand_total.toLocaleString()}** |`)
  if (totals.match_total > 0) {
    parts.push(`| Federal Request | $${totals.federal_total.toLocaleString()} |`)
    parts.push(`| Non-Federal Match | $${totals.match_total.toLocaleString()} (${totals.match_pct}%) |`)
  }

  if (funderName) {
    parts.push(`\nAll costs comply with 2 CFR Part 200 Uniform Guidance and the specific requirements of ${funderName}. Costs are necessary, reasonable, and allocable to this award.`)
  }

  return parts.join('\n')
}

// ─── CSV export ────────────────────────────────────────────────────────────────
export function toCSV(state: BudgetState, totals: BudgetTotals): string {
  const rows: string[][] = []
  rows.push(['Category', 'Description', 'Quantity', 'Unit', 'Unit Cost', 'Total', 'Federal Share', 'Non-Federal Match', 'Notes'])

  for (const cat of BUDGET_CATEGORIES.filter(c => c.key !== 'indirect')) {
    const catItems = state.line_items.filter(li => li.category === cat.key)
    if (catItems.length === 0) continue
    for (const item of catItems) {
      rows.push([
        cat.label,
        item.description,
        String(item.quantity),
        item.unit,
        String(item.unit_cost),
        String(item.total),
        item.is_federal ? String(item.total) : '0',
        item.is_federal ? '0' : String(item.total),
        item.notes || '',
      ])
    }
    // Category subtotal
    const ct = totals.by_category.find(c => c.key === cat.key)
    if (ct && ct.total > 0) {
      rows.push([cat.label + ' SUBTOTAL', '', '', '', '', String(ct.total), String(ct.federal), String(ct.match), ''])
    }
  }

  rows.push(['', '', '', '', '', '', '', '', ''])
  rows.push(['TOTAL DIRECT COSTS', '', '', '', '', String(totals.total_direct), '', '', ''])
  if (totals.indirect_amount > 0) {
    rows.push([`Indirect (${state.indirect_rate_pct}% × ${state.indirect_method})`, '', '', '', '', String(totals.indirect_amount), String(totals.indirect_amount), '0', ''])
  }
  rows.push(['GRAND TOTAL', '', '', '', '', String(totals.grand_total), String(totals.federal_total), String(totals.match_total), ''])

  return rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

// ─── Helper: new blank line item ─────────────────────────────────────────────
export function newLineItem(category: CategoryKey, sortOrder: number): BudgetLineItem {
  return {
    id: crypto.randomUUID(),
    category,
    description: '',
    quantity: 1,
    unit: category === 'personnel' ? 'annual salary' : category === 'travel' ? 'trip' : category === 'equipment' ? 'unit' : 'lump sum',
    unit_cost: 0,
    total: 0,
    is_federal: true,
    sort_order: sortOrder,
  }
}

export function recompute(item: Omit<BudgetLineItem, 'total'>): BudgetLineItem {
  const total = Math.round(item.quantity * item.unit_cost)
  return { ...item, total }
}
