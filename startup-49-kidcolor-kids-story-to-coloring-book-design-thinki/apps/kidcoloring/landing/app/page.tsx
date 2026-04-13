'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'

// ── Interest Packs ────────────────────────────────────────────────────────────
const PACKS = [
  {
    name: 'Dinosaurs',
    color: '#fef3c7',
    border: '#f59e0b',
    accent: '#92400e',
    thumbnails: [DinoSvg1, DinoSvg2, DinoSvg3],
  },
  {
    name: 'Unicorns & Fantasy',
    color: '#fce7f3',
    border: '#db2777',
    accent: '#9d174d',
    thumbnails: [UnicornSvg1, UnicornSvg2, UnicornSvg3],
  },
  {
    name: 'Outer Space',
    color: '#ede9fe',
    border: '#7c3aed',
    accent: '#4c1d95',
    thumbnails: [SpaceSvg1, SpaceSvg2, SpaceSvg3],
  },
  {
    name: 'Ocean Animals',
    color: '#cffafe',
    border: '#0891b2',
    accent: '#164e63',
    thumbnails: [OceanSvg1, OceanSvg2, OceanSvg3],
  },
  {
    name: 'Construction Trucks',
    color: '#fff7ed',
    border: '#ea580c',
    accent: '#7c2d12',
    thumbnails: [TruckSvg1, TruckSvg2, TruckSvg3],
  },
  {
    name: 'Superheroes',
    color: '#eff6ff',
    border: '#2563eb',
    accent: '#1e3a8a',
    thumbnails: [HeroSvg1, HeroSvg2, HeroSvg3],
  },
]

const AGE_BRACKETS = [
  { label: '3–4 years', value: '3-4' },
  { label: '5–7 years', value: '5-7' },
  { label: '8–10 years', value: '8-10' },
  { label: '11–12 years', value: '11-12' },
]

// ── SVG Thumbnails (coloring-outline style) ───────────────────────────────────

// Dinosaurs
function DinoSvg1() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Dinosaur coloring outline" role="img">
      <ellipse cx="30" cy="38" rx="16" ry="12" />
      <circle cx="44" cy="24" r="8" />
      <path d="M44 16 L46 8 M42 16 L40 7 M48 16 L50 9" />
      <line x1="14" y1="44" x2="10" y2="58" />
      <line x1="22" y1="46" x2="20" y2="58" />
      <line x1="38" y1="46" x2="36" y2="58" />
      <line x1="46" y1="44" x2="48" y2="58" />
      <path d="M30 26 Q37 20 44 24" />
      <circle cx="47" cy="22" r="1.5" fill="#374151" />
      <path d="M46 50 Q52 50 56 44" strokeWidth="2" />
    </svg>
  )
}
function DinoSvg2() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="T-Rex coloring outline" role="img">
      <ellipse cx="28" cy="30" rx="12" ry="8" />
      <ellipse cx="42" cy="22" rx="8" ry="6" />
      <path d="M42 16 L44 6 M40 15 L38 6" />
      <line x1="16" y1="36" x2="12" y2="52" />
      <line x1="26" y1="38" x2="24" y2="52" />
      <line x1="36" y1="36" x2="40" y2="52" />
      <line x1="44" y1="34" x2="46" y2="52" />
      <circle cx="46" cy="20" r="1.5" fill="#374151" />
      <path d="M34 28 Q38 24 42 24" />
      <path d="M42 24 L48 26" />
    </svg>
  )
}
function DinoSvg3() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Long-neck dinosaur outline" role="img">
      <ellipse cx="30" cy="42" rx="18" ry="10" />
      <path d="M20 34 Q18 20 24 12 Q30 6 34 14" />
      <circle cx="34" cy="12" r="5" />
      <circle cx="36" cy="10" r="1.5" fill="#374151" />
      <line x1="14" y1="48" x2="10" y2="58" />
      <line x1="22" y1="50" x2="20" y2="58" />
      <line x1="38" y1="50" x2="36" y2="58" />
      <line x1="46" y1="48" x2="48" y2="58" />
      <path d="M30 32 Q38 28 46 32 Q50 36 48 42" />
    </svg>
  )
}

