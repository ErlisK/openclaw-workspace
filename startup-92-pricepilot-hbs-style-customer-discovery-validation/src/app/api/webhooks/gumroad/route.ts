/**
 * POST /api/webhooks/gumroad
 * Receives Gumroad ping events (sale, refund, subscription_ended, etc.)
 * Gumroad sends application/x-www-form-urlencoded POST bodies.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  let body: Record<string, string> = {}
  try {
    const text = await request.text()
    const params = new URLSearchParams(text)
    params.forEach((value, key) => { body[key] = value })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const sellerId = body.seller_id
  const productId = body.product_id
  const saleId = body.sale_id
  const price = body.price // in cents
  const email = body.purchaser_email
  const resourceName = body.resource_name // 'sale', 'refund', etc.

  if (!sellerId || !saleId) {
    return NextResponse.json({ error: 'Missing required fields: seller_id, sale_id' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Log the webhook event for audit (best-effort)
  try {
    await supabase.from('webhook_events').insert({
      provider: 'gumroad',
      event_type: resourceName || 'unknown',
      payload: body,
      seller_id: sellerId,
      product_id: productId,
      sale_id: saleId,
      amount: price ? parseInt(price, 10) : null,
      customer_email: email || null,
    })
  } catch {
    // Table may not exist yet — fail silently, don't block acknowledgment
  }

  return NextResponse.json({ received: true })
}
