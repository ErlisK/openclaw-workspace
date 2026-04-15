import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
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
          padding: '60px',
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700, color: 'white', marginBottom: 16 }}>
          BetaWindow
        </div>
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.9)', textAlign: 'center', maxWidth: 800 }}>
          Human QA Testing for AI-Built Apps
        </div>
        <div style={{ marginTop: 32, display: 'flex', gap: 24 }}>
          {['Quick $5', 'Standard $10', 'Deep $15'].map(t => (
            <div
              key={t}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
          betawindow.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
