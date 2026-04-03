export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block bg-purple-100 text-purple-700 font-semibold text-sm px-3 py-1 rounded-full mb-2">
            Phase 1 Research
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            KidColoring Research Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Secondary research & proxy data — Empathy phase
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Research Snippets", value: "350+", icon: "📄", color: "bg-blue-50 text-blue-700" },
            { label: "Competitors Mapped", value: "20", icon: "🏢", color: "bg-green-50 text-green-700" },
            { label: "Search Queries", value: "50+", icon: "🔍", color: "bg-yellow-50 text-yellow-700" },
            { label: "Themes Validated", value: "8", icon: "🎯", color: "bg-purple-50 text-purple-700" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-2xl p-5`}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm font-medium opacity-75">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Key Themes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            🎨 Top Recurring Themes
          </h2>
          <div className="space-y-3">
            {[
              { theme: "Personalization & Identity Expression", count: 52, pct: 92 },
              { theme: "Parent Anxiety: Screen Time vs Creative Play", count: 48, pct: 85 },
              { theme: "Print-at-Home Demand (Post-pandemic)", count: 43, pct: 76 },
              { theme: "AI Distrust / Quality Concerns", count: 38, pct: 67 },
              { theme: "Educational Value Justification", count: 35, pct: 62 },
              { theme: "Gifting & Special Occasion Use", count: 31, pct: 55 },
              { theme: "Difficulty of Finding Age-Appropriate Content", count: 28, pct: 50 },
              { theme: "Character Obsession (Favorites)", count: 26, pct: 46 },
            ].map((item) => (
              <div key={item.theme}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.theme}</span>
                  <span className="text-gray-400">{item.count} sources</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 bg-purple-500 rounded-full"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column: Opportunities + Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              🚀 Top Opportunity Areas
            </h2>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              {[
                "Personalized AI coloring books by child's name/story",
                "Subscription box with printed books (D2C)",
                "Classroom/teacher edition with curriculum themes",
                "Seasonal & holiday gift market",
                "Therapy & social-emotional learning (SEL) tools",
                "Character IP licensing for fan content",
                "Multilingual coloring books for bilingual families",
                "Accessibility features for kids with disabilities",
                "School fundraising through custom books",
                "\"My Pet\" / family portrait coloring generator",
              ].map((opp, i) => (
                <li key={i} className="leading-snug">{opp}</li>
              ))}
            </ol>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              ⚠️ Top Risks
            </h2>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              {[
                "AI image quality inconsistency for line art",
                "Child safety & COPPA compliance complexity",
                "Low barrier → fast competitor copies",
                "Print logistics & cost eat margins",
                "Parents skeptical of AI-generated kids content",
                "Image generation IP/copyright uncertainty",
                "Prompt injection risks in children-facing AI",
                "App store friction vs web-only approach",
                "Churn risk: novelty fades after 1st book",
                "Teacher adoption requires district IT approval",
              ].map((risk, i) => (
                <li key={i} className="leading-snug">{risk}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* Proto Personas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            👥 Proto-Personas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: "Maya, 34",
                role: "\"The Enrichment Mom\"",
                icon: "👩",
                traits: ["Pinterest-active", "Pays for quality", "Anti-excessive-screentime"],
                need: "Wants creative offline activities that feel special and personalized for her 5yo.",
                quote: "\"I'd pay $15 if it keeps her off the iPad for an afternoon.\"",
              },
              {
                name: "Ms. Torres, 28",
                role: "\"The Creative Teacher\"",
                icon: "👩‍🏫",
                traits: ["Uses TPT resources", "Budget-conscious", "Story-driven lessons"],
                need: "Custom coloring pages that match current classroom story units.",
                quote: "\"I can't find anything that matches exactly what we're reading.\"",
              },
              {
                name: "Grandpa Joe, 67",
                role: "\"The Gift-Giver\"",
                icon: "👴",
                traits: ["Seasonal buyer", "Tech-nervous", "Wants 'wow' factor"],
                need: "A unique personalized gift for grandkids that feels thoughtful.",
                quote: "\"A book with her name and her dog in it? She'd love that.\"",
              },
            ].map((persona) => (
              <div key={persona.name} className="bg-gray-50 rounded-xl p-4">
                <div className="text-3xl mb-2">{persona.icon}</div>
                <div className="font-bold text-gray-800">{persona.name}</div>
                <div className="text-purple-600 text-sm font-medium mb-3">
                  {persona.role}
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {persona.traits.map((t) => (
                    <span key={t} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  <strong>Need:</strong> {persona.need}
                </p>
                <p className="text-xs italic text-gray-400">{persona.quote}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Design Principles */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-4">
            🧭 Design Principles (Interview-Free)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { principle: "Joy before friction", desc: "First interaction must delight within 10 seconds — show output first, ask for signup after." },
              { principle: "Child's voice, child's world", desc: "Use the child's actual words and themes, never sanitize into generic." },
              { principle: "Parent trust is the product", desc: "Every design decision must answer: would a cautious parent feel safe here?" },
              { principle: "Print is the moment of magic", desc: "Optimize for the physical artifact — resolution, format, print margins." },
              { principle: "Complexity hides in simplicity", desc: "The UI should feel like a toy, but the AI must handle nuance invisibly." },
              { principle: "Speed = credibility", desc: "Sub-30-second generation signals quality and earns the purchase decision." },
            ].map((item) => (
              <div key={item.principle} className="bg-white/10 rounded-xl p-4">
                <div className="font-bold mb-1">✦ {item.principle}</div>
                <div className="text-sm text-white/80">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
