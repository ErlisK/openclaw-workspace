/**
 * POST /api/free-audit
 * Public endpoint — no auth required.
 * Accepts: multipart/form-data with a CSV file
 * Returns: Bayesian simulation results for immediate display
 */
import { NextResponse } from 'next/server'
import { runEngine, Transaction } from '@/lib/engine'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

interface ParsedRow {
  date: string
  product: string
  price: number
  quantity: number
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row')
  
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
  
  // Try to find relevant columns
  const findCol = (candidates: string[]): number => {
    for (const c of candidates) {
      const idx = header.findIndex(h => h.includes(c))
      if (idx >= 0) return idx
    }
    return -1
  }
  
  const dateCol = findCol(['date', 'time', 'created', 'purchased'])
  const productCol = findCol(['product', 'item', 'name', 'description', 'desc'])
  const priceCol = findCol(['price', 'amount', 'revenue', 'total', 'gross'])
  const qtyCol = findCol(['quantity', 'qty', 'units', 'count'])
  
  if (priceCol < 0) throw new Error('Could not find a price/amount column in your CSV. Headers found: ' + header.join(', '))
  
  const rows: ParsedRow[] = []
  for (let i = 1; i < Math.min(lines.length, 2001); i++) {
    if (!lines[i].trim()) continue
    // Handle quoted commas
    const cols = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.trim().replace(/"/g, '')) ?? lines[i].split(',').map(c => c.trim())
    
    const rawPrice = cols[priceCol]?.replace(/[$€£,\s]/g, '')
    const price = parseFloat(rawPrice)
    if (!rawPrice || isNaN(price) || price <= 0) continue
    
    rows.push({
      date: dateCol >= 0 ? (cols[dateCol] || '') : '',
      product: productCol >= 0 ? (cols[productCol] || 'Product') : 'Product',
      price,
      quantity: qtyCol >= 0 ? (parseInt(cols[qtyCol]) || 1) : 1,
    })
  }
  
  return rows
}

function groupByProduct(rows: ParsedRow[]): Map<string, ParsedRow[]> {
  const map = new Map<string, ParsedRow[]>()
  for (const row of rows) {
    const key = row.product.slice(0, 60)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(row)
  }
  return map
}

function buildEngineInput(rows: ParsedRow[]): Transaction[] {
  // Group into monthly windows
  const byMonth = new Map<string, number[]>()
  for (const row of rows) {
    // Try to parse date, fallback to bucket by index
    let key = 'period-0'
    if (row.date) {
      const d = new Date(row.date)
      if (!isNaN(d.getTime())) {
        key = `${d.getFullYear()}-${d.getMonth()}`
      }
    }
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(row.price)
  }
  
  if (byMonth.size < 2) {
    // Not enough temporal spread — create synthetic windows by price clustering
    const prices = rows.map(r => r.price)
    const unique = [...new Set(prices)].sort((a, b) => a - b)
    if (unique.length < 2) {
      // Single price point — return as-is
      return [{ price: unique[0], quantity: rows.length, period_days: 30 }]
    }
    return unique.map(p => ({
      price: p,
      quantity: rows.filter(r => r.price === p).length,
      period_days: 30,
    }))
  }
  
  return [...byMonth.entries()].map(([, prices]) => ({
    price: prices.reduce((a, b) => a + b, 0) / prices.length,
    quantity: prices.length,
    period_days: 30,
  }))
}

export async function POST(request: Request) {
  try {
    let csvText = ''
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      csvText = await file.text()
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      // Raw CSV body
      csvText = await request.text()
    } else {
      // JSON body with csv field
      const body = await request.json().catch(() => ({}))
      csvText = body.csv || ''
    }
    
    if (!csvText) return NextResponse.json({ error: 'Empty CSV' }, { status: 400 })
    
    // Parse CSV
    let rows: ParsedRow[]
    try {
      rows = parseCSV(csvText)
    } catch (err: unknown) {
      return NextResponse.json({ error: (err as Error).message || 'Failed to parse CSV' }, { status: 400 })
    }
    
    if (rows.length < 3) {
      return NextResponse.json({
        error: `Only found ${rows.length} valid transaction row(s). We need at least 3 to run a simulation. Make sure your CSV has date, product, and price columns.`,
      }, { status: 400 })
    }
    
    // Group by product
    const byProduct = groupByProduct(rows)
    
    const results = []
    let totalRevenue = 0
    
    for (const [productName, productRows] of byProduct.entries()) {
      if (results.length >= 5) break // max 5 products in free audit
      
      const txInput = buildEngineInput(productRows)
      const engineResult = runEngine(txInput)
      
      const currentPriceRaw = productRows.map(r => r.price).sort((a, b) => a - b)
      const medianIdx = Math.floor(currentPriceRaw.length / 2)
      const currentPrice = currentPriceRaw[medianIdx]
      const monthlyRevEst = productRows.length * currentPrice / Math.max(1, byProduct.size) 
      totalRevenue += monthlyRevEst
      
      results.push({
        product: productName,
        n_transactions: productRows.length,
        current_price: currentPrice,
        engine: engineResult,
        estimated_monthly_rev: Math.round(monthlyRevEst),
      })
    }
    
    return NextResponse.json({
      ok: true,
      n_rows: rows.length,
      n_products: byProduct.size,
      estimated_mrr: Math.round(totalRevenue),
      results: results.slice(0, 5),
      note: byProduct.size > 5 ? `Showing top 5 of ${byProduct.size} products. Sign up to analyze all.` : null,
    })
  } catch (err: unknown) {
    console.error('[free-audit]', err)
    return NextResponse.json({ error: 'Internal error. Please try again.' }, { status: 500 })
  }
}
