import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JOB_TEMPLATES, getTemplate } from '@/lib/templates/job-templates'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tpl = getTemplate(slug)
  if (!tpl) return { title: 'Template not found' }
  return {
    title: `${tpl.title} — AgentQA Templates`,
    description: tpl.description,
    alternates: { canonical: `${BASE_URL}/templates/${tpl.slug}` },
    openGraph: {
      title: tpl.title,
      description: tpl.description,
      url: `${BASE_URL}/templates/${tpl.slug}`,
      type: 'article',
    },
  }
}

export function generateStaticParams() {
  return JOB_TEMPLATES.map(t => ({ slug: t.slug }))
}

const TIER_COLORS: Record<string, string> = {
  quick:    'bg-green-100 text-green-800 border-green-200',
  standard: 'bg-blue-100 text-blue-800 border-blue-200',
  deep:     'bg-purple-100 text-purple-800 border-purple-200',
}

const TIER_LABEL: Record<string, string> = {
  quick: 'Quick · ~10 min · $5',
  standard: 'Standard · ~20 min · $10',
  deep: 'Deep · ~30 min · $15',
}

export default async function TemplateDetailPage({ params }: Props) {
  const { slug } = await params
  const tpl = getTemplate(slug)
  if (!tpl) notFound()

  const useParams = new URLSearchParams({
    template: tpl.id,
    tier: tpl.tier,
  })

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: tpl.title,
    description: tpl.description,
    url: `${BASE_URL}/templates/${tpl.slug}`,
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: tpl.tier === 'quick' ? '5' : tpl.tier === 'standard' ? '10' : '15',
    },
    totalTime: `PT${tpl.estimated_minutes}M`,
    tool: [{ '@type': 'HowToTool', name: 'AgentQA — human tester' }],
  }

  // Parse instruction sections from markdown headers
  const sections = tpl.instructions.split(/\n(?=##+ )/).map(s => s.trim()).filter(Boolean)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/templates" className="hover:text-indigo-600">Templates</Link>
          <span>›</span>
          <span className="text-gray-700">{tpl.category}</span>
          <span>›</span>
          <span className="text-gray-900 font-medium truncate">{tpl.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <span className="text-4xl">{tpl.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${TIER_COLORS[tpl.tier]} capitalize`}>
                {tpl.tier}
              </span>
              <span className="text-xs text-gray-500">~{tpl.estimated_minutes} min</span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-500">{tpl.category}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{tpl.title}</h1>
            <p className="text-gray-600 text-lg leading-relaxed">{tpl.description}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main: instructions */}
          <div className="md:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Full instructions</h2>
                <span className="text-xs text-gray-400">
                  {tpl.instructions.split('\n').length} lines
                </span>
              </div>
              <div className="p-5 space-y-4">
                {sections.map((section, i) => {
                  const lines = section.split('\n')
                  const heading = lines[0]
                  const body = lines.slice(1).join('\n')
                  const isH2 = heading.startsWith('## ')
                  const isH3 = heading.startsWith('### ')
                  const headingText = heading.replace(/^#+\s+/, '')

                  return (
                    <div key={i}>
                      {isH2 && (
                        <h3 className="text-base font-bold text-gray-800 mt-4 mb-2">{headingText}</h3>
                      )}
                      {isH3 && (
                        <h4 className="text-sm font-semibold text-indigo-700 mt-3 mb-1">{headingText}</h4>
                      )}
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono bg-gray-50 rounded-lg p-3 text-xs">
                        {body.trim()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tiers available */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-sm text-gray-800 mb-3">Also available in</h3>
              <div className="flex gap-3 flex-wrap">
                {tpl.tiers.map(tier => (
                  <Link
                    key={tier}
                    href={`/submit?template=${tpl.id}&tier=${tier}&utm_source=templates&utm_campaign=tier_switch`}
                    className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${TIER_COLORS[tier]} hover:opacity-80`}
                  >
                    {TIER_LABEL[tier]}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* CTA card */}
            <div className="bg-indigo-600 text-white rounded-xl p-5">
              <div className="text-lg font-bold mb-1">{tpl.icon} {tpl.title}</div>
              <div className="text-indigo-100 text-sm mb-1">{TIER_LABEL[tpl.tier]}</div>
              <div className="text-indigo-200 text-xs mb-4">
                Instructions pre-filled. Just add your URL.
              </div>
              <Link
                href={`/submit?${useParams.toString()}&utm_source=templates&utm_campaign=use_template_detail`}
                className="block w-full text-center bg-white text-indigo-700 font-bold px-4 py-2.5 rounded-lg hover:bg-indigo-50 text-sm"
                data-testid="use-template-cta"
              >
                Use this template →
              </Link>
              <Link
                href="/signup?utm_source=templates&utm_medium=internal&utm_campaign=templates_sidebar"
                className="block w-full text-center mt-2 text-indigo-200 text-xs hover:text-white"
              >
                Create free account first →
              </Link>
            </div>

            {/* What you'll get */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white">
              <h3 className="font-bold text-sm text-gray-800 mb-3">What you'll get</h3>
              <ul className="space-y-2">
                {tpl.what_youll_get.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white">
              <h3 className="font-bold text-sm text-gray-800 mb-3">Tags</h3>
              <div className="flex gap-2 flex-wrap">
                {tpl.tags.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Other templates */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white">
              <h3 className="font-bold text-sm text-gray-800 mb-3">Other templates</h3>
              <div className="space-y-2">
                {JOB_TEMPLATES.filter(t => t.id !== tpl.id).slice(0, 3).map(t => (
                  <Link
                    key={t.id}
                    href={`/templates/${t.slug}`}
                    className="block text-sm text-indigo-600 hover:underline"
                  >
                    {t.icon} {t.title}
                  </Link>
                ))}
                <Link href="/templates" className="block text-xs text-gray-400 hover:text-gray-600 mt-1">
                  View all templates →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
