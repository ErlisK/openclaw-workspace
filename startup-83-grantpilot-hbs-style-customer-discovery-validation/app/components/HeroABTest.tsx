'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'

// ─── Variant definitions ──────────────────────────────────────────────────────
interface HeroVariant {
  persona: string
  badge: string
  headline: string
  subheadline: string
  proof: string
  cta_primary: string
  cta_primary_href: string
  cta_secondary: string
  cta_secondary_href: string
  features: string[]
  accent: string // tailwind color prefix e.g. "indigo"
}

const VARIANTS: Record<string, HeroVariant> = {
  // ── Variant A: Small Nonprofit Executive Director ─────────────────────────
  nonprofit_ed: {
    persona: 'nonprofit_ed',
    badge: 'For nonprofits with budgets $50K–$5M',
    headline: 'Stop Losing Grants\nYou Should Win.',
    subheadline:
      "Your mission is too important to lose funding to grant-writing bottlenecks. GrantPilot's AI pilot handles discovery, drafting, budgets, and submission — so you can focus on programs, not paperwork.",
    proof: 'Nonprofits using GrantPilot submit 3× more applications per quarter.',
    cta_primary: 'Start Free — No Credit Card',
    cta_primary_href: '/signup',
    cta_secondary: 'See a live demo →',
    cta_secondary_href: '/rfp/new',
    features: [
      '📄 Paste any RFP — AI extracts every requirement',
      '✍️ Narrative drafted in your org\'s voice, funder-tuned',
      '💰 OMB budget auto-built from your program data',
      '🔍 Human specialist reviews before submission',
    ],
    accent: 'indigo',
  },

  // ── Variant B: Municipal Grant Coordinator ────────────────────────────────
  municipal_gc: {
    persona: 'municipal_gc',
    badge: 'For cities, counties, and economic development teams',
    headline: 'Federal Grants Don\'t Have\nto Take 6 Months.',
    subheadline:
      'GrantPilot automates CDBG, HUD, USDA, and federal grant workflows — RFP parsing, SF-424 forms, compliance checklists, and audit trails — built for government grant coordinators.',
    proof: 'Municipal teams cut grant prep time from 6 weeks to 5 days.',
    cta_primary: 'Request a Demo',
    cta_primary_href: '/signup?segment=municipal',
    cta_secondary: 'Try with a sample federal RFP →',
    cta_secondary_href: '/rfp/new',
    features: [
      '📋 SF-424 / 424A auto-populated from your project data',
      '✅ Federal compliance checklist generated from RFP',
      '🔒 Immutable audit trail for every edit and approval',
      '📅 Deadline + reporting timeline with .ics export',
    ],
    accent: 'violet',
  },
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EXPERIMENT = 'hero_persona'
const SESSION_KEY = 'gp_ab_hero_persona'
const SESSION_ID_KEY = 'gp_session_id'

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroABTest() {
  const [variant, setVariant] = useState<string | null>(null)
  const exposedRef = useRef(false)

  useEffect(() => {
    // Reuse or create session id (stable per browser session)
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    }

    // Check for sticky assignment in this session
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored && VARIANTS[stored]) {
      setVariant(stored)
      return
    }

    // Get server-assigned variant
    fetch(`/api/analytics/ab?experiment=${EXPERIMENT}&session_id=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        const v: string = d.variant && VARIANTS[d.variant] ? d.variant : 'nonprofit_ed'
        sessionStorage.setItem(SESSION_KEY, v)
        setVariant(v)
      })
      .catch(() => {
        setVariant('nonprofit_ed') // fallback
      })
  }, [])

  // Fire "exposure" event once when variant is rendered (impression)
  useEffect(() => {
    if (!variant || exposedRef.current) return
    exposedRef.current = true

    const sessionId = sessionStorage.getItem(SESSION_ID_KEY) || undefined

    // Client-side PostHog
    track('ab_variant_assigned', { experiment: EXPERIMENT, variant, trigger: 'hero_impression' })

    // Server-side Supabase (fire-and-forget)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'hero_exposure',
        properties: { experiment: EXPERIMENT, variant, persona: variant },
        session_id: sessionId,
        ab_variant: variant,
        page_url: window.location.href,
        referrer: document.referrer,
      }),
    }).catch(() => {})
  }, [variant])

  function handleCTAClick(ctaType: 'primary' | 'secondary') {
    if (!variant) return
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY) || undefined
    const content = VARIANTS[variant]

    // Client-side
    track('upgrade_cta_clicked', {
      experiment: EXPERIMENT,
      variant,
      persona: content.persona,
      cta: ctaType,
      cta_label: ctaType === 'primary' ? content.cta_primary : content.cta_secondary,
      page: 'hero',
    })

    // Server-side
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'hero_cta_click',
        properties: {
          experiment: EXPERIMENT,
          variant,
          persona: content.persona,
          cta: ctaType,
          cta_label: ctaType === 'primary' ? content.cta_primary : content.cta_secondary,
        },
        session_id: sessionId,
        ab_variant: variant,
        page_url: window.location.href,
      }),
    }).catch(() => {})
  }

  // Loading skeleton
  if (!variant) {
    return (
      <section className="bg-gradient-to-b from-white to-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center animate-pulse">
          <div className="h-5 bg-gray-200 rounded-full w-56 mx-auto mb-8" />
          <div className="h-12 bg-gray-200 rounded-xl max-w-2xl mx-auto mb-4" />
          <div className="h-12 bg-gray-200 rounded-xl max-w-xl mx-auto mb-6" />
          <div className="h-5 bg-gray-100 rounded-full max-w-md mx-auto mb-10" />
          <div className="flex gap-3 justify-center">
            <div className="h-12 w-44 bg-indigo-100 rounded-xl" />
            <div className="h-12 w-36 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </section>
    )
  }

  const content = VARIANTS[variant]
  const isIndigo = content.accent === 'indigo'

  return (
    <section className={`py-20 px-6 ${isIndigo
      ? 'bg-gradient-to-b from-white to-indigo-50'
      : 'bg-gradient-to-b from-white to-violet-50'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          {/* Persona badge */}
          <div className={`inline-block text-xs font-semibold px-4 py-1.5 rounded-full mb-6 ${isIndigo
            ? 'bg-indigo-100 text-indigo-700'
            : 'bg-violet-100 text-violet-700'
          }`}>
            {content.badge}
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 leading-tight whitespace-pre-line">
            {content.headline}
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-4 leading-relaxed">
            {content.subheadline}
          </p>

          {/* Social proof */}
          <p className={`text-sm font-semibold mb-8 ${isIndigo ? 'text-indigo-600' : 'text-violet-600'}`}>
            ✓ {content.proof}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href={content.cta_primary_href}
              onClick={() => handleCTAClick('primary')}
              className={`font-bold px-8 py-3.5 rounded-xl transition-colors text-base text-white shadow-lg ${isIndigo
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                : 'bg-violet-600 hover:bg-violet-700 shadow-violet-200'
              }`}
            >
              {content.cta_primary}
            </Link>
            <Link
              href={content.cta_secondary_href}
              onClick={() => handleCTAClick('secondary')}
              className={`font-semibold px-6 py-3.5 rounded-xl transition-colors text-base border ${isIndigo
                ? 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                : 'text-violet-600 border-violet-200 hover:bg-violet-50'
              }`}
            >
              {content.cta_secondary}
            </Link>
          </div>
        </div>

        {/* Feature bullets — persona-specific */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {content.features.map(f => (
            <div key={f} className={`rounded-xl p-3 text-sm text-center border ${isIndigo
              ? 'bg-indigo-50/60 border-indigo-100 text-indigo-900'
              : 'bg-violet-50/60 border-violet-100 text-violet-900'
            }`}>
              {f}
            </div>
          ))}
        </div>

        {/* Dev-only variant label */}
        {process.env.NODE_ENV === 'development' && (
          <p className="text-center text-xs text-gray-300 mt-6">
            A/B: {EXPERIMENT} = <strong>{variant}</strong>
          </p>
        )}
      </div>
    </section>
  )
}
