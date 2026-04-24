import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { parseCSVWithMapping } from '@/lib/csv-parser'
import { readFileSync } from 'fs'
import { join } from 'path'

// POST /api/import/sample — loads the bundled sample CSV for instant demo
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const csvPath = join(process.cwd(), 'public', 'sample-data.csv')
    const csvText = readFileSync(csvPath, 'utf8')

    const { mappingResult, rows, rowErrors, skipped } = parseCSVWithMapping(csvText)

    if (mappingResult.errors.length > 0) {
      return NextResponse.json({ error: 'Sample data parse failed', errors: mappingResult.errors }, { status: 500 })
    }

    const productNames = [...new Set(rows.map(r => r.product_name))]
    const productMap: Record<string, string> = {}

    for (const name of productNames) {
      const latestPrice = rows.filter(r => r.product_name === name)
        .sort((a, b) => b.purchased_at.getTime() - a.purchased_at.getTime())[0].price

      const { data: existing } = await supabase
        .from('products').select('id')
        .eq('user_id', user.id).eq('name', name).single()

      if (existing) {
        productMap[name] = existing.id
      } else {
        const { data: newProd } = await supabase.from('products').insert({
          user_id: user.id, name, platform: 'csv',
          current_price_cents: Math.round(latestPrice * 100), currency: 'usd',
        }).select('id').single()
        if (newProd) productMap[name] = newProd.id
      }
    }

    let imported = 0
    for (const row of rows) {
      const productId = productMap[row.product_name]
      if (!productId) continue
      const txnId = `sample_${user.id.slice(0,8)}_${row.customer_key}_${Math.round(row.price*100)}_${row.purchased_at.toISOString().slice(0,10)}`
      const { error: txErr } = await supabase.from('transactions').upsert({
        user_id: user.id, product_id: productId, platform: 'csv',
        platform_txn_id: txnId,
        amount_cents: Math.round(row.price * 100), currency: 'usd',
        is_refunded: false, customer_key: row.customer_key,
        purchased_at: row.purchased_at.toISOString(),
        metadata: { quantity: row.quantity, coupon_code: row.coupon_code },
      }, { onConflict: 'user_id,platform,platform_txn_id', ignoreDuplicates: true })
      if (!txErr) imported++
    }

    return NextResponse.json({
      success: true, imported, products: productNames.length, skipped,
      message: `Loaded ${imported} sample transactions — ready to analyze!`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