// Unicorns & Fantasy
function UnicornSvg1() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Unicorn coloring outline" role="img">
      <ellipse cx="30" cy="38" rx="18" ry="12" />
      <circle cx="20" cy="24" r="9" />
      <path d="M20 15 L17 4 M20 15 L23 4" />
      <line x1="14" y1="48" x2="10" y2="58" />
      <line x1="22" y1="50" x2="20" y2="58" />
      <line x1="36" y1="50" x2="34" y2="58" />
      <line x1="44" y1="48" x2="46" y2="58" />
      <path d="M20 6 L19 4 L18 6 Z" fill="#374151" />
      <path d="M40 28 Q50 20 52 28 Q48 36 40 32" />
      <path d="M42 30 Q46 24 50 28" strokeWidth="1" />
      <circle cx="17" cy="23" r="1.5" fill="#374151" />
    </svg>
  )
}
function UnicornSvg2() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Castle coloring outline" role="img">
      <rect x="10" y="28" width="40" height="28" />
      <rect x="10" y="22" width="10" height="10" />
      <rect x="25" y="22" width="10" height="10" />
      <rect x="40" y="22" width="10" height="10" />
      <path d="M10 22 L12 22 L12 18 L14 18 L14 22 L16 22 L16 18 L18 18 L18 22 L20 22" />
      <path d="M25 22 L27 22 L27 18 L29 18 L29 22 L31 22 L31 18 L33 18 L33 22 L35 22" />
      <path d="M40 22 L42 22 L42 18 L44 18 L44 22 L46 22 L46 18 L48 18 L48 22 L50 22" />
      <rect x="23" y="40" width="14" height="16" />
      <path d="M12 32 L18 32" /><path d="M12 38 L18 38" />
      <path d="M42 32 L48 32" /><path d="M42 38 L48 38" />
    </svg>
  )
}
function UnicornSvg3() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Magic wand coloring outline" role="img">
      <line x1="14" y1="46" x2="42" y2="18" strokeWidth="3" />
      <polygon points="42,10 46,18 38,18" />
      <line x1="46" y1="12" x2="52" y2="8" strokeWidth="1" />
      <line x1="44" y1="8" x2="46" y2="2" strokeWidth="1" />
      <line x1="50" y1="16" x2="56" y2="16" strokeWidth="1" />
      <circle cx="20" cy="40" r="3" strokeWidth="1" />
      <circle cx="10" cy="50" r="2" strokeWidth="1" />
      <path d="M26 34 Q28 30 32 32 Q34 28 36 30" strokeWidth="1" />
    </svg>
  )
}

// Outer Space
function SpaceSvg1() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Rocket ship coloring outline" role="img">
      <path d="M30 4 Q38 10 40 24 L30 32 L20 24 Q22 10 30 4 Z" />
      <ellipse cx="30" cy="32" rx="6" ry="4" />
      <path d="M24 24 L16 32 L20 32 L20 28" />
      <path d="M36 24 L44 32 L40 32 L40 28" />
      <circle cx="30" cy="18" r="4" />
      <path d="M24 40 Q26 44 30 46 Q34 44 36 40" />
      <path d="M26 46 L24 56" /><path d="M34 46 L36 56" />
    </svg>
  )
}
function SpaceSvg2() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Planet with rings coloring outline" role="img">
      <circle cx="30" cy="30" r="14" />
      <ellipse cx="30" cy="30" rx="24" ry="8" />
      <line x1="10" y1="30" x2="18" y2="30" />
      <line x1="42" y1="30" x2="50" y2="30" />
      <circle cx="50" cy="14" r="4" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="14" cy="48" r="3" />
      <line x1="52" y1="8" x2="54" y2="6" /><line x1="50" y1="8" x2="50" y2="6" /><line x1="48" y1="8" x2="46" y2="6" />
    </svg>
  )
}
function SpaceSvg3() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Astronaut coloring outline" role="img">
      <circle cx="30" cy="16" r="11" />
      <circle cx="30" cy="16" r="7" />
      <rect x="20" y="26" width="20" height="22" rx="4" />
      <path d="M20 30 L12 28 L10 36 L20 38" />
      <path d="M40 30 L48 28 L50 36 L40 38" />
      <line x1="22" y1="48" x2="20" y2="58" /><line x1="38" y1="48" x2="40" y2="58" />
      <rect x="24" y="30" width="12" height="8" rx="2" />
      <circle cx="30" cy="14" r="4" />
    </svg>
  )
}

