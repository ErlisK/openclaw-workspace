/**
 * POST /api/connections/stripe/connect
 * Validate a user-supplied Stripe key, then store it (key is stored as-is; 
 * in production you'd use KMS/Vault — here we store with a simple reversible 
 * obfuscation and the service-role key protects it via RLS).
 * 
 * Body: { stripe_key: string, label?: string }
 * Returns: { connected: true, account_id, account_name, is_test_mode, key_hint }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getEntitlement } from '@/lib/entitlements'
import Stripe from 'stripe'

export const maxDuration = 30

export async function POST(request: Request) {
  const entResult = await getEntitlement()
  if (entResult instanceof NextResponse) return entResult

  const body = await request.json().catch(() => ({}))
  const { stripe_key, label } = body as { stripe_key?: string; label?: string }

  if (!stripe_key || !stripe_key.startsWith('sk_')) {
    return NextResponse.json(
      { error: 'Invalid Stripe key. Must start with sk_test_ or sk_live_.' },
      { status: 400 }
    )
  }

  // Validate the key by calling Stripe
  let account: { id: string; display_name?: string | null; business_profile?: { name?: string | null } }
  try {
    const testStripe = new Stripe(stripe_key, { apiVersion: '2026-04-22.dahlia' as '2026-04-22.dahlia' })
    account = await testStripe.accounts.retrieve('self') as unknown as typeof account
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid or expired Stripe key. Please check your key and try again.', detail: String(err) },
      { status: 400 }
    )
  }

  const isTestMode = stripe_key.startsWith('sk_test_')
  const keyHint = `${stripe_key.slice(0, 8)}...${stripe_key.slice(-4)}`
  const accountName = account?.business_profile?.name || account?.display_name || account?.id || 'Stripe Account'
  const accountId = account?.id || ''

  // Simple obfuscation — prepend a marker so we know it's stored
  const keyEnc = Buffer.from(stripe_key).toString('base64')

  const supabase = await createClient()
  const { error: upsertErr } = await supabase
    .from('stripe_connections')
    .upsert({
      user_id: entResult.user.id,
      label: label || `${accountName} (${isTestMode ? 'test' : 'live'})`,
      stripe_key_enc: keyEnc,
      key_hint: keyHint,
      account_id: accountId,
      account_name: accountName,
      is_test_mode: isTestMode,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    connected: true,
    account_id: accountId,
    account_name: accountName,
    is_test_mode: isTestMode,
    key_hint: keyHint,
    label: label || `${accountName} (${isTestMode ? 'test' : 'live'})`,
  })
}
