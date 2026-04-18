/**
 * CSV Mapper Library — GigAnalytics
 * Detects format from headers and normalizes to TransactionRow
 */

export interface TransactionRow {
  date: string           // ISO date YYYY-MM-DD
  amount: number         // gross amount (positive)
  net_amount: number     // after fees
  fee_amount: number     // platform fees
  description: string
  source_id: string      // dedup key
  currency: string
  platform: string       // 'stripe' | 'paypal' | 'upwork' | 'custom'
  raw: Record<string, string>  // original row
}

export interface MapperResult {
  platform: string
  rows: TransactionRow[]
  skipped: number
  errors: string[]
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function parseAmount(v: string | undefined): number {
  if (!v) return 0
  const n = parseFloat(v.replace(/[$,\s]/g, ''))
  return isNaN(n) ? 0 : Math.abs(n)
}

function parseDate(v: string | undefined): string | null {
  if (!v) return null
  // Try common formats
  const cleaned = v.trim()
  // "Jan 15, 2024" or "January 15, 2024"
  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  // MM/DD/YYYY
  const mdy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${String(mdy[1]).padStart(2,'0')}-${String(mdy[2]).padStart(2,'0')}`
  // DD/MM/YYYY
  const dmy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`
  return null
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_-]+/g, '_')
}

function findCol(row: Record<string, string>, candidates: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const c of candidates) {
    const found = keys.find(k => normalizeHeader(k) === normalizeHeader(c))
    if (found) return row[found]
  }
  return undefined
}

// ─── Platform Detection ───────────────────────────────────────────────────────

export type Platform = 'stripe_balance' | 'stripe_payouts' | 'stripe_charges' | 'paypal' | 'upwork' | 'generic'

export function detectPlatform(headers: string[]): Platform {
  const hs = headers.map(normalizeHeader)
  const has = (...cols: string[]) => cols.every(c => hs.some(h => h.includes(c.replace(/\s/g,'_'))))
  const any = (...cols: string[]) => cols.some(c => hs.some(h => h.includes(c)))

  // Stripe Balance Transaction History
  if (any('balance_transaction_id') || (has('reporting_category') && any('gross', 'fee', 'net'))) {
    return 'stripe_balance'
  }
  // Stripe Payouts
  if (any('payout_id') || (has('amount') && any('arrival_date', 'destination'))) {
    return 'stripe_payouts'
  }
  // Stripe Charges
  if (any('charge_id') || (has('amount_captured') && any('payment_intent'))) {
    return 'stripe_charges'
  }
  // PayPal
  if (any('transaction_id', 'transaction_event_code') || has('gross', 'balance') && any('paypal')) {
    return 'paypal'
  }
  // Upwork
  if (any('team_id', 'provider_name') || (has('amount') && any('type', 'subtype') && any('team'))) {
    return 'upwork'
  }
  return 'generic'
}

// ─── Stripe Balance Transaction History ──────────────────────────────────────
// Headers: id, Type, Source, Gross, Fee, Net, Currency, Created (UTC), ...

function mapStripeBalance(rows: Record<string, string>[]): MapperResult {
  const result: MapperResult = { platform: 'stripe', rows: [], skipped: 0, errors: [] }

  for (const row of rows) {
    const type = findCol(row, ['Type', 'type', 'reporting_category'])?.toLowerCase() || ''
    // Only include charge/payment types, skip refunds & payouts for revenue tracking
    if (!['charge', 'payment', 'payout', 'transfer'].some(t => type.includes(t))) {
      // Include all non-empty types — let user filter
    }
    if (!type || type === 'payout') { result.skipped++; continue }

    const dateStr = findCol(row, ['Created (UTC)', 'created_(utc)', 'created', 'date', 'Created'])
    const date = parseDate(dateStr)
    if (!date) { result.skipped++; continue }

    const gross = parseAmount(findCol(row, ['Gross', 'gross', 'Amount', 'amount']))
    if (gross === 0) { result.skipped++; continue }

    const fee = parseAmount(findCol(row, ['Fee', 'fee', 'Fees', 'fees']))
    const net = parseAmount(findCol(row, ['Net', 'net'])) || (gross - fee)
    const desc = findCol(row, ['Description', 'description', 'Customer Email', 'customer_email']) || ''
    const sourceId = findCol(row, ['id', 'ID', 'Source', 'source', 'Charge ID', 'charge_id']) || `stripe-bal-${date}-${gross}`

    result.rows.push({
      date,
      amount: gross,
      net_amount: net,
      fee_amount: fee,
      description: desc,
      source_id: `stripe_${sourceId}`,
      currency: findCol(row, ['Currency', 'currency'])?.toLowerCase() || 'usd',
      platform: 'stripe',
      raw: row,
    })
  }
  return result
}

