import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Public experiment split page — no auth required
// Randomly assigns visitor to variant A or B, records observation, redirects

export default async function ExperimentSplitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: exp } = await supabase
    .from('experiments')
    .select('id, variant_a_price_cents, variant_b_price_cents, split_pct_b, status, products(name)')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!exp) {
    return (
      <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '4rem 2rem' }}>
        <h1>Experiment not found</h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>This experiment may have ended or the link is invalid.</p>
      </div>
    )
  }

  const prod = Array.isArray(exp.products) ? exp.products[0] : exp.products as { name: string } | null
  const pA = exp.variant_a_price_cents / 100
  const pB = exp.variant_b_price_cents / 100

  // Record a view observation
  const variantKey = Math.random() < exp.split_pct_b ? 'B' : 'A'
  const price = variantKey === 'A' ? exp.variant_a_price_cents : exp.variant_b_price_cents
  await supabase.from('experiment_observations').upsert({
    experiment_id: exp.id,
    variant: variantKey,
    event: 'view',
    price_cents: price,
    visitor_key: `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    occurred_at: new Date().toISOString(),
  }, { onConflict: 'experiment_id,visitor_key,event', ignoreDuplicates: true })

  // Show landing page with buy button
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', background: '#f9f8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 500, width: '100%', background: '#fff', borderRadius: '1rem', padding: '2.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>🚀 PricePilot Experiment</p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>{prod?.name || 'Product'}</h1>
        <p style={{ fontSize: '3rem', fontWeight: 900, color: '#6c47ff', marginBottom: '0.5rem' }}>
          ${variantKey === 'A' ? pA.toFixed(0) : pB.toFixed(0)}
        </p>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>One-time purchase · Instant delivery</p>
        <a href="#" style={{ display: 'block', background: '#6c47ff', color: '#fff', padding: '1rem', borderRadius: '0.625rem', textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>
          Buy now — ${variantKey === 'A' ? pA.toFixed(0) : pB.toFixed(0)}
        </a>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem' }}>
          Powered by <a href="/" style={{ color: '#6c47ff' }}>PricePilot</a>
        </p>
      </div>
    </div>
  )
}
