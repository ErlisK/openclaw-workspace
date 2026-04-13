import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { computeTotals, generateJustification, toCSV } from '@/lib/budget-engine'
import type { BudgetState } from '@/lib/budget-engine'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { state: BudgetState; format: 'csv' | 'docx' | 'json'; funder_name?: string }
    const { state, format, funder_name } = body
    const totals = computeTotals(state)

    if (format === 'csv') {
      const csv = toCSV(state, totals)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="budget-${Date.now()}.csv"`,
        }
      })
    }

    if (format === 'docx') {
      const { Document, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel } = await import('docx')
      const { BUDGET_CATEGORIES } = await import('@/lib/budget-engine')

      const moneyFmt = (n: number) => `$${n.toLocaleString()}`

      const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
      const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder }

      const headerCell = (text: string) => new TableCell({
        shading: { fill: '4F46E5' },
        borders: cellBorders,
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })] })],
      })
      const dataCell = (text: string, bold = false) => new TableCell({
        borders: cellBorders,
        children: [new Paragraph({ children: [new TextRun({ text, bold, size: 18 })] })],
      })
      const amountCell = (n: number, bold = false) => new TableCell({
        borders: cellBorders,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: moneyFmt(n), bold, size: 18 })] })],
      })

      // Build line item rows
      const itemRows: InstanceType<typeof TableRow>[] = []
      for (const cat of BUDGET_CATEGORIES.filter(c => c.key !== 'indirect')) {
        const catItems = state.line_items.filter(li => li.category === cat.key)
        if (catItems.length === 0) continue
        // Category header
        itemRows.push(new TableRow({
          children: [
            new TableCell({ shading: { fill: 'F3F4F6' }, columnSpan: 5, borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: cat.label, bold: true, size: 18 })] })] }),
          ],
        }))
        for (const item of catItems) {
          itemRows.push(new TableRow({
            children: [
              dataCell(`  ${item.description}`),
              dataCell(`${item.quantity} ${item.unit}`),
              amountCell(item.unit_cost),
              amountCell(item.total),
              dataCell(item.is_federal ? 'Federal' : 'Match'),
            ],
          }))
        }
        // Subtotal row
        const ct = totals.by_category.find(c => c.key === cat.key)
        if (ct && ct.total > 0) {
          itemRows.push(new TableRow({
            children: [
              dataCell(`${cat.label} Subtotal`, true),
              dataCell(''), dataCell(''),
              amountCell(ct.total, true),
              dataCell(''),
            ],
          }))
        }
      }

      // Summary rows
      const summaryRows: InstanceType<typeof TableRow>[] = [
        new TableRow({ children: [dataCell('TOTAL DIRECT COSTS', true), dataCell(''), dataCell(''), amountCell(totals.total_direct, true), dataCell('')] }),
        ...(totals.indirect_amount > 0 ? [new TableRow({ children: [dataCell(`Indirect (${state.indirect_rate_pct}% × ${state.indirect_method})`), dataCell(''), dataCell(''), amountCell(totals.indirect_amount), dataCell('Federal')] })] : []),
        new TableRow({ children: [dataCell('GRAND TOTAL', true), dataCell(''), dataCell(''), amountCell(totals.grand_total, true), dataCell('')] }),
        ...(totals.match_total > 0 ? [
          new TableRow({ children: [dataCell('Federal Request', true), dataCell(''), dataCell(''), amountCell(totals.federal_total, true), dataCell('')] }),
          new TableRow({ children: [dataCell(`Non-Federal Match (${totals.match_pct}%)`, true), dataCell(''), dataCell(''), amountCell(totals.match_total, true), dataCell('')] }),
        ] : []),
      ]

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Project Budget', bold: true, size: 28 })] }),
            new Paragraph({ children: [new TextRun({ text: funder_name ? `Prepared for: ${funder_name}` : '', size: 18, color: '666666' })] }),
            new Paragraph({ text: '' }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: [headerCell('Description'), headerCell('Qty / Unit'), headerCell('Unit Cost'), headerCell('Total'), headerCell('Share')] }),
                ...itemRows,
                ...summaryRows,
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Budget Narrative', bold: true, size: 24 })] }),
            ...generateJustification(state, totals, funder_name).split('\n').map(line => {
              if (line.startsWith('### ')) return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: line.replace(/^### /, ''), bold: true })] })
              if (line.startsWith('**') && line.endsWith('**')) return new Paragraph({ children: [new TextRun({ text: line.replace(/\*\*/g, ''), bold: true })] })
              return new Paragraph({ children: [new TextRun({ text: line.replace(/\*\*/g, ''), size: 18 })] })
            }),
          ],
        }],
      })

      const { Packer } = await import('docx')
      const buffer = await Packer.toBuffer(doc)

      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="budget-${Date.now()}.docx"`,
        }
      })
    }

    if (format === 'json') {
      return NextResponse.json({ state, totals, justification: generateJustification(state, totals, funder_name) })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (err) {
    console.error('Budget export error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
