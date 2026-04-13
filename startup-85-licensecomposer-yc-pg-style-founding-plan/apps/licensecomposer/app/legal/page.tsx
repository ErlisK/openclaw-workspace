import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Legal — PactTailor',
  description: 'PactTailor legal documents: Terms of Service, Privacy Policy, and Legal Disclaimer.',
};

export default function LegalIndexPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Link href="/" className="font-bold text-indigo-700 text-xl">PactTailor</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Legal Documents</h1>
        </div>
        <div className="space-y-3">
          {[
            { href: '/legal/terms', icon: '📄', title: 'Terms of Service', desc: 'Rules for using PactTailor' },
            { href: '/legal/privacy', icon: '🔐', title: 'Privacy Policy', desc: 'How we handle your data' },
            { href: '/legal/disclaimer', icon: '⚠️', title: 'Legal Disclaimer', desc: 'Not legal advice — read this first' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="font-semibold text-gray-900">{item.title}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400">
          Questions? <a href="mailto:hello@pacttailor.com" className="underline hover:text-gray-600">hello@pacttailor.com</a>
        </p>
      </div>
    </div>
  );
}
