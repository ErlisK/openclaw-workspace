import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { parseGumroadCSV } from '@/lib/engine'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const csvText = await file.text()
    const { rows, errors } = parseGumroadCSV(csvText)

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; '), errors }, { status: 422 })
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 422 })
    }

    // Group by product name
    const productNames = [...new Set(rows.map(r => r.product_name))]

    // Upsert products
    const productMap: Record<string, string> = {}
    for (const name of productNames) {
      const productRows = rows.filter(r => r.product_name === name && !r.is_refunded)
      const prices = productRows.map(r => r.price).sort((a, b) => b - a)
      const currentPrice = prices[0] || 0

      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name)
        .single()

      if (existing) {
        productMap[name] = existing.id
        await supabase.from('products').update({
          current_price_cents: Math.round(currentPrice * 100),
          platform: 'csv',
        }).eq('id', existing.id)
      } else {
        const { data: newProduct } = await supabase.from('products').insert({
          user_id: user.id,
          name,
          platform: 'csv',
          current_price_cents: Math.round(currentPrice * 100),
          currency: 'usd',
        }).select('id').single()
        if (newProduct) productMap[name] = newProduct.id
      }
    }

    // Insert transactions (ignore duplicates)
    let imported = 0, skipped = 0
    for (const row of rows) {
      const productId = productMap[row.product_name]
      if (!productId) continue

      const { error: txErr } = await supabase.from('transactions').upsert({
        user_id: user.id,
        product_id: productId,
        platform: 'csv',
        platform_txn_id: `csv_${user.id}_${row.customer_key}_${row.purchased_at.toISOString()}_${row.price}`,
        amount_cents: Math.round(row.price * 100),
        currency: 'usd',
        is_refunded: row.is_refunded,
        customer_key: row.customer_key,
        purchased_at: row.purchased_at.toISOString(),
      }, { onConflict: 'user_id,platform,platform_txn_id', ignoreDuplicates: true })

      if (txErr) skipped++
      else imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      products: productNames.length,
      message: `Imported ${imported} transactions across ${productNames.length} products`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
