/**
 * /x/[slug] — Public A/B experiment page
 *
 * Visitor bucketing: deterministic via murmur-style hash of (visitor_id + experiment_id)
 * Visitor ID: read from cookie `pp_vid`; if missing, assigned here (set via response headers)
 * Preview mode: ?preview=A or ?preview=B — shows the variant without recording observations
 * No auth required (public page).
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple 32-bit murmur-inspired hash — deterministic across server restarts
function hashToVariant(visitorId: string, experimentId: string, splitPctB: number): 'A' | 'B' {
  const str = `${visitorId}:${experimentId}`
  let h = 0x9e3779b9
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x85ebca6b)
    h ^= h >>> 13
  }
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  // Map to [0, 1) and compare to splitPctB
  const pct = (h >>> 0) / 0xffffffff
  return pct < splitPctB ? 'B' : 'A'
}

function generateVisitorId(): string {
  // 16-char hex string — no crypto dependency needed
  const bytes = Array.from({ length: 8 }, () => Math.floor(Math.random() * 256))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface Experiment {
  id: string
  slug: string
  status: string
  split_pct_b: number
  variant_a_price_cents: number
  variant_b_price_cents: number
  variant_a_label: string | null
  variant_b_label: string | null
  headline: string | null
  description: string | null
  cta_text: string | null
  cta_url: string | null
  products: { name: string } | { name: string }[] | null
}

export default async function ExperimentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const previewVariant = sp.preview?.toUpperCase() as 'A' | 'B' | undefined

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: exp } = await supabase
    .from('experiments')
    .select(`
      id, slug, status, split_pct_b,
      variant_a_price_cents, variant_b_price_cents,
      variant_a_label, variant_b_label,
      headline, description, cta_text, cta_url,
      products ( name )
    `)
    .eq('slug', slug)
    .in('status', previewVariant ? ['active', 'draft'] : ['active'])
    .single()

  if (!exp) {
    return <NotFound />
  }

  // ── Visitor bucketing ──────────────────────────────────────────────────────
  const cookieStore = await cookies()
  let visitorId = cookieStore.get('pp_vid')?.value || ''
  let isNewVisitor = false
  if (!visitorId) {
    visitorId = generateVisitorId()
    isNewVisitor = true
  }

  const variant: 'A' | 'B' = previewVariant === 'A' || previewVariant === 'B'
    ? previewVariant
    : hashToVariant(visitorId, exp.id, exp.split_pct_b ?? 0.5)

  const priceVariant = variant === 'A' ? exp.variant_a_price_cents : exp.variant_b_price_cents
  const price = priceVariant / 100
  const priceFormatted = `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`
  const label = variant === 'A' ? (exp.variant_a_label || 'Standard') : (exp.variant_b_label || 'New price')
  const productName = Array.isArray(exp.products)
    ? (exp.products[0] as { name: string })?.name
    : (exp.products as { name: string } | null)?.name || 'Product'
  const headline = exp.headline || productName
  const ctaText = exp.cta_text || `Get ${productName}`
  const ctaUrl = exp.cta_url || '#'
  const isPreview = !!previewVariant
  const isInactive = exp.status !== 'active'

  // ── Record observation (server-side, no redirect) ─────────────────────────
  if (!isPreview && exp.status === 'active') {
    // Fire-and-forget — don't block render
    supabase.from('experiment_observations').insert({
      experiment_id: exp.id,
      variant,
      visitor_id: visitorId,
      price_cents: priceVariant,
    }).then(() => {})
  }

  return (
    <>
      {/* Set visitor cookie via meta-refresh trick — Next.js RSC workaround */}
      {isNewVisitor && (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.cookie = "pp_vid=${visitorId}; path=/; max-age=31536000; SameSite=Lax"`,
          }}
        />
      )}

      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
        {/* Preview banner */}
        {isPreview && (
          <div data-testid="preview-banner" style={{
            background: '#1e40af', color: '#fff', textAlign: 'center',
            padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600,
          }}>
            🔍 Preview mode — Variant {variant} ({priceFormatted}) · Observations not recorded ·{' '}
            <a href={`/x/${slug}`} style={{ color: '#bfdbfe', textDecoration: 'underline' }}>
              Exit preview
            </a>
            {' | '}
            <a href={`/x/${slug}?preview=${variant === 'A' ? 'B' : 'A'}`} style={{ color: '#bfdbfe', textDecoration: 'underline' }}>
              Switch to variant {variant === 'A' ? 'B' : 'A'}
            </a>
          </div>
        )}

        {/* Inactive banner (shown in preview of draft) */}
        {isInactive && isPreview && (
          <div style={{
            background: '#f59e0b', color: '#1f2937', textAlign: 'center',
            padding: '0.5rem', fontSize: '0.8rem',
          }}>
            ⚠️ This experiment is in <strong>{exp.status}</strong> state — not yet live
          </div>
        )}

        {/* Main offer card */}
        <div style={{
          maxWidth: 520, margin: '0 auto', padding: '3rem 1.5rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}>
          {/* Variant badge (only in preview) */}
          {isPreview && (
            <span data-testid="variant-badge" style={{
              background: variant === 'A' ? '#dbeafe' : '#dcfce7',
              color: variant === 'A' ? '#1e40af' : '#15803d',
              borderRadius: 999, padding: '0.25rem 0.75rem',
              fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Variant {variant}
            </span>
          )}

          {/* Headline */}
          <h1 data-testid="exp-headline" style={{
            fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: 800,
            lineHeight: 1.2, marginBottom: '0.75rem', color: '#111827',
          }}>
            {headline}
          </h1>

          {/* Description */}
          {exp.description && (
            <p data-testid="exp-description" style={{
              color: '#6b7280', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: 400,
            }}>
              {exp.description}
            </p>
          )}

          {/* Price display */}
          <div data-testid="exp-price" style={{
            background: '#fff', border: '2px solid #e5e7eb', borderRadius: '1rem',
            padding: '1.5rem 2rem', marginBottom: '1.5rem', width: '100%',
          }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 500 }}>
              {label}
            </p>
            <p style={{ fontSize: '3rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
              {priceFormatted}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              {productName}
            </p>
          </div>

          {/* CTA */}
          <a
            href={ctaUrl !== '#' ? ctaUrl : undefined}
            data-testid="exp-cta"
            style={{
              display: 'block', width: '100%', padding: '1rem',
              background: '#6c47ff', color: '#fff', borderRadius: '0.75rem',
              fontSize: '1.125rem', fontWeight: 700, textDecoration: 'none',
              textAlign: 'center', cursor: ctaUrl === '#' ? 'default' : 'pointer',
              opacity: ctaUrl === '#' ? 0.85 : 1,
            }}
          >
            {ctaText}
          </a>

          {/* Powered by */}
          <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#d1d5db' }}>
            Pricing experiment by{' '}
            <a href="/" style={{ color: '#a78bfa', textDecoration: 'none' }}>PricePilot</a>
          </p>
        </div>
      </div>
    </>
  )
}

function NotFound() {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif', textAlign: 'center',
      padding: '4rem 2rem', minHeight: '100vh', background: '#fafafa',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <p style={{ fontSize: '3rem' }}>🔍</p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginTop: '1rem' }}>
        Experiment not found
      </h1>
      <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
        This experiment may have ended or the link is invalid.
      </p>
    </div>
  )
}
