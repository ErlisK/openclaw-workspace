import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the GigAnalytics team.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 font-bold text-lg">GigAnalytics</Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-500 text-sm mb-6">
          Have a question or need help? We are here for you.
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Support Email</p>
            <a href="mailto:support@giganalytics.io" className="text-blue-600 hover:underline text-sm">
              support@giganalytics.io
            </a>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Response Time</p>
            <p className="text-sm text-gray-500">We typically respond within 1-2 business days.</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/pricing" className="hover:underline">Pricing</Link>
        </div>
      </div>
    </div>
  )
}
