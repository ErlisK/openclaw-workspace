import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/clips/[id]/thumbnail — get thumbnail URL, or generate inline SVG placeholder
// POST /api/clips/[id]/thumbnail — store a thumbnail URL (called by render worker after upload)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clip, error } = await supabase
    .from('clip_outputs')
    .select('id, title, hook_type, template_id, platform, thumbnail_url, thumbnail_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !clip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If stored thumbnail exists, try to refresh signed URL
  if ((clip as any).thumbnail_path && !(clip as any).thumbnail_url) {
    const { data: signed } = await supabase.storage
      .from('previews')
      .createSignedUrl((clip as any).thumbnail_path, 7 * 24 * 3600)
    if (signed?.signedUrl) {
      await supabase.from('clip_outputs').update({ thumbnail_url: signed.signedUrl }).eq('id', id)
      return NextResponse.json({ url: signed.signedUrl, generated: false })
    }
  }

  if ((clip as any).thumbnail_url) {
    return NextResponse.json({ url: (clip as any).thumbnail_url, generated: false })
  }

  // Generate inline SVG placeholder thumbnail
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'svg'

  const svgUrl = generateSVGThumbnailDataURL(
    (clip as any).title || 'ClipSpark',
    (clip as any).hook_type || 'highlight',
    (clip as any).template_id || 'podcast-pro-v02',
    (clip as any).platform || 'YouTube Shorts',
  )

  return NextResponse.json({ url: svgUrl, generated: true, format: 'svg' })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { thumbnail_url, thumbnail_path } = body

  if (!thumbnail_url && !thumbnail_path) {
    return NextResponse.json({ error: 'thumbnail_url or thumbnail_path required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clip_outputs')
    .update({ thumbnail_url, thumbnail_path })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, thumbnail_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── SVG thumbnail generator (runs in Next.js, no external deps) ──────────────

const PALETTE_MAP: Record<string, { bg: string; accent: string; text: string; sub: string }> = {
  'podcast-pro-v02':    { bg: '#1d1b4c', accent: '#6366f1', text: '#fff', sub: '#c4b5fd' },
  'tiktok-native-v02':  { bg: '#43140a', accent: '#f97316', text: '#fff', sub: '#fdba74' },
  'linkedin-pro-v02':   { bg: '#0f172a', accent: '#38bdf8', text: '#fff', sub: '#94a3b8' },
  'comedy-kinetic-v02': { bg: '#1e1b03', accent: '#eab308', text: '#fff', sub: '#fde047' },
  'audio-only-v02':     { bg: '#052e16', accent: '#4ade80', text: '#fff', sub: '#bbf7d0' },
}

const HOOK_EMOJI: Record<string, string> = {
  value_bomb:      '💡',
  question_hook:   '❓',
  story_moment:    '📖',
  contrast_reveal: '🔄',
  high_energy:     '⚡',
  data_point:      '📊',
  dramatic_pause:  '⏸',
  highlight:       '⭐',
}

const ASPECT: Record<string, [number, number]> = {
  'YouTube Shorts':    [1080, 1920],
  'TikTok':            [1080, 1920],
  'Instagram Reels':   [1080, 1920],
  'LinkedIn':          [1200, 628],
  'Twitter/X':         [1200, 675],
}

function wrapTitle(title: string, charsPerLine: number): string[] {
  const words = title.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) { cur = w }
    else if (cur.length + 1 + w.length <= charsPerLine) { cur += ' ' + w }
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 4)
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function generateSVGThumbnailDataURL(
  title: string,
  hookType: string,
  templateId: string,
  platform: string,
): string {
  const [w, h] = ASPECT[platform] || [1080, 1920]
  const palette = PALETTE_MAP[templateId] || PALETTE_MAP['podcast-pro-v02']
  const isPortrait = h > w
  const scaleFactor = isPortrait ? w / 1080 : w / 1200

  const fontSize = Math.max(28, Math.round(60 * scaleFactor * (title.length < 30 ? 1 : title.length < 50 ? 0.85 : 0.7)))
  const charsPerLine = Math.max(12, Math.floor(w / (fontSize * 0.58)))
  const lines = wrapTitle(title, charsPerLine)
  const headlineY = isPortrait ? Math.round(h * 0.38) : Math.round(h * 0.3)
  const lineH = Math.round(fontSize * 1.3)

  const stripeH = Math.round(h * 0.07)
  const badgeFontSize = Math.round(22 * scaleFactor)
  const badgeY = isPortrait ? Math.round(h * 0.07) : Math.round(h * 0.1)
  const marginX = Math.round(w * 0.06)

  const emoji = HOOK_EMOJI[hookType] || '⭐'
  const hookLabel = (hookType || 'highlight').replace(/_/g, ' ').toUpperCase()

  const linesText = lines.map((line, i) =>
    `<text x="${marginX}" y="${headlineY + i * lineH}" font-size="${fontSize}" font-weight="bold" font-family="Arial,Liberation Sans,sans-serif" fill="${palette.text}" filter="url(#shadow)">${escapeXml(line)}</text>`
  ).join('\n  ')

  const accentY = headlineY + lines.length * lineH + 10
  const accentW = Math.round(w * 0.35)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-opacity="0.5"/>
    </filter>
    <radialGradient id="bg" cx="75%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${palette.bg}"/>
    </radialGradient>
  </defs>
  <!-- Background -->
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="${palette.bg}" opacity="0.7"/>
  <!-- Top accent line -->
  <rect x="0" y="0" width="${w}" height="6" fill="${palette.accent}"/>
  <!-- Circle decoration -->
  <circle cx="${Math.round(w * 0.78)}" cy="${Math.round(h * 0.28)}" r="${Math.round(Math.min(w,h) * 0.42)}" fill="${palette.accent}" opacity="0.06"/>
  <circle cx="${Math.round(w * 0.78)}" cy="${Math.round(h * 0.28)}" r="${Math.round(Math.min(w,h) * 0.30)}" fill="${palette.accent}" opacity="0.05"/>
  <!-- Hook badge -->
  <text x="${marginX}" y="${badgeY}" font-size="${badgeFontSize}" font-family="Arial,Liberation Sans,sans-serif" fill="${palette.sub}">${emoji} ${escapeXml(hookLabel)}</text>
  <!-- Headline -->
  ${linesText}
  <!-- Accent underline -->
  <rect x="${marginX}" y="${accentY}" width="${accentW}" height="5" rx="2" fill="${palette.accent}"/>
  <!-- Bottom stripe -->
  <rect x="0" y="${h - stripeH}" width="${w}" height="${stripeH}" fill="${palette.accent}"/>
  <!-- Brand -->
  <text x="${marginX}" y="${h - Math.round(stripeH * 0.3)}" font-size="${Math.round(18 * scaleFactor)}" font-family="Arial,Liberation Sans,sans-serif" fill="white" opacity="0.9">Made with ClipSpark</text>
</svg>`

  const b64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${b64}`
}
