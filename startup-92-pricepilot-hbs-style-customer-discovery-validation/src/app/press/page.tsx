import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Press Kit — PricePilot',
  description: 'Logos, screenshots, and media assets for PricePilot.',
}

const BASE = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

const assets = [
  { name: 'Logo (SVG, horizontal)', file: '/assets/logo.svg', desc: 'Full wordmark — use on white or light backgrounds' },
  { name: 'Logo Icon (SVG)', file: '/assets/logo-icon.svg', desc: 'Square icon — use for favicons and small spaces' },
  { name: 'Homepage screenshot', file: '/assets/screenshot-homepage.png', desc: '1280×800 PNG' },
  { name: 'Pricing page', file: '/assets/screenshot-pricing.png', desc: '1280×800 PNG' },
  { name: 'Blog listing', file: '/assets/screenshot-blog.png', desc: '1280×800 PNG' },
  { name: 'Docs page', file: '/assets/screenshot-docs.png', desc: '1280×800 PNG' },
  { name: 'CSV Import Guide', file: '/assets/screenshot-import-guide.png', desc: '1280×800 PNG' },
  { name: 'Core flow GIF (800×500)', file: '/assets/core-flow-small.gif', desc: 'Animated walkthrough — great for Product Hunt / directories' },
  { name: 'Core flow GIF (1280×800)', file: '/assets/core-flow.gif', desc: 'Full-size animated walkthrough' },
]

export default function PressPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricePilot</Link>
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Press Kit</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Download logos, screenshots, and media for PricePilot. All assets are free to use in reviews, articles, and directory listings.
      </p>

      {/* Quick facts */}
      <section style={{ background: '#f9fafb', borderRadius: 12, padding: '1.5rem', marginBottom: '2.5rem', border: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Facts</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
          {[
            ['Name', 'PricePilot'],
            ['Tagline', 'Safe pricing experiments for solo founders'],
            ['Category', 'SaaS / Developer Tools / E-commerce'],
            ['Target user', 'Solo creators & micro-SaaS founders ($500–$10k MRR)'],
            ['Pricing', 'Free tier · Pro at $29/month'],
            ['Live URL', BASE],
            ['Launch date', 'January 2025'],
          ].map(([k, v]) => (
            <>
              <dt key={`k-${k}`} style={{ fontWeight: 600, color: '#374151' }}>{k}</dt>
              <dd key={`v-${k}`} style={{ color: '#6b7280', margin: 0 }}>
                {v.startsWith('http') ? <a href={v} style={{ color: '#4f46e5' }}>{v}</a> : v}
              </dd>
            </>
          ))}
        </dl>
      </section>

      {/* Core GIF */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Core Flow (Animated)</h2>
        <img
          src="/assets/core-flow-small.gif"
          alt="PricePilot core flow — homepage, pricing, blog, docs, import guide"
          style={{ width: '100%', borderRadius: 12, border: '1px solid #e5e7eb', maxWidth: 800 }}
        />
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem' }}>
          <a href="/assets/core-flow-small.gif" download style={{ color: '#4f46e5', fontSize: '0.875rem' }}>↓ Download 800×500 GIF</a>
          <a href="/assets/core-flow.gif" download style={{ color: '#4f46e5', fontSize: '0.875rem' }}>↓ Download 1280×800 GIF</a>
        </div>
      </section>

      {/* Logo */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Logo</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', background: '#fff', textAlign: 'center' }}>
            <img src="/assets/logo.svg" alt="PricePilot logo" style={{ maxWidth: 320, height: 'auto', marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Horizontal wordmark</p>
            <a href="/assets/logo.svg" download style={{ color: '#4f46e5', fontSize: '0.875rem' }}>↓ Download SVG</a>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', background: '#fff', textAlign: 'center' }}>
            <img src="/assets/logo-icon.svg" alt="PricePilot icon" style={{ width: 80, height: 80, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Square icon</p>
            <a href="/assets/logo-icon.svg" download style={{ color: '#4f46e5', fontSize: '0.875rem' }}>↓ Download SVG</a>
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Screenshots</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
          {[
            { file: '/assets/screenshot-homepage.png', label: 'Homepage', desc: '1280×800 PNG' },
            { file: '/assets/screenshot-pricing.png', label: 'Pricing', desc: '1280×800 PNG' },
            { file: '/assets/screenshot-blog.png', label: 'Blog', desc: '1280×800 PNG' },
            { file: '/assets/screenshot-docs.png', label: 'Docs', desc: '1280×800 PNG' },
            { file: '/assets/screenshot-import-guide.png', label: 'CSV Import Guide', desc: '1280×800 PNG' },
          ].map(s => (
            <div key={s.file} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <img src={s.file} alt={s.label} style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'top' }} />
              <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{s.label}</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>{s.desc}</p>
                </div>
                <a href={s.file} download style={{ color: '#4f46e5', fontSize: '0.875rem', flexShrink: 0 }}>↓ PNG</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section style={{ padding: '1.5rem', background: '#f5f3ff', borderRadius: 12, borderLeft: '4px solid #4f46e5' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Media enquiries</p>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Email <a href="mailto:press@pricepilot.ai" style={{ color: '#4f46e5' }}>press@pricepilot.ai</a> for interviews, demos, or additional assets.
        </p>
      </section>
    </main>
  )
}
