import { WirePage, WireCard, WireButton, WirePlaceholder } from '../wireframe-components'

// WF-01: Landing / Onboarding entry
export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-900 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="text-blue-300 text-sm font-mono mb-2">GIGANALYTICS</div>
      <h1 className="text-white text-3xl font-bold text-center mb-3">
        Which of your income sources pays best per hour?
      </h1>
      <p className="text-blue-200 text-center mb-8 max-w-md">
        Upload a CSV and find out in 5 minutes. No waitlist. No credit card.
      </p>

      {/* Upload zone */}
      <div className="bg-white/10 border-2 border-dashed border-blue-400 rounded-xl p-8 mb-4 text-center max-w-md w-full">
        <div className="text-4xl mb-2">📥</div>
        <div className="text-white font-medium mb-1">Drop your Stripe CSV here</div>
        <div className="text-blue-300 text-sm mb-4">or PayPal / Upwork / Toggl</div>
        <WireButton variant="primary">Browse files</WireButton>
      </div>

      {/* Alt CTAs */}
      <div className="flex gap-3 mb-6">
        <button className="text-blue-300 text-sm hover:text-white border border-blue-600 rounded px-4 py-2">
          📅 Import Google Calendar (.ics)
        </button>
        <button className="text-blue-300 text-sm hover:text-white border border-blue-600 rounded px-4 py-2">
          🎲 Try with sample data
        </button>
      </div>

      <p className="text-blue-400 text-xs">Already have an account? <a href="/dashboard" className="underline">Sign in</a></p>

      {/* Value props */}
      <div className="mt-10 grid grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { icon: '💰', title: 'True $/hr', desc: 'See real earnings after fees and unbilled overhead' },
          { icon: '📊', title: 'Compare streams', desc: 'Rank all income sources side by side' },
          { icon: '🎯', title: 'Act on it', desc: 'AI tells you exactly what to change' },
        ].map(v => (
          <div key={v.title} className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl mb-1">{v.icon}</div>
            <div className="text-white text-sm font-medium">{v.title}</div>
            <div className="text-blue-300 text-xs mt-1">{v.desc}</div>
          </div>
        ))}
      </div>

      {/* Route label */}
      <div className="fixed bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
        WF-01 · / (onboarding)
      </div>
    </div>
  )
}