// Ocean Animals
function OceanSvg1() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Dolphin coloring outline" role="img">
      <path d="M8 34 Q20 20 36 28 Q46 32 52 26" />
      <path d="M52 26 Q56 22 54 18 Q50 22 48 22" />
      <path d="M8 34 Q4 40 8 44 Q12 40 14 36" />
      <path d="M28 20 Q30 14 36 16" />
      <circle cx="44" cy="30" r="1.5" fill="#374151" />
      <path d="M8 34 Q6 30 10 28" />
    </svg>
  )
}
function OceanSvg2() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Starfish coloring outline" role="img">
      <polygon points="30,6 34,22 50,22 37,32 42,48 30,38 18,48 23,32 10,22 26,22" />
      <circle cx="30" cy="30" r="5" />
    </svg>
  )
}
function OceanSvg3() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Octopus coloring outline" role="img">
      <circle cx="30" cy="22" r="14" />
      <circle cx="25" cy="19" r="2.5" />
      <circle cx="35" cy="19" r="2.5" />
      <path d="M16 32 Q12 44 16 52" />
      <path d="M20 34 Q18 46 22 54" />
      <path d="M26 35 Q26 48 30 54" />
      <path d="M30 35 Q32 48 36 54" />
      <path d="M34 35 Q38 46 42 52" />
      <path d="M40 32 Q46 44 44 52" />
      <path d="M44 28 Q52 36 50 48" />
    </svg>
  )
}

// Construction Trucks
function TruckSvg1() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Excavator coloring outline" role="img">
      <rect x="6" y="30" width="28" height="20" rx="2" />
      <rect x="10" y="22" width="16" height="12" />
      <circle cx="14" cy="52" r="5" />
      <circle cx="28" cy="52" r="5" />
      <rect x="6" y="48" width="28" height="4" />
      <path d="M34 28 Q44 24 48 28 L50 36 Q44 36 40 38 L34 38" />
      <path d="M48 28 L56 22 M50 36 L58 32" />
      <path d="M56 22 L58 32 L52 36" />
    </svg>
  )
}
function TruckSvg2() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Dump truck coloring outline" role="img">
      <rect x="4" y="32" width="40" height="18" rx="2" />
      <rect x="32" y="24" width="16" height="12" rx="2" />
      <rect x="4" y="24" width="28" height="8" />
      <circle cx="12" cy="52" r="5" />
      <circle cx="36" cy="52" r="5" />
      <circle cx="52" cy="52" r="5" />
      <line x1="32" y1="24" x2="32" y2="32" />
      <rect x="36" y="27" width="8" height="7" />
    </svg>
  )
}
function TruckSvg3() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Crane coloring outline" role="img">
      <rect x="8" y="36" width="24" height="18" rx="2" />
      <circle cx="14" cy="56" r="4" />
      <circle cx="26" cy="56" r="4" />
      <rect x="8" y="32" width="24" height="8" />
      <line x1="20" y1="32" x2="20" y2="4" strokeWidth="2" />
      <line x1="20" y1="4" x2="54" y2="4" strokeWidth="2" />
      <line x1="54" y1="4" x2="54" y2="16" />
      <line x1="20" y1="4" x2="32" y2="24" />
      <line x1="54" y1="8" x2="54" y2="18" strokeWidth="1" />
      <path d="M50 16 L54 18 L58 16" />
    </svg>
  )
}

