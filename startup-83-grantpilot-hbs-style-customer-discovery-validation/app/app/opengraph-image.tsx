import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'GrantPilot — AI Grant Writing for Nonprofits & Municipalities'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '80px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '20px',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            fontSize: '36px',
            fontWeight: 900,
            color: 'white',
          }}
        >
          GP
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 900,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}
        >
          Win More Grants.
          <br />Spend Less Time.
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.4,
            marginBottom: '48px',
          }}
        >
          AI-powered grant writing for nonprofits &amp; municipalities
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['RFP Parser', 'AI Narrative Writer', 'Budget Builder', 'SF-424 Auto-Fill', 'Human QA Gate'].map(f => (
            <div
              key={f}
              style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '100px',
                padding: '10px 24px',
                fontSize: '20px',
                color: 'white',
                fontWeight: 600,
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
