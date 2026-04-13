import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { computeTotals, generateJustification } from '@/lib/budget-engine'
import type { BudgetState } from '@/lib/budget-engine'
import { generateText } from 'ai'
import { defaultModel } from '@/lib/ai-gateway'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { state: BudgetState; funder_name?: string; ai_enhance?: boolean }
    const { state, funder_name, ai_enhance = true } = body
    const totals = computeTotals(state)
    const baseJustification = generateJustification(state, totals, funder_name)

    // AI enhancement: produce a polished, funder-aligned budget narrative
    let justification = baseJustification
    if (ai_enhance) {
      try {
        const budgetSummary = state.line_items.slice(0, 20).map((li: { category: string; description?: string; title?: string; amount?: number; annual_salary?: number; quantity?: number; unit_cost?: number; fringe_rate_pct?: number }) => {
          const amount = li.amount || (li.annual_salary) || (li.quantity && li.unit_cost ? li.quantity * li.unit_cost : 0)
          return `${li.category}: ${li.description || li.title || 'Item'} — $${Number(amount).toLocaleString()}${
            li.fringe_rate_pct ? ` (fringe ${li.fringe_rate_pct}%)` : ''
          }`
        }).join('\n')

        const { text } = await generateText({
          model: defaultModel,
          system: `You are an expert grant budget writer. Write clear, compliant budget justifications that explain why each cost is necessary and reasonable for achieving grant objectives. Be specific, avoid padding, and connect each line item to program outcomes.`,
          prompt: `Write a professional budget justification narrative for this grant budget.

**Funder:** ${funder_name || 'Federal/State Grant Funder'}
**Total Budget:** $${totals.grand_total.toLocaleString()}
**Federal Share:** $${totals.federal_total.toLocaleString()}
**Non-Federal Match:** $${totals.match_total.toLocaleString()}

**Budget Line Items:**
${budgetSummary}

**Base Draft:**
${baseJustification}

Expand this into a polished 400-600 word budget justification. For each cost category:
- Explain why the cost is necessary
- Show it is reasonable and allowable
- Connect it to program goals
- Reference OMB Uniform Guidance cost principles where relevant

Write in formal prose, organized by budget category.`,
          maxOutputTokens: 1200,
          temperature: 0.3,
        })
        justification = text
      } catch (aiErr) {
        console.warn('AI budget justification failed, using heuristic:', aiErr)
      }
    }

    return NextResponse.json({ justification, totals })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
