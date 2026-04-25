import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PricePilot — Safe pricing experiments for solo founders'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Blue accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 8, height: '100%', background: '#3b82f6', display: 'flex' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '52px', marginRight: '16px' }}>✈️</span>
          <span style={{ fontSize: '64px', fontWeight: 800, color: 'white' }}>PricePilot</span>
        </div>
        
        <div style={{ fontSize: '36px', color: '#94a3b8', marginBottom: '24px', fontWeight: 500 }}>
          Safe pricing experiments for solo founders
        </div>
        
        <div style={{ fontSize: '26px', color: '#475569', marginBottom: '12px' }}>
          📊 Bayesian A/B pricing · Stripe · Gumroad · Shopify
        </div>
        <div style={{ fontSize: '26px', color: '#475569', marginBottom: '48px' }}>
          🚀 $500–$10k MRR · Prove lift in weeks · No downside risk
        </div>

        <div style={{
          background: '#3b82f6',
          color: 'white',
          padding: '16px 36px',
          borderRadius: '10px',
          fontSize: '24px',
          fontWeight: 700,
          display: 'flex',
          width: 'fit-content',
        }}>
          Try the free calculator →
        </div>
      </div>
    ),
    { ...size }
  )
}
