import type { Metadata } from 'next'
import Link from 'next/link'
import { JOB_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/templates/job-templates'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betawindow.com'

export const metadata: Metadata = {
  title: 'Testing Instruction Templates — BetaWindow',
  description:
    'Ready-made test instruction templates for signup flows, checkout, mobile UX, core product, and deep UX audits. One-click fill for your next test job.',
  alternates: { canonical: `${BASE_URL}/templates` },
  openGraph: {
    title: 'BetaWindow Testing Templates — Copy-Paste QA Instructions',
    description: '5 expert-written test instruction templates for AI-built apps. No login required to browse.',
    url: `${BASE_URL}/templates`,
    type: 'website',
  },
}

const TIER_LABEL: Record<string, string> = {
  quick: 'Quick · 10 min · $5',
  standard: 'Standard · 20 min · $10',
  deep: 'Deep · 30 min · $15',
}

const TIER_COLORS: Record<string, string> = {
  quick: 'bg-green-100 text-green-800',
  standard: 'bg-blue-100 text-blue-800',
  deep: 'bg-purple-100 text-purple-800',
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'BetaWindow Testing Instruction Templates',
  description: 'Ready-made QA test instruction templates for AI-built web applications.',
  url: `${BASE_URL}/templates`,
  numberOfItems: JOB_TEMPLATES.length,
  hasPart: JOB_TEMPLATES.map(t => ({
    '@type': 'HowTo',
    name: t.title,
    description: t.description,
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: t.tier === 'quick' ? '5' : t.tier === 'standard' ? '10' : '15' },
    totalTime: `PT${t.estimated_minutes}M`,
  })),
}

export default function TemplatesPage() {
  const featured = JOB_TEMPLATES.filter(t => t.featured)
  const all = JOB_TEMPLATES

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="max-w-5xl mx-auto px-4 py-14">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            Templates
          </span>
          <h1 className="text-4xl font-bold mt-4 mb-3">
            Ready-made testing instructions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Expert-written test scripts for the most common QA scenarios.
            Pick a template, add your URL, and publish — no QA experience needed.
          </p>
          <div className="flex gap-3 justify-center mt-6 flex-wrap text-sm text-gray-500">
            {TEMPLATE_CATEGORIES.map(cat => (
              <span key={cat} className="bg-gray-100 px-3 py-1 rounded-full">{cat}</span>
            ))}
          </div>
        </div>

        {/* Featured */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-800 mb-4">⭐ Most popular</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {featured.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl} featured />
            ))}
          </div>
        </div>

        {/* All templates by category */}
        {TEMPLATE_CATEGORIES.map(cat => {
          const catTemplates = all.filter(t => t.category === cat)
          return (
            <div key={cat} className="mb-10">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{cat}</h2>
              <div className="grid md:grid-cols-2 gap-5">
                {catTemplates.map(tpl => (
                  <TemplateCard key={tpl.id} tpl={tpl} />
                ))}
              </div>
            </div>
          )
        })}

        {/* Tier legend */}
        <div className="mt-12 border border-gray-200 rounded-xl p-6 bg-gray-50">
          <h3 className="font-bold text-gray-800 mb-4">Tier guide</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {(['quick', 'standard', 'deep'] as const).map(tier => (
              <div key={tier} className="bg-white border border-gray-100 rounded-lg p-4">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[tier]} capitalize`}>
                  {tier}
                </span>
                <div className="mt-2 font-semibold text-gray-700">{TIER_LABEL[tier]}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {tier === 'quick' && 'A focused session on one specific flow. Great for shipping fast.'}
                  {tier === 'standard' && 'Covers the main user journey with edge cases. Most popular.'}
                  {tier === 'deep' && 'Comprehensive audit: edge cases, errors, a11y, and more.'}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Templates: {JOB_TEMPLATES.filter(t => t.tiers.includes(tier)).length} available
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Don't see a template you need?</h3>
          <p className="text-indigo-100 mb-5">
            Write your own instructions or let the tester freestyle. Any URL, any flow.
          </p>
          <Link
            href="/signup?utm_source=templates&utm_medium=internal&utm_campaign=templates_cta"
            className="inline-block bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50"
          >
            Start a custom test →
          </Link>
        </div>
      </div>
    </>
  )
}

function TemplateCard({ tpl, featured }: { tpl: ReturnType<typeof JOB_TEMPLATES[0]['id'] extends string ? () => (typeof JOB_TEMPLATES)[0] : never> | (typeof JOB_TEMPLATES)[0]; featured?: boolean }) {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betawindow.com'

  const tierColors: Record<string, string> = {
    quick: 'bg-green-100 text-green-800',
    standard: 'bg-blue-100 text-blue-800',
    deep: 'bg-purple-100 text-purple-800',
  }

  // Encode template data for pre-fill — title, instructions, tier
  const useParams = new URLSearchParams({
    template: tpl.id,
    tier: tpl.tier,
  })

  return (
    <div
      data-testid={`template-card-${tpl.id}`}
      className={`border rounded-xl overflow-hidden hover:shadow-md transition-all bg-white ${
        featured ? 'border-indigo-200 shadow-sm' : 'border-gray-200'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{tpl.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierColors[tpl.tier]} capitalize`}>
                {tpl.tier}
              </span>
              <span className="text-xs text-gray-400">~{tpl.estimated_minutes} min</span>
            </div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">{tpl.title}</h3>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{tpl.description}</p>

        {/* What you'll get */}
        <ul className="space-y-1 mb-4">
          {tpl.what_youll_get.slice(0, 3).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
          {tpl.what_youll_get.length > 3 && (
            <li className="text-xs text-gray-400">+{tpl.what_youll_get.length - 3} more…</li>
          )}
        </ul>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {tpl.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Available tiers */}
        <div className="text-xs text-gray-400 mb-4">
          Also available as:{' '}
          {tpl.tiers.map(t => (
            <span key={t} className="capitalize">{t} </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Link
            href={`/templates/${tpl.slug}`}
            className="flex-1 text-center text-xs border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 font-medium"
          >
            Preview
          </Link>
          <Link
            href={`/submit?${useParams.toString()}&utm_source=templates&utm_campaign=use_template`}
            className="flex-1 text-center text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
            data-testid={`use-template-${tpl.id}`}
          >
            Use template →
          </Link>
        </div>
      </div>
    </div>
  )
}
