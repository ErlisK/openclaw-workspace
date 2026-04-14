import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-bold text-xl text-white">DocsCI</span>
        </div>
        <div className="flex gap-6 text-sm text-gray-400">
          <Link href="/docs/research" className="hover:text-white transition-colors">Research</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <a href="mailto:hello@snippetci.com" className="hover:text-white transition-colors">Contact</a>
          <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg transition-colors">Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-700 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-8">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
          Docs-specific CI for API & SDK teams
        </div>
        <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
          Stop shipping<br />
          <span className="text-indigo-400">broken docs</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          DocsCI runs a docs-specific CI pipeline: executes code examples in hermetic sandboxes, detects API/SDK drift, validates accessibility, and files precise PR comments — before your customers hit a <code className="bg-gray-800 px-1 rounded text-red-400">NameError</code>.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Get early access →
          </Link>
          <Link href="/docs/research" className="border border-gray-700 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors">
            View research
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: "🔬", title: "Execute & Verify", desc: "Run every code example in hermetic sandbox runners across Python, Node, Go, Ruby, Java — with ephemeral credentials and network allowlists." },
          { icon: "🔍", title: "Detect SDK Drift", desc: "Automatically compare docs against live API/SDK exports on every release. Get precise PR comments when a method signature changes." },
          { icon: "✅", title: "PR Comments with Fixes", desc: "DocsCI files GitHub/GitLab PR comments with exact line numbers and suggested edits — not just failure flags." },
        ].map(f => (
          <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 max-w-7xl mx-auto px-6 py-8 flex justify-between text-sm text-gray-500">
        <span>© {new Date().getFullYear()} DocsCI · snippetci.com</span>
        <a href="mailto:hello@snippetci.com" className="hover:text-gray-300 transition-colors">hello@snippetci.com</a>
      </footer>
    </main>
  );
}
