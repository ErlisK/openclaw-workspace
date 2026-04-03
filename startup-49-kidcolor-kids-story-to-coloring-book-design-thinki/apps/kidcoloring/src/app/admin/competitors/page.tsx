import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Competitor {
  id: string
  product: string
  category: string
  pricing: string
  line_art_quality: string
  core_flow: string
  monthly_visits: string
  coppa_status: string
  screenshots: string | null
  notes: string
  features: Record<string, unknown>
}

export const revalidate = 3600

export default async function CompetitorsPage() {
  const { data: competitors } = await supabase
    .from('comp_matrix')
    .select('*')
    .order('product')

  const comps = (competitors || []) as Competitor[]

  const aiComps = comps.filter(c => c.features?.ai_generation)
  const printComps = comps.filter(c => c.features?.print_export)
  const coppaComps = comps.filter(c => c.coppa_status?.includes('Compliant') && !c.coppa_status?.includes('NOT'))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-700 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <a href="/admin" className="text-purple-200 hover:text-white text-sm">← Admin</a>
          <h1 className="text-xl font-bold">Competitor Matrix</h1>
          <span className="bg-purple-800 px-3 py-1 rounded-full text-sm ml-auto">{comps.length} products</span>
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
          {comps.map(comp => (
            <div key={comp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                  <div className="h-full flex items-center justify-center text-gray-400 text-4xl">🏢</div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 leading-tight">{comp.product}</h3>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ml-2 ${
                    comp.coppa_status?.includes('NOT') ? 'bg-red-100 text-red-700' :
                    comp.coppa_status?.includes('Compliant') ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {comp.coppa_status?.includes('Compliant') && !comp.coppa_status?.includes('NOT') ? '🔒 COPPA' : 
                     comp.coppa_status?.includes('NOT') ? '⚠️ No COPPA' : '❓'}
                  </span>
                </div>

                <div className="text-xs text-purple-600 font-medium mb-2">{comp.category}</div>

                <div className="text-sm text-gray-600 mb-3 line-clamp-2">{comp.notes}</div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-14 shrink-0">Pricing</span>
                    <span className="text-gray-700 font-medium">{comp.pricing?.slice(0,50)}...</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-14 shrink-0">Line Art</span>
                    <span className="text-gray-700">{comp.line_art_quality?.slice(0,50)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-14 shrink-0">Visits</span>
                    <span className="text-gray-700">{comp.monthly_visits}</span>
                  </div>
                </div>

                {/* Feature badges */}
                <div className="flex gap-1 flex-wrap mt-3">
                  {comp.features?.ai_generation && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">AI Gen</span>
                  )}
                  {comp.features?.print_export && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Print</span>
                  )}
                  {comp.features?.mobile_app && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Mobile</span>
                  )}
                  {comp.features?.custom_stories && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">Custom Story</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
