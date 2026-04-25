import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { parseCSVWithMapping } from '@/lib/csv-parser'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mappingOverride = formData.get('mapping')
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // File size guard — reject files over 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
    }

    const csvText = await file.text()
    const overrideMapping = mappingOverride ? JSON.parse(mappingOverride as string) : undefined
    const { mapping, mappingResult, rows, rowErrors, skipped } = parseCSVWithMapping(csvText, overrideMapping)

    if (mappingResult.errors.length > 0) {
      return NextResponse.json({
        error: mappingResult.errors.join('; '),
        errors: mappingResult.errors,
        mapping: mappingResult.mapping,
        headers: mappingResult.headers,
        preview: mappingResult.preview,
        needs_mapping: true,
      }, { status: 422 })
    }

    if (rows.length === 0) {
      return NextResponse.json({
        error: 'No valid rows found. Check that your date and price columns are correct.',
        row_errors: rowErrors.slice(0, 5),
      }, { status: 422 })
    }

    // Group by product name → upsert products
    const productNames = [...new Set(rows.map(r => r.product_name))]
    const productMap: Record<string, string> = {}

    for (const name of productNames) {
      const productRows = rows.filter(r => r.product_name === name)
      const latestPrice = productRows.sort((a, b) =>
        b.purchased_at.getTime() - a.purchased_at.getTime())[0].price

      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name)
        .single()

      if (existing) {
        productMap[name] = existing.id
        await supabase.from('products').update({
          current_price_cents: Math.round(latestPrice * 100),
        }).eq('id', existing.id)
      } else {
        const { data: newProd } = await supabase.from('products').insert({
          user_id: user.id,
          name,
          platform: 'csv',
          current_price_cents: Math.round(latestPrice * 100),
          currency: 'usd',
        }).select('id').single()
        if (newProd) productMap[name] = newProd.id
      }
    }

    // Insert transactions (upsert for dedup)
    let imported = 0
    for (const row of rows) {
      const productId = productMap[row.product_name]
      if (!productId) continue

      const txnId = `csv_${user.id.slice(0,8)}_${row.customer_key}_${Math.round(row.price * 100)}_${row.purchased_at.toISOString().slice(0,10)}`

      const { error: txErr } = await supabase.from('transactions').upsert({
        user_id: user.id,
        product_id: productId,
        platform: 'csv',
        platform_txn_id: txnId,
        amount_cents: Math.round(row.price * 100),
        currency: 'usd',
        is_refunded: row.is_refunded,
        customer_key: row.customer_key,
        purchased_at: row.purchased_at.toISOString(),
        metadata: {
          quantity: row.quantity,
          revenue: row.revenue,
          coupon_code: row.coupon_code,
        },
      }, { onConflict: 'user_id,platform,platform_txn_id', ignoreDuplicates: true })

      if (!txErr) imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped: skipped + (rows.length - imported),
      products: productNames.length,
      row_errors: rowErrors.slice(0, 5),
      warnings: mappingResult.warnings,
      message: `Imported ${imported} transactions across ${productNames.length} products`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
