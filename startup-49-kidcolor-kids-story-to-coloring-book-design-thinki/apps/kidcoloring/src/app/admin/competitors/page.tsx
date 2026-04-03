import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CompFeatures {
  ai_generation?: boolean
  custom_input?: boolean
  print_export?: boolean
  mobile_app?: boolean
  line_art_quality?: string
  target_age?: string
  monthly_visits_est?: string
}

interface Competitor {
  id: string
  product: string
  category: string | null
  pricing: string | null
  line_art_quality: string | null
  core_flow: string | null
  monthly_visits: string | null
  coppa_status: string | null
  screenshots: string | null
  notes: string | null
  features: CompFeatures | null
}

export const revalidate = 3600

export default async function CompetitorsPage() {
  const { data: competitors } = await supabase
    .from('comp_matrix')
    .select('*')
    .order('product')

  const comps = (competitors || []) as Competitor[]

  const aiComps = comps.filter(c => c.features?.ai_generation === true)
  const printComps = comps.filter(c => c.features?.print_export === true)
  const coppaComps = comps.filter(
    c => c.coppa_status?.includes('Compliant') && !c.coppa_status?.includes('NOT')
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-700 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <a href="/admin" className="text-purple-200 hover:text-white text-sm">← Admin</a>
          <h1 className="text-xl font-bold">Competitor Matrix</h1>
          <span className="bg-purple-800 px-3 py-1 rounded-full text-sm ml-auto">
            {comps.length} products analyzed
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Products Analyzed', value: comps.length, icon: '🏢' },
            { label: 'With AI Generation', value: aiComps.length, icon: '🤖' },
            { label: 'With Print Export', value: printComps.length, icon: '🖨️' },
            { label: 'COPPA Compliant', value: coppaComps.length, icon: '🔒' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-3xl font-bold text-purple-700">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Competitor cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {comps.map(comp => {
            const feats = comp.features ?? {}
            const hasAI = feats.ai_generation === true
            const hasPrint = feats.print_export === true
            const hasMobile = feats.mobile_app === true
            const hasCustom = feats.custom_input === true
            const isCompliant =
              !!comp.coppa_status?.includes('Compliant') &&
              !comp.coppa_status?.includes('NOT')
            const isNonCompliant = !!comp.coppa_status?.includes('NOT')

            return (
              <div
                key={comp.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Screenshot */}
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                  {comp.screenshots ? (
                    <Image
                      src={comp.screenshots}
                      alt={`${comp.product} screenshot`}
                      fill
                      className="object-cover object-top"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-4xl">
                      🏢
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 leading-tight">{comp.product}</h3>
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-full ml-2 ${
                        isNonCompliant
                          ? 'bg-red-100 text-red-700'
                          : isCompliant
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isCompliant ? '🔒 COPPA' : isNonCompliant ? '⚠️ No COPPA' : '❓'}
                    </span>
                  </div>

                  <div className="text-xs text-purple-600 font-medium mb-2">
                    {comp.category ?? ''}
                  </div>

                  <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {comp.notes ?? ''}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {comp.pricing && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-14 shrink-0">Pricing</span>
                        <span className="text-gray-700 font-medium">
                          {comp.pricing.slice(0, 55)}
                        </span>
                      </div>
                    )}
                    {comp.line_art_quality && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-14 shrink-0">Line Art</span>
                        <span className="text-gray-700">{comp.line_art_quality.slice(0, 50)}</span>
                      </div>
                    )}
                    {comp.monthly_visits && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-14 shrink-0">Visits</span>
                        <span className="text-gray-700">{comp.monthly_visits}</span>
                      </div>
                    )}
                  </div>

                  {/* Feature badges */}
                  <div className="flex gap-1 flex-wrap mt-3">
                    {hasAI && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        AI Gen
                      </span>
                    )}
                    {hasPrint && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        Print
                      </span>
                    )}
                    {hasMobile && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        Mobile
                      </span>
                    )}
                    {hasCustom && (
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                        Custom Story
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
