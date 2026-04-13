import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface EvidenceSnippet {
  id: string
  snippet: string
  source: string
  sentiment: string
  theme_tags: string[]
}

export const revalidate = 3600

async function getSnippets(): Promise<EvidenceSnippet[]> {
  const { data } = await supabase
    .from('research_snippets')
    .select('id, snippet, source, sentiment, theme_tags')
    .order('created_at', { ascending: true })
    .limit(507)
  return (data || []) as EvidenceSnippet[]
}

function sentimentColor(s: string) {
  return s === 'positive' ? 'bg-green-100 text-green-700'
       : s === 'negative' ? 'bg-red-100 text-red-700'
       : s === 'mixed'    ? 'bg-yellow-100 text-yellow-700'
       : 'bg-gray-100 text-gray-600'
}

const PERSONAS = [
  {
    key: 'emma',
    name: 'Emma — The Kid Creator',
    age: '7 years old',
    tagline: '"I want to color MY story"',
    emoji: '🎨',
    color: 'purple',
    bg: 'from-purple-50 to-pink-50',
    border: 'border-purple-200',
    header: 'bg-purple-600',
    scenes: [
      {
        time: '7:02 AM · Morning',
        title: 'The Story Spark',
        icon: '🌅',
        description: 'Emma wakes up still thinking about Ember the Dragon Chef. She runs to the kitchen: "Mom, can we make a coloring book about Ember today?" Mom is making breakfast — no time for Canva.',
        pain: 'No tool simple enough to use in under 5 minutes before school.',
        evidenceIds: ['ab12aab9', '6b77915a'],
      },
      {
        time: '9:15 AM · School',
        title: 'Story Reinforcement',
        icon: '🏫',
        description: 'Mrs. Patterson asks the class to illustrate their stories. Emma draws a circle with wings. She can picture Ember perfectly — she just can\'t draw it. Two classmates have Minecraft coloring books.',
        pain: 'Children have rich imaginations but lack the drawing skills to express them.',
        evidenceIds: ['c2d63f1e', '08e0f5a4'],
      },
      {
        time: '3:45 PM · After School',
        title: 'The Coloring Routine',
        icon: '🎨',
        description: 'Emma opens the generic princess book from Target. Colors one page, pushes it away. "The princess doesn\'t have a dog. And her dress is wrong." Reaches for the iPad instead.',
        pain: 'Generic content drives children to screens — not because coloring is boring, but because the content is irrelevant.',
        evidenceIds: ['1efbe7ee', '468231d0', '7f98c2ef'],
      },
      {
        time: '7:45 PM · Bedtime',
        title: 'Story Dictation',
        icon: '🌙',
        description: 'Emma\'s ritual: she tells Mom a new chapter of the Ember story. Tonight, Ember discovers a hidden bakery on Mars. Mom types it into Notes, knowing she\'ll never have time to turn it into anything.',
        pain: 'The richest creative moment of the day produces nothing tangible.',
        evidenceIds: ['11afcd14'],
      },
      {
        time: 'Next morning',
        title: 'Discovery Moment',
        icon: '✨',
        description: 'Mom prints the pages before Emma wakes up. 12 pages. Ember on every page — the bakery, the moon run, Mars. Emma sits down and colors for 55 minutes without stopping. "I made this."',
        pain: null,
        evidenceIds: ['664cfac8', 'eca5b6dd'],
      },
    ],
  },
  {
    key: 'maya',
    name: 'Maya — The Parent Buyer',
    age: '34, Marketing Manager',
    tagline: '"I need it for tonight — not next week"',
    emoji: '👩',
    color: 'blue',
    bg: 'from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    header: 'bg-blue-600',
    scenes: [
      {
        time: '7:55 AM · Drop-off',
        title: 'Mental Note Planted',
        icon: '🌅',
        description: 'Sophie clutches a half-colored unicorn book. "The unicorn doesn\'t do science. I want one who does science experiments." Maya makes a mental note. This will become a 9pm search session.',
        pain: 'Mismatch between child\'s specific interest and available content.',
        evidenceIds: ['ab12aab9', 'd14a48a2'],
      },
      {
        time: '10:30 AM · Work',
        title: 'Quick Search — Compromise',
        icon: '💼',
        description: 'Between meetings, Maya searches "scientist unicorn coloring pages printable." Gets generic unicorn results. Bookmarks something that\'s "close enough." The bar has already been lowered.',
        pain: 'Parents constantly settle for close-enough because exactly-right doesn\'t exist.',
        evidenceIds: ['ca377940', 'd733ea62'],
      },
      {
        time: '9:12 PM · Couch',
        title: 'The Real Search',
        icon: '📱',
        description: 'Kids in bed. Maya has 20 minutes. Searches "personalized unicorn coloring book for kids." Sees: Etsy ($28, 5 days), Wonderbly ($38, not coloring), Shutterfly (photos not line art), Amazon (generic). On page 2, almost gives up.',
        pain: 'Every existing option is too slow, too expensive, or the wrong product entirely.',
        evidenceIds: ['49dcc03e', 'ea0e18b0'],
      },
      {
        time: '9:19 PM',
        title: 'First Contact — KidColoring',
        icon: '💡',
        description: 'KidColoring result: "Create Sophie\'s personalized unicorn coloring book in 60 seconds." She types: "Sophie is 5. She loves unicorns who do science experiments. Her unicorn is named Professor Sparkle and she has a tiny lab coat." Selects age 5. Clicks generate.',
        pain: 'COPPA badge and preview-before-pay are make-or-break trust signals.',
        evidenceIds: ['94e665e4', '6569e3e3'],
      },
      {
        time: '9:22 PM · 3 minutes later',
        title: 'Preview Magic',
        icon: '✅',
        description: 'Two preview pages load. Professor Sparkle — a unicorn in a tiny lab coat — with science equipment. Large fill regions, thick lines for a 5-year-old. Same design on both pages. Maya: "Oh my god, this is actually what I asked for." She clicks purchase without hesitation.',
        pain: null,
        evidenceIds: ['1efbe7ee', 'd08f424e'],
      },
      {
        time: '9:35 PM',
        title: 'Print Night',
        icon: '🖨️',
        description: 'PDF downloaded. 12 pages printed on the HP ENVY. Lines sharp, B&W, clean. Maya stacks them and writes: "Professor Sparkle\'s Science Lab — by Sophie Chen." She takes a photo. Goes to bed feeling like a good mom.',
        pain: null,
        evidenceIds: ['eca5b6dd', 'b823ca98'],
      },
      {
        time: 'Next morning + beyond',
        title: 'Discovery Spreads',
        icon: '🌅',
        description: 'Sophie sees it: "PROFESSOR SPARKLE!" Colors 40 minutes before school. School drop-off: Maya mentions it to two moms. That evening: 7 Facebook group comments asking for the link.',
        pain: null,
        evidenceIds: ['09fb7dc6'],
      },
    ],
  },
  {
    key: 'marcus',
    name: 'Marcus — The Classroom Teacher',
    age: '28, 1st Grade Teacher',
    tagline: '"I need 24 custom pages by Tuesday — in 5 minutes"',
    emoji: '🍎',
    color: 'green',
    bg: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    header: 'bg-green-600',
    scenes: [
      {
        time: 'Sunday 6:45 PM',
        title: 'The Planning Session',
        icon: '📅',
        description: 'Marcus needs a water cycle coloring activity for Tuesday. Opens TPT, searches "water cycle coloring pages first grade." 847 results. After 22 minutes: 6 downloads reviewed, 2 too complex, 2 factual errors, 1 perfect but wrong units. Downloads the closest match.',
        pain: 'No way to specify "first grade complexity + metric units + print-ready" — must manually review hundreds of results.',
        evidenceIds: ['d733ea62', '797f40c5'],
      },
      {
        time: 'Tuesday 9:30 AM · Classroom',
        title: 'The Mismatch Moment',
        icon: '🎓',
        description: '4 kids with fine motor challenges can\'t color within the thin lines. The evaporation arrow isn\'t labeled — Marcus has to explain verbally. Jaylen finishes in 4 minutes (too simple). "This is the closest I could find. It\'s still not right."',
        pain: 'No age-calibration means wrong complexity for 30% of the class.',
        evidenceIds: ['c48ef710', '08e0f5a4'],
      },
      {
        time: 'Wednesday · Staff Room',
        title: 'Discovery',
        icon: '💡',
        description: 'Colleague Ms. Santos shows Marcus: "I typed \'water cycle, first grade, 6-year-olds, 8 pages with labels\' and got exactly this in 90 seconds." Marcus signs up on the spot.',
        pain: null,
        evidenceIds: ['a8ca4553'],
      },
      {
        time: 'Wednesday 3:15 PM',
        title: 'First Generation',
        icon: '⚡',
        description: 'Marcus inputs: curriculum topic, grade level, complexity, page count, "metric labels, vocabulary at bottom, name field at top." 90 seconds: 8 pages ready. Thick lines, metric labels, vocabulary matches his unit plan. He prints 192 pages (24 students × 8 pages). Time spent: 4 minutes.',
        pain: null,
        evidenceIds: ['797f40c5', 'a8ca4553'],
      },
      {
        time: 'May · End of Year',
        title: 'Class Gift',
        icon: '🏫',
        description: '24 personalized portrait coloring pages — each child\'s name + a small character doing their favorite activity. Parents receive them at the class celebration. Seven parents ask Marcus where he made them.',
        pain: null,
        evidenceIds: ['a8ca4553', '09fb7dc6'],
      },
    ],
  },
]

