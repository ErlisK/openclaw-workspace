import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Colour palette by concept
const PALETTES = {
  'interest-packs': { bg: '#f5f0ff', accent: '#7c3aed', border: '#ddd6fe', text: '#4c1d95' },
  'story-to-book':  { bg: '#eff6ff', accent: '#2563eb', border: '#bfdbfe', text: '#1e3a8a' },
  default:          { bg: '#fdf4ff', accent: '#7c3aed', border: '#e9d5ff', text: '#581c87' },
}

// Emoji map for interests
const INTEREST_EMOJI: Record<string, string> = {
  dinosaurs:    '🦖', unicorns: '🦄', space: '🚀', robots: '🤖',
  dragons:      '🐉', cats: '🐱', dogs: '🐶', ocean: '🌊',
  butterflies:  '🦋', castles: '🏰', mermaids: '🧜', princesses: '👑',
  superheroes:  '🦸', elephants: '🐘', owls: '🦉', sharks: '🦈',
  cars:         '🏎️',  trains: '🚂', planes: '✈️', horses: '🐴',
  default:      '🎨',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const title    = searchParams.get('title')    || 'My Coloring Book'
  const subtitle = searchParams.get('subtitle') || '4 custom pages · Made with KidColoring'
  const concept  = (searchParams.get('concept') || 'default') as keyof typeof PALETTES
  const interest = searchParams.get('interest') || ''
  const imgUrl   = searchParams.get('img') || ''   // first generated page URL

  const palette = PALETTES[concept] || PALETTES.default
  const emoji   = INTEREST_EMOJI[interest.toLowerCase()] || INTEREST_EMOJI.default

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          display: 'flex', flexDirection: 'row',
          background: palette.bg,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          border: `8px solid ${palette.border}`,
        }}
      >
        {/* Left panel — coloring page preview or emoji */}
        <div
          style={{
            width: '420px', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'white',
            borderRight: `8px solid ${palette.border}`,
            flexShrink: 0,
          }}
        >
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt="coloring page"
              style={{ width: '400px', height: '400px', objectFit: 'contain' }}
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '16px',
            }}>
              {/* Simulated coloring page outline */}
              <div style={{
                width: '280px', height: '320px',
                border: `6px solid ${palette.accent}`,
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'white',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ fontSize: '96px', lineHeight: 1 }}>{emoji}</div>
                <div style={{
                  fontSize: '16px', color: '#9ca3af',
                  fontStyle: 'italic', textAlign: 'center',
                  padding: '0 16px',
                }}>Color me! 🎨</div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — info */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '48px 52px',
          gap: '0px',
        }}>
          {/* Brand */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px',
          }}>
            <div style={{ fontSize: '38px' }}>🎨</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: palette.accent }}>
              KidColoring
            </div>
          </div>

          {/* Title */}
          <div style={{
            fontSize: title.length > 22 ? '48px' : '56px',
            fontWeight: 900, color: palette.text,
            lineHeight: 1.1, marginBottom: '20px',
            letterSpacing: '-1px',
          }}>
            {title}
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: '26px', color: '#6b7280',
            marginBottom: '36px', lineHeight: 1.3,
          }}>
            {subtitle}
          </div>

          {/* Features row */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '36px' }}>
            {['✅ Free trial', '🖨️ Print-ready PDF', '✨ AI-generated'].map(feat => (
              <div key={feat} style={{
                background: 'white',
                border: `3px solid ${palette.border}`,
                borderRadius: '24px',
                padding: '10px 20px',
                fontSize: '20px', color: palette.text, fontWeight: 600,
              }}>
                {feat}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            background: palette.accent,
            color: 'white',
            borderRadius: '16px',
            padding: '18px 32px',
            fontSize: '24px', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            alignSelf: 'flex-start',
          }}>
            Make your own — free →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
