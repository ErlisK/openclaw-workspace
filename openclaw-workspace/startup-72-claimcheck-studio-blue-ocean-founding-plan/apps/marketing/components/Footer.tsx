import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-bold text-white mb-3">
            <span className="text-blue-400 text-xl">◈</span>
            <span>ClaimCheck Studio</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Evidence-backed content studio for health and life sciences.
            Every claim earns its citation.
          </p>
          <p className="text-xs text-gray-600 mt-4">
            <a href="mailto:hello@citebundle.com" className="hover:text-gray-400 transition-colors">
              hello@citebundle.com
            </a>
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Product</div>
          <div className="space-y-2 text-sm text-gray-400">
            <Link href="/#how-it-works" className="block hover:text-white transition-colors">How it works</Link>
            <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
            <Link href="https://app.citebundle.com/compliance" target="_blank" className="block hover:text-white transition-colors">Compliance</Link>
            <Link href="https://app.citebundle.com/review" target="_blank" className="block hover:text-white transition-colors">Reviewer portal</Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Company</div>
          <div className="space-y-2 text-sm text-gray-400">
            <Link href="/about" className="block hover:text-white transition-colors">About</Link>
            <Link href="/webinar" className="block hover:text-white transition-colors">Webinar</Link>
            <Link href="/pilot" className="block hover:text-white transition-colors">Pilot program</Link>
            <a href="mailto:hello@citebundle.com" className="block hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Legal</div>
          <div className="space-y-2 text-sm text-gray-400">
            <span className="block text-gray-600">Privacy Policy</span>
            <span className="block text-gray-600">Terms of Service</span>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-gray-600">
        <span>© {new Date().getFullYear()} ClaimCheck Studio · citebundle.com</span>
        <span>Built for the evidence-first web</span>
      </div>
    </footer>
  )
}