export default async function StoryboardsPage() {
  const allSnippets = await getSnippets()
  const snippetMap = Object.fromEntries(allSnippets.map(s => [s.id.slice(0, 8), s]))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-700 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <a href="/admin" className="text-indigo-300 hover:text-white text-sm">← Admin</a>
            <span className="text-indigo-400">/</span>
            <span className="text-sm text-indigo-200">Storyboards</span>
          </div>
          <h1 className="text-2xl font-bold">Proto-Personas & Day-in-Life Storyboards</h1>
          <p className="text-indigo-200 text-sm mt-1">
            Evidence-annotated from 507 research snippets · Phase 1 Empathize · Interview-free proxy research
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Personas */}
        {PERSONAS.map(persona => (
          <div key={persona.key} className={`mb-12 rounded-2xl border ${persona.border} overflow-hidden`}>
            {/* Persona header */}
            <div className={`${persona.header} text-white px-6 py-5`}>
              <div className="flex items-start gap-4">
                <span className="text-4xl">{persona.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold">{persona.name}</h2>
                  <p className="text-white/80 text-sm">{persona.age}</p>
                  <p className="text-white font-medium mt-1 italic">{persona.tagline}</p>
                </div>
              </div>
            </div>

            {/* Scenes */}
            <div className={`bg-gradient-to-br ${persona.bg} p-6`}>
              <div className="space-y-6">
                {persona.scenes.map((scene, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">{scene.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {scene.time}
                            </span>
                            <h3 className="font-bold text-gray-900">Scene {i + 1}: {scene.title}</h3>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">{scene.description}</p>

                          {scene.pain && (
                            <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                              <p className="text-xs text-red-700">
                                <span className="font-semibold">Pain point: </span>{scene.pain}
                              </p>
                            </div>
                          )}

                          {!scene.pain && i > 0 && (
                            <div className="mt-3 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                              <p className="text-xs text-green-700">
                                <span className="font-semibold">✅ Resolution: </span>KidColoring delivers the outcome
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Evidence snippets */}
                      {scene.evidenceIds.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Evidence from research_snippets
                          </p>
                          {scene.evidenceIds.map(shortId => {
                            const s = snippetMap[shortId]
                            if (!s) return null
                            return (
                              <div
                                key={shortId}
                                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <code className="text-gray-400 font-mono">{shortId}</code>
                                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${sentimentColor(s.sentiment)}`}>
                                    {s.sentiment}
                                  </span>
                                  <span className="text-gray-400 truncate">{s.source}</span>
                                </div>
                                <p className="text-gray-700 italic leading-relaxed">
                                  &ldquo;{s.snippet.slice(0, 200)}{s.snippet.length > 200 ? '…' : ''}&rdquo;
                                </p>
                                {s.theme_tags && s.theme_tags.length > 0 && (
                                  <div className="flex gap-1 flex-wrap mt-2">
                                    {s.theme_tags.slice(0, 4).map((t: string) => (
                                      <span key={t} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-xs">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* HMW synthesis */}
        <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🎯 HMW Questions — Phase 2 Inputs
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Derived from storyboard pain points. These feed directly into the Define phase.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['Emma', 'HMW help Emma communicate her exact story characters to AI without typing?'],
              ['Maya', 'HMW show Maya proof of quality in under 60 seconds so she pays without hesitation?'],
              ['Marcus', 'HMW make Marcus\'s Sunday planning 90 seconds instead of 22 minutes?'],
              ['All', 'HMW ensure characters look the same on page 1 and page 12?'],
              ['Emma', 'HMW make a 5-year-old feel like she authored the book, not just received it?'],
              ['Maya', 'HMW build in the viral sharing moment without feeling forced?'],
              ['Marcus', 'HMW price the product so a Title 1 teacher can afford it without district approval?'],
              ['All', 'HMW guarantee print quality on a $79 HP home printer with basic paper?'],
            ].map(([who, q], i) => (
              <div key={i} className="flex gap-3 bg-indigo-50 rounded-xl p-3">
                <span className="shrink-0 text-xs font-bold text-indigo-600 bg-white rounded-full px-2 py-1 h-fit mt-0.5">
                  {who}
                </span>
                <p className="text-sm text-gray-800">{q}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pain frequency table */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📊 Pain Point Frequency Across All 507 Snippets
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-600">Pain Point</th>
                  <th className="text-right py-2 pr-4 font-semibold text-gray-600">Snippets</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Primary Persona</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['Generic content ≠ child\'s interest', 143, 'Emma + Maya'],
                  ['Search / find time wasted', 92, 'Marcus + Maya'],
                  ['Wrong age/complexity', 86, 'Emma + Marcus'],
                  ['Safety / COPPA concerns', 62, 'Maya'],
                  ['Line quality issues', 53, 'Maya + Marcus'],
                  ['Print quality issues', 49, 'Maya + Marcus'],
                  ['Physical book too slow', 38, 'Maya'],
                  ['Story-to-coloring gap', 37, 'Emma + Maya'],
                  ['Cost too high (physical)', 44, 'Maya'],
                ].map(([pain, count, persona]) => (
                  <tr key={pain as string} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4 text-gray-800">{pain}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="font-bold text-indigo-700">{count}</span>
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">{persona}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