// Superheroes
function HeroSvg1() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Superhero coloring outline" role="img">
      <circle cx="30" cy="12" r="8" />
      <path d="M22 20 Q16 24 14 36 L20 36 L18 50 L30 46 L42 50 L40 36 L46 36 Q44 24 38 20 Z" />
      <path d="M38 20 Q46 18 52 26 L44 34 L38 28" />
      <path d="M22 20 Q14 18 8 26 L16 34 L22 28" />
      <path d="M20 36 L14 52 L20 50" />
      <path d="M40 36 L46 52 L40 50" />
      <path d="M24 10 Q30 6 36 10" />
    </svg>
  )
}
function HeroSvg2() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Superhero mask coloring outline" role="img">
      <path d="M6 22 Q10 14 20 16 Q26 12 30 14 Q34 12 40 16 Q50 14 54 22 Q56 30 50 34 Q44 38 30 34 Q16 38 10 34 Q4 30 6 22 Z" />
      <path d="M6 22 Q4 12 2 10" />
      <path d="M54 22 Q56 12 58 10" />
      <ellipse cx="20" cy="24" rx="6" ry="5" />
      <ellipse cx="40" cy="24" rx="6" ry="5" />
      <path d="M26 24 L34 24" />
    </svg>
  )
}
function HeroSvg3() {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-label="Lightning bolt coloring outline" role="img">
      <polygon points="36,4 20,32 30,32 24,56 40,28 30,28 36,4" />
    </svg>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
    color: 'white',
    textAlign: 'center',
    padding: '80px 24px 60px',
  },
  heroEmoji: { fontSize: 72, marginBottom: 16, display: 'block' },
  heroTitle: { fontSize: 52, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px' },
  heroSubtitle: { fontSize: 22, fontWeight: 600, margin: '0 0 20px', opacity: 0.95 },
  heroDesc: { fontSize: 17, maxWidth: 600, margin: '0 auto', opacity: 0.9, lineHeight: 1.6 },
  ctaBtn: {
    display: 'inline-block',
    marginTop: 32,
    background: '#fff',
    color: '#7c3aed',
    fontWeight: 800,
    fontSize: 18,
    padding: '14px 36px',
    borderRadius: 50,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  section: { padding: '64px 24px', maxWidth: 960, margin: '0 auto' },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: 800,
    color: '#7c3aed',
    marginBottom: 8,
  },
  sectionSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 48,
  },
  howGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 },
  howCard: {
    background: '#f5f3ff',
    borderRadius: 20,
    padding: 32,
    textAlign: 'center',
    border: '2px solid #ede9fe',
  },
  howCardIcon: { fontSize: 44, display: 'block', marginBottom: 12 },
  howCardTitle: { fontSize: 18, fontWeight: 700, color: '#5b21b6', marginBottom: 8 },
  howCardDesc: { fontSize: 15, color: '#6b7280', lineHeight: 1.5 },
  packsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20,
  },
  packCard: {
    borderRadius: 20,
    padding: '28px 20px',
    border: '2px solid',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  packTitle: { fontSize: 17, fontWeight: 800, marginBottom: 16, textAlign: 'center' },
  packThumbnails: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  packThumb: { width: 56, height: 56 },
  packCta: {
    display: 'block',
    width: '100%',
    padding: '10px 0',
    borderRadius: 12,
    border: '2px solid',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
    background: 'transparent',
    transition: 'background 0.15s, color 0.15s',
  },
  formWrapper: {
    background: 'white',
    borderRadius: 24,
    padding: '48px 40px',
    maxWidth: 480,
    margin: '0 auto',
    boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
    border: '1px solid #f3f4f6',
  },
  formTitle: { fontSize: 30, fontWeight: 800, color: '#7c3aed', textAlign: 'center', marginBottom: 6 },
  formSubtitle: { textAlign: 'center', color: '#6b7280', marginBottom: 32, fontSize: 15 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%',
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    background: 'white',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  consentRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  consentText: { fontSize: 13, color: '#6b7280', lineHeight: 1.5 },
  submitBtn: {
    width: '100%',
    background: '#7c3aed',
    color: 'white',
    fontWeight: 800,
    fontSize: 17,
    padding: '16px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  submitBtnDisabled: {
    width: '100%',
    background: '#d1d5db',
    color: '#9ca3af',
    fontWeight: 800,
    fontSize: 17,
    padding: '16px',
    borderRadius: 14,
    border: 'none',
    cursor: 'not-allowed',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  thankyou: { textAlign: 'center', padding: '48px 0' },
  errorMsg: { color: '#dc2626', fontSize: 13, marginTop: 4 },
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Home() {
  const [email, setEmail] = useState('')
  const [parentName, setParentName] = useState('')
  const [ageBracket, setAgeBracket] = useState('')
  const [interests, setInterests] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [highlightedPack, setHighlightedPack] = useState<string | null>(null)
  const waitlistRef = useRef<HTMLElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: 'landing_view', props: { referrer: document.referrer } }),
    }).catch(() => {})
  }, [])

  function handlePackClick(packName: string) {
    // Log event
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: 'pack_click', props: { pack_name: packName } }),
    }).catch(() => {})

    // Pre-fill interests and scroll to waitlist
    setHighlightedPack(packName)
    const current = interests.trim()
    if (!current.toLowerCase().includes(packName.toLowerCase())) {
      setInterests(current ? `${current}, ${packName}` : packName)
    }

    // Scroll and focus
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => emailInputRef.current?.focus(), 600)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'waitlist_submit',
        props: { email, highlighted_pack: highlightedPack },
      }),
    }).catch(() => {})

    try {
      const interestsList = interests
        ? interests.split(',').map((s) => s.trim()).filter(Boolean)
        : []

      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          parent_first_name: parentName || undefined,
          child_age_bracket: ageBracket || undefined,
          interests: interestsList.length > 0 ? interestsList : undefined,
          consent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = email.trim() !== '' && consent && !loading

  return (
    <main>
      {/* ── Hero ── */}
      <section style={styles.hero}>
        <span style={styles.heroEmoji} aria-hidden="true">🎨</span>
        <h1 style={styles.heroTitle}>KidColoring</h1>
        <p style={styles.heroSubtitle}>Kids Make Their Own Coloring Books!</p>
        <p style={styles.heroDesc}>
          Your child picks their favorite topics, and we generate a personalized coloring book
          filled with custom illustrations they can print and color.
        </p>
        <a href="#waitlist" style={styles.ctaBtn}>
          ✏️ Join the Waitlist
        </a>
      </section>

      {/* ── How It Works ── */}
      <section style={{ background: 'white', padding: '64px 24px', maxWidth: '100%' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <div style={styles.howGrid}>
            {[
              { icon: '1️⃣', title: 'Pick Interests', desc: 'Your child chooses the topics they love — dinosaurs, space, animals, and more.' },
              { icon: '2️⃣', title: 'We Generate', desc: 'Our AI creates unique, age-appropriate coloring pages just for them in seconds.' },
              { icon: '3️⃣', title: 'Print & Color!', desc: 'Download and print your personalized coloring book at home. Hours of fun!' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={styles.howCard}>
                <span style={styles.howCardIcon} aria-hidden="true">{icon}</span>
                <h3 style={styles.howCardTitle}>{title}</h3>
                <p style={styles.howCardDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interest Packs ── */}
      <section style={{ background: '#fafaf9', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={styles.sectionTitle}>Interest Packs</h2>
          <p style={styles.sectionSubtitle}>
            Six curated packs to kick-start your child&apos;s coloring adventure 🎉
          </p>
          <div style={styles.packsGrid}>
            {PACKS.map((pack) => {
              const [Thumb1, Thumb2, Thumb3] = pack.thumbnails
              return (
                <article
                  key={pack.name}
                  style={{
                    ...styles.packCard,
                    background: pack.color,
                    borderColor: pack.border,
                  }}
                  aria-label={`${pack.name} interest pack`}
                >
                  <h3 style={{ ...styles.packTitle, color: pack.accent }}>{pack.name}</h3>
                  <div style={styles.packThumbnails} aria-label={`${pack.name} preview illustrations`}>
                    <div style={styles.packThumb}><Thumb1 /></div>
                    <div style={styles.packThumb}><Thumb2 /></div>
                    <div style={styles.packThumb}><Thumb3 /></div>
                  </div>
                  <button
                    onClick={() => handlePackClick(pack.name)}
                    style={{
                      ...styles.packCta,
                      borderColor: pack.border,
                      color: pack.accent,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.background = pack.border
                      el.style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.background = 'transparent'
                      el.style.color = pack.accent
                    }}
                    aria-label={`I want the ${pack.name} pack — scroll to waitlist`}
                  >
                    ✋ I want this pack!
                  </button>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Waitlist Form ── */}
      <section
        id="waitlist"
        ref={waitlistRef}
        style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #fce7f3 100%)', padding: '64px 24px' }}
      >
        <div style={styles.formWrapper}>
          <h2 style={styles.formTitle}>Join the Waitlist</h2>
          <p style={styles.formSubtitle}>
            {highlightedPack
              ? `🎉 Great pick! We noted your interest in ${highlightedPack}!`
              : "Be the first to know when we launch! 🎉"}
          </p>

          {done ? (
            <div style={styles.thankyou}>
              <span style={{ fontSize: 72 }} aria-hidden="true">🎉</span>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', marginTop: 16 }}>
                You&apos;re on the list!
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
                We&apos;ll reach out when KidColoring is ready. Your kids are going to love it!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={styles.label} htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  ref={emailInputRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="parentName">Your Name (optional)</label>
                <input
                  id="parentName"
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Parent's first name"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="ageBracket">Child&apos;s Age (optional)</label>
                <select
                  id="ageBracket"
                  value={ageBracket}
                  onChange={(e) => setAgeBracket(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Select age range</option>
                  {AGE_BRACKETS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label} htmlFor="interests">Child&apos;s Interests (optional)</label>
                <input
                  id="interests"
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. dinosaurs, space, horses"
                  style={{
                    ...styles.input,
                    borderColor: highlightedPack && interests ? '#7c3aed' : '#e5e7eb',
                  }}
                />
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  Separate with commas. {highlightedPack ? `Pre-filled from your pack selection!` : ''}
                </p>
              </div>

              <div style={styles.consentRow}>
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: '#7c3aed', width: 16, height: 16 }}
                />
                <label htmlFor="consent" style={styles.consentText}>
                  I&apos;m a parent/guardian and I agree to be contacted about KidColoring updates.
                </label>
              </div>

              {error && <p style={styles.errorMsg} role="alert">⚠️ {error}</p>}

              <button
                type="submit"
                disabled={!canSubmit}
                style={canSubmit ? styles.submitBtn : styles.submitBtnDisabled}
              >
                {loading ? '⏳ Joining...' : '🎨 Join the Waitlist'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
