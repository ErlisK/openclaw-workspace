/**
 * POST /api/connectors/validate
 * Validate a CSV file before full import. Returns field-level errors and a preview.
 * Body: multipart form with `file` + `platform` (gumroad|shopify|stripe)
 * Returns: { valid, rows_found, rows_valid, rows_skipped, errors[], preview[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const maxDuration = 20

const PLATFORM_SCHEMAS: Record<string, { required: string[]; optional: string[]; description: string }> = {
  gumroad: {
    required: ['sale date', 'product name', 'price'],
    optional: ['email', 'currency', 'refunded', 'net total', 'country'],
    description: 'Gumroad → Analytics → Sales (CSV export)',
  },
  shopify: {
    required: ['name', 'total'],
    optional: ['email', 'financial status', 'currency', 'created at', 'lineitem name', 'subtotal'],
    description: 'Shopify → Orders → Export orders (CSV)',
  },
  stripe: {
    required: ['id', 'amount'],
    optional: ['customer email', 'currency', 'status', 'description', 'created (utc)', 'metadata: product_name'],
    description: 'Stripe Dashboard → Payments → Export (CSV)',
  },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const platform = (formData.get('platform') as string || '').toLowerCase()

  if (!file) return NextResponse.json({ error: 'No file (field name: file)' }, { status: 400 })
  if (!platform || !PLATFORM_SCHEMAS[platform]) {
    return NextResponse.json({
      error: `Invalid platform. Use: ${Object.keys(PLATFORM_SCHEMAS).join(' | ')}`,
    }, { status: 400 })
  }

  const schema = PLATFORM_SCHEMAS[platform]
  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  if (lines.length === 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 })
  if (lines.length < 2) return NextResponse.json({ error: 'CSV has no data rows (only header)' }, { status: 400 })

  const rawHeader = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const errors: string[] = []
  const warnings: string[] = []

  // Check required columns
  const missingRequired: string[] = []
  for (const req of schema.required) {
    const found = rawHeader.some(h => h.includes(req))
    if (!found) missingRequired.push(req)
  }
  if (missingRequired.length > 0) {
    errors.push(`Missing required columns: ${missingRequired.join(', ')}`)
  }

  // Check column count consistency
  const expectedCols = rawHeader.length
  let inconsistentRows = 0

  const preview: Record<string, string>[] = []
  let rowsValid = 0
  let rowsSkipped = 0
  const rowErrors: Array<{ row: number; error: string }> = []

  for (let i = 1; i < Math.min(lines.length, 501); i++) {
    const cols = splitCSV(lines[i])
    if (cols.length !== expectedCols) {
      inconsistentRows++
      if (rowErrors.length < 5) {
        rowErrors.push({ row: i + 1, error: `Expected ${expectedCols} columns, found ${cols.length}` })
      }
      rowsSkipped++
      continue
    }

    const row: Record<string, string> = {}
    rawHeader.forEach((h, idx) => { row[h] = cols[idx]?.trim().replace(/^"|"$/g, '') ?? '' })

    // Platform-specific validation
    let rowError: string | null = null

    if (platform === 'gumroad') {
      const price = parseFloat(row['price'] || row['net total'] || '0')
      if (price <= 0) rowError = `Row ${i + 1}: price is 0 or missing`
      else if (!row['sale date'] && !row['created_at']) rowError = `Row ${i + 1}: no date found`
    } else if (platform === 'shopify') {
      const total = parseFloat(row['total'] || row['subtotal'] || '0')
      if (total <= 0) rowError = `Row ${i + 1}: total is 0 or missing`
      else if (!row['name'] && !row['id']) rowError = `Row ${i + 1}: no order ID found`
    } else if (platform === 'stripe') {
      const amount = parseFloat(row['amount'] || '0')
      if (amount <= 0) rowError = `Row ${i + 1}: amount is 0 or missing`
      else if (!row['id']) rowError = `Row ${i + 1}: charge ID missing`
    }

    if (rowError) {
      if (rowErrors.length < 5) rowErrors.push({ row: i + 1, error: rowError })
      rowsSkipped++
    } else {
      rowsValid++
      if (preview.length < 3) preview.push(row)
    }
  }

  if (inconsistentRows > 0) {
    warnings.push(`${inconsistentRows} rows have inconsistent column counts and will be skipped`)
  }

  const totalRows = lines.length - 1
  const valid = errors.length === 0 && rowsValid > 0

  return NextResponse.json({
    valid,
    platform,
    rows_found: totalRows,
    rows_valid: rowsValid,
    rows_skipped: rowsSkipped,
    errors,
    warnings,
    row_errors: rowErrors,
    preview,
    schema: {
      required_columns: schema.required,
      optional_columns: schema.optional,
      export_instructions: schema.description,
    },
    message: valid
      ? `✅ ${rowsValid} valid rows ready to import (${rowsSkipped} will be skipped)`
      : errors.length > 0
      ? `❌ Validation failed: ${errors.join('; ')}`
      : `⚠️ No valid rows found — check column values`,
  })
}

function splitCSV(line: string): string[] {
  const result: string[] = []; let cur = ''; let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cur); cur = '' }
    else cur += ch
  }
  result.push(cur); return result
}
