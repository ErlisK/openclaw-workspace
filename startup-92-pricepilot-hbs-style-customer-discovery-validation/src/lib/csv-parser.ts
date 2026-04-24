/**
 * CSV Column Mapping & Validation
 * Handles: price, quantity, revenue, product, timestamp, coupon
 */

export interface ColumnMapping {
  date: number | null
  product: number | null
  price: number | null
  quantity: number | null
  revenue: number | null
  coupon: number | null
}

export interface MappingResult {
  mapping: ColumnMapping
  headers: string[]
  preview: string[][]          // first 3 data rows
  errors: string[]             // missing required columns
  warnings: string[]           // optional columns not found
  confidence: Record<string, number>  // 0-1 confidence for each mapping
}

export interface ParsedRow {
  product_name: string
  price: number
  quantity: number
  revenue: number
  purchased_at: Date
  coupon_code: string | null
  customer_key: string
  is_refunded: boolean
}

// Column name patterns for auto-detection
const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  date: [
    /^date$/i, /^timestamp$/i, /^created_at$/i, /^purchase_?date$/i,
    /^sale_?date$/i, /^order_?date$/i, /^time$/i, /^when$/i,
  ],
  product: [
    /^product_?title$/i, /^product_?name$/i, /^item_?name$/i, /^name$/i,
    /^title$/i, /^product$/i, /^description$/i, /^sku$/i,
  ],
  price: [
    /^price$/i, /^unit_?price$/i, /^product_?price$/i, /^amount$/i,
    /^sale_?price$/i, /^list_?price$/i, /^cost$/i,
  ],
  quantity: [
    /^qty$/i, /^quantity$/i, /^units$/i, /^count$/i, /^num_?items$/i,
    /^items$/i, /^seats$/i,
  ],
  revenue: [
    /^revenue$/i, /^total$/i, /^subtotal$/i, /^total_?amount$/i,
    /^gross$/i, /^net$/i, /^earnings$/i, /^payout$/i,
  ],
  coupon: [
    /^coupon$/i, /^coupon_?code$/i, /^promo_?code$/i, /^discount_?code$/i,
    /^voucher$/i, /^code$/i, /^referral$/i, /^affiliate$/i,
  ],
}

const REQUIRED_COLUMNS: (keyof ColumnMapping)[] = ['date', 'product', 'price']
const OPTIONAL_COLUMNS: (keyof ColumnMapping)[] = ['quantity', 'revenue', 'coupon']

/**
 * Auto-detect column mapping from CSV headers
 */
export function detectColumnMapping(headers: string[]): MappingResult {
  const normalized = headers.map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const mapping: ColumnMapping = {
    date: null, product: null, price: null,
    quantity: null, revenue: null, coupon: null,
  }
  const confidence: Record<string, number> = {}

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const key = field as keyof ColumnMapping
    let bestIdx = -1
    let bestScore = 0

    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i]
      for (let p = 0; p < patterns.length; p++) {
        if (patterns[p].test(h)) {
          // Earlier patterns = higher confidence
          const score = 1 - (p / patterns.length) * 0.5
          if (score > bestScore) {
            bestScore = score
            bestIdx = i
          }
        }
      }
    }

    if (bestIdx >= 0) {
      mapping[key] = bestIdx
      confidence[field] = bestScore
    }
  }

  const errors: string[] = []
  const warnings: string[] = []

  for (const req of REQUIRED_COLUMNS) {
    if (mapping[req] === null) {
      errors.push(`Required column "${req}" not found. Expected headers like: ${COLUMN_PATTERNS[req].slice(0,3).map(p => p.source.replace(/[\\^$]/g,'')).join(', ')}`)
    }
  }
  for (const opt of OPTIONAL_COLUMNS) {
    if (mapping[opt] === null) {
      warnings.push(`Optional column "${opt}" not detected — will use defaults`)
    }
  }

  return { mapping, headers, preview: [], errors, warnings, confidence }
}

/**
 * Validate a single row against the mapping
 */
export function validateRow(
  row: string[],
  mapping: ColumnMapping,
  rowNum: number
): { valid: boolean; row?: ParsedRow; error?: string } {
  const get = (idx: number | null, fallback = '') =>
    idx !== null && idx < row.length ? row[idx].trim().replace(/^"|"$/g, '') : fallback

  // Date
  const rawDate = get(mapping.date)
  const parsedDate = new Date(rawDate)
  if (!rawDate || isNaN(parsedDate.getTime())) {
    return { valid: false, error: `Row ${rowNum}: invalid date "${rawDate}"` }
  }

  // Price
  const rawPrice = get(mapping.price).replace(/[$,€£¥]/g, '')
  const price = parseFloat(rawPrice)
  if (isNaN(price) || price < 0) {
    return { valid: false, error: `Row ${rowNum}: invalid price "${rawPrice}"` }
  }

  // Product name
  const productName = get(mapping.product, 'Unknown Product')
  if (!productName || productName.length < 1) {
    return { valid: false, error: `Row ${rowNum}: missing product name` }
  }

  // Quantity (default 1)
  const rawQty = get(mapping.quantity, '1').replace(/,/g, '')
  const quantity = parseInt(rawQty) || 1

  // Revenue (default = price * quantity)
  const rawRevenue = get(mapping.revenue, '').replace(/[$,€£¥]/g, '')
  const revenue = rawRevenue ? (parseFloat(rawRevenue) || price * quantity) : price * quantity

  // Coupon (optional)
  const coupon = get(mapping.coupon) || null

  // Simple hash for customer key
  const seed = `${rowNum}_${parsedDate.toISOString()}_${price}`
  const customer_key = seed.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0).toString(16)

  return {
    valid: true,
    row: {
      product_name: productName,
      price,
      quantity,
      revenue,
      purchased_at: parsedDate,
      coupon_code: coupon,
      customer_key,
      is_refunded: false,
    },
  }
}

/**
 * Full parse: detect mapping → validate all rows → return results
 */
export function parseCSVWithMapping(
  csvText: string,
  overrideMapping?: Partial<ColumnMapping>
): {
  mapping: ColumnMapping
  mappingResult: MappingResult
  rows: ParsedRow[]
  rowErrors: string[]
  skipped: number
} {
  const lines = csvText.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) {
    const emptyMapping: ColumnMapping = { date: null, product: null, price: null, quantity: null, revenue: null, coupon: null }
    return {
      mapping: emptyMapping,
      mappingResult: { mapping: emptyMapping, headers: [], preview: [], errors: ['CSV must have at least one data row'], warnings: [], confidence: {} },
      rows: [], rowErrors: [], skipped: 0,
    }
  }

  // Parse headers (handle quoted headers)
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const mappingResult = detectColumnMapping(rawHeaders)

  // Apply any user overrides
  const finalMapping: ColumnMapping = { ...mappingResult.mapping, ...overrideMapping }

  // Preview rows
  mappingResult.preview = lines.slice(1, 4).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')))

  const rows: ParsedRow[] = []
  const rowErrors: string[] = []
  let skipped = 0

  if (mappingResult.errors.length === 0) {
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      if (cols.every(c => !c)) continue  // skip empty lines

      const result = validateRow(cols, finalMapping, i + 1)
      if (result.valid && result.row) {
        rows.push(result.row)
      } else {
        rowErrors.push(result.error || `Row ${i+1}: unknown error`)
        skipped++
      }
    }
  }

  return { mapping: finalMapping, mappingResult, rows, rowErrors, skipped }
}