// ─── Stripe Charges Export ────────────────────────────────────────────────────
// Headers: id, Description, Created (UTC), Amount, Amount Refunded, Currency,
//          Converted Amount, Fee, Net, ...

function mapStripeCharges(rows: Record<string, string>[]): MapperResult {
  const result: MapperResult = { platform: 'stripe', rows: [], skipped: 0, errors: [] }

  for (const row of rows) {
    const dateStr = findCol(row, ['Created (UTC)', 'created_(utc)', 'Created', 'created', 'Date'])
    const date = parseDate(dateStr)
    if (!date) { result.skipped++; continue }

    const amount = parseAmount(findCol(row, ['Amount', 'amount', 'Converted Amount', 'Amount Captured', 'amount_captured']))
    if (amount === 0) { result.skipped++; continue }

    const fee = parseAmount(findCol(row, ['Fee', 'fee', 'Application Fee Amount']))
    const net = parseAmount(findCol(row, ['Net', 'net'])) || (amount - fee)
    const desc = findCol(row, ['Description', 'description', 'Customer Description', 'Customer Email', 'customer_email']) || ''
    const sourceId = findCol(row, ['id', 'ID', 'Charge ID']) || `stripe-chg-${date}-${amount}`

    result.rows.push({
      date,
      amount,
      net_amount: net,
      fee_amount: fee,
      description: desc,
      source_id: `stripe_${sourceId}`,
      currency: findCol(row, ['Currency', 'currency'])?.toLowerCase() || 'usd',
      platform: 'stripe',
      raw: row,
    })
  }
  return result
}

// ─── PayPal Activity Download ─────────────────────────────────────────────────
// Headers: Date, Time, TimeZone, Name, Type, Status, Currency, Gross, Fee, Net,
//          From Email Address, To Email Address, Transaction ID, ...

function mapPayPal(rows: Record<string, string>[]): MapperResult {
  const result: MapperResult = { platform: 'paypal', rows: [], skipped: 0, errors: [] }
  const includeTypes = ['payment', 'sale', 'received', 'invoice', 'subscription', 'general']
  const skipStatuses = ['pending', 'denied', 'reversed', 'refunded', 'cancelled']

  for (const row of rows) {
    const status = findCol(row, ['Status', 'status'])?.toLowerCase() || ''
    if (skipStatuses.some(s => status.includes(s))) { result.skipped++; continue }

    const type = findCol(row, ['Type', 'type'])?.toLowerCase() || ''
    // Include payments received; skip withdrawals
    const gross = parseAmount(findCol(row, ['Gross', 'gross']))
    const grossRaw = findCol(row, ['Gross', 'gross']) || ''
    const isNegative = grossRaw.trim().startsWith('-')
    if (isNegative || gross === 0) { result.skipped++; continue }

    const dateStr = findCol(row, ['Date', 'date', 'Transaction Date'])
    const date = parseDate(dateStr)
    if (!date) { result.skipped++; continue }

    const fee = parseAmount(findCol(row, ['Fee', 'fee']))
    const net = parseAmount(findCol(row, ['Net', 'net'])) || (gross - fee)
    const name = findCol(row, ['Name', 'name', 'From Email Address', 'from_email_address']) || ''
    const txId = findCol(row, ['Transaction ID', 'transaction_id', 'ID', 'id']) || `paypal-${date}-${gross}`

    result.rows.push({
      date,
      amount: gross,
      net_amount: net,
      fee_amount: fee,
      description: name || type,
      source_id: `paypal_${txId}`,
      currency: findCol(row, ['Currency', 'currency'])?.toLowerCase() || 'usd',
      platform: 'paypal',
      raw: row,
    })
  }
  return result
}

