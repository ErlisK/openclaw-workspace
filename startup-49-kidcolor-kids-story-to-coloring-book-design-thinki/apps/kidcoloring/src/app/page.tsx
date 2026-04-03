export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <div className="mb-6 text-6xl">🎨</div>
        <h1 className="text-5xl font-extrabold text-purple-700 mb-4 leading-tight">
          Turn Any Story Into a<br />
          <span className="text-pink-500">Personalized Coloring Book</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-8">
          Kids type their story, choose their characters, and get a custom
          printable coloring book in seconds. Powered by AI — designed for
          imaginations.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl">
            Create My Coloring Book →
          </button>
          <button className="bg-white border-2 border-purple-600 text-purple-600 font-bold py-4 px-8 rounded-2xl text-lg transition-all hover:bg-purple-50">
            See Examples
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-4">Free to try · No account needed</p>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              emoji: "✍️",
              title: "Tell Your Story",
              desc: "Type a story, pick a theme, or choose from popular adventures like dinosaurs, unicorns, or space explorers.",
            },
            {
              step: "2",
              emoji: "✨",
              title: "AI Creates the Pages",
              desc: "Our AI generates beautiful black-and-white line art illustrations perfectly sized for coloring.",
            },
            {
              step: "3",
              emoji: "🖨️",
              title: "Print & Color!",
              desc: "Download your custom coloring book as a PDF. Print at home or at a local shop.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-3xl p-8 shadow-md text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">{item.emoji}</div>
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Research Phase Banner */}
      <section className="bg-purple-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-yellow-400 text-purple-900 font-bold text-sm px-4 py-1 rounded-full mb-4">
            🔬 PHASE 1: EMPATHY RESEARCH
          </div>
          <h2 className="text-3xl font-bold mb-4">
            We&apos;re building this with parents & kids
          </h2>
          <p className="text-purple-200 text-lg mb-6">
            Currently gathering insights from 350+ sources about how kids
            engage with creative activities and what parents look for in
            educational tools.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-white text-purple-700 font-bold py-3 px-8 rounded-xl hover:bg-purple-50 transition-colors"
          >
            View Research Dashboard →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        <p>© 2025 KidColoring · Made with ❤️ for young imaginations</p>
      </footer>
    </main>
  );
}