// ─── Upwork Transaction History ───────────────────────────────────────────────
// Headers: Date, Type, Description/Memo, Amount, Balance

function mapUpwork(rows: Record<string, string>[]): MapperResult {
  const result: MapperResult = { platform: 'upwork', rows: [], skipped: 0, errors: [] }

  for (const row of rows) {
    const type = findCol(row, ['Type', 'type', 'Transaction Type'])?.toLowerCase() || ''
    // Only include service charges (payments received)
    if (type.includes('withdrawal') || type.includes('refund') || type.includes('fee')) {
      result.skipped++; continue
    }

    const amtRaw = findCol(row, ['Amount', 'amount']) || '0'
    const amount = parseAmount(amtRaw)
    const isNegative = amtRaw.trim().startsWith('-')
    if (isNegative || amount === 0) { result.skipped++; continue }

    const dateStr = findCol(row, ['Date', 'date', 'Adjusted Date'])
    const date = parseDate(dateStr)
    if (!date) { result.skipped++; continue }

    const desc = findCol(row, ['Description', 'description', 'Memo', 'memo']) || ''
    // Upwork takes ~10% — estimate unless explicit fee column
    const feeEstimate = amount * 0.1
    const net = amount - feeEstimate
    const sourceId = `upwork-${date}-${amount}-${desc.slice(0, 20).replace(/\s/g, '_')}`

    result.rows.push({
      date,
      amount,
      net_amount: net,
      fee_amount: feeEstimate,
      description: desc,
      source_id: sourceId,
      currency: 'usd',
      platform: 'upwork',
      raw: row,
    })
  }
  return result
}

// ─── Generic CSV Mapper ───────────────────────────────────────────────────────
// Used when platform not recognized; applies user-provided column mapping

export interface ColumnMapping {
  date: string
  amount: string
  net_amount?: string
  fee_amount?: string
  description?: string
  source_id?: string
  currency?: string
}

export function mapGeneric(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): MapperResult {
  const result: MapperResult = { platform: 'custom', rows: [], skipped: 0, errors: [] }

  rows.forEach((row, i) => {
    const dateStr = row[mapping.date]
    const date = parseDate(dateStr)
    if (!date) { result.skipped++; return }

    const amount = parseAmount(row[mapping.amount])
    if (amount === 0) { result.skipped++; return }

    const fee = mapping.fee_amount ? parseAmount(row[mapping.fee_amount]) : 0
    const net = mapping.net_amount ? parseAmount(row[mapping.net_amount]) : (amount - fee)
    const desc = mapping.description ? row[mapping.description] || '' : ''
    const sourceId = mapping.source_id
      ? row[mapping.source_id] || `custom-${i}-${date}-${amount}`
      : `custom-${i}-${date}-${amount}`

    result.rows.push({
      date,
      amount,
      net_amount: net,
      fee_amount: fee,
      description: desc,
      source_id: `custom_${sourceId}`,
      currency: (mapping.currency ? row[mapping.currency] : 'usd')?.toLowerCase() || 'usd',
      platform: 'custom',
      raw: row,
    })
  })
  return result
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function mapCsvRows(
  rows: Record<string, string>[],
  headers: string[],
  customMapping?: ColumnMapping
): MapperResult {
  const platform = detectPlatform(headers)

  if (customMapping) return mapGeneric(rows, customMapping)

  switch (platform) {
    case 'stripe_balance': return mapStripeBalance(rows)
    case 'stripe_charges': return mapStripeCharges(rows)
    case 'stripe_payouts': return mapStripeBalance(rows) // similar structure
    case 'paypal': return mapPayPal(rows)
    case 'upwork': return mapUpwork(rows)
    default: {
      // Auto-detect generic columns
      const autoMapping: ColumnMapping = {
        date: headers.find(h => /date|created|time/i.test(h)) || headers[0],
        amount: headers.find(h => /amount|gross|total/i.test(h)) || headers[1],
        net_amount: headers.find(h => /net/i.test(h)),
        fee_amount: headers.find(h => /fee/i.test(h)),
        description: headers.find(h => /desc|note|memo|name/i.test(h)),
        source_id: headers.find(h => /id$/i.test(h)),
      }
      return mapGeneric(rows, autoMapping)
    }
  }
}

export { detectPlatform as detectCsvPlatform }
