import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'COPPA Compliance Notice — KidColoring',
  description: "KidColoring's COPPA compliance statement. Children under 13 never create accounts — all accounts are parent-owned.",
}

export default function CoppaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-extrabold text-violet-700 text-lg">🎨 KidColoring</Link>
          <Link href="/privacy" className="text-sm text-gray-500 hover:text-violet-600">Privacy →</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
          <p className="text-4xl mb-2">🛡️</p>
          <h1 className="text-2xl font-extrabold text-green-900 mb-2">COPPA Compliance</h1>
          <p className="text-green-800">
            KidColoring is fully compliant with the Children&apos;s Online Privacy Protection Act (COPPA).
            We&apos;ve designed our service specifically to protect children&apos;s privacy.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">✅ What we do</h2>
            <ul className="space-y-2 text-gray-600">
              {[
                'All accounts are created and owned by parents or legal guardians (18+)',
                'Children under 13 never create accounts or log in directly',
                'We obtain explicit parental consent before creating child profiles',
                'Child profiles contain only a nickname and age range — no full name, email, or date of birth',
                'Parents can view, edit, or delete all child data at any time',
                'We never collect personal information from children through the app',
                'No behavioural advertising or data sharing with third parties for children',
                'Session tokens are anonymous and cannot be linked to a child individually',
                'Prompts entered on behalf of children are treated as parent-provided content',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">🚫 What we don&apos;t do</h2>
            <ul className="space-y-2 text-gray-600">
              {[
                'Collect personal information from children under 13',
                'Allow children to create accounts or provide contact information',
                'Share child-related data with third parties for commercial purposes',
                'Use persistent identifiers to track children across websites',
                'Display targeted advertising to children',
                'Collect children\'s full names, email addresses, phone numbers, or precise location',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">👨‍👩‍👧 Parental controls</h2>
            <p className="text-gray-600 mb-3">
              As a parent or guardian, you have full control over your child&apos;s data:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">→</span>
                <span><strong>View</strong> all child profiles and their associated data from your account page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">→</span>
                <span><strong>Edit</strong> or update child nicknames and age ranges at any time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">→</span>
                <span><strong>Delete</strong> child profiles immediately — data is removed within 30 days</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">→</span>
                <span><strong>Revoke consent</strong> by deleting the child profile; this stops all data processing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">→</span>
                <span><strong>Delete your account</strong> — removes all data including child profiles</span>
              </li>
            </ul>
            <div className="mt-4">
              <Link href="/account" className="inline-block bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors text-sm">
                Manage child profiles →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">📋 COPPA compliance checklist</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="p-2 text-left">Requirement</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  {[
                    ['Privacy policy published', '✅'],
                    ['No direct collection from children under 13', '✅'],
                    ['Parental consent required before child profile creation', '✅'],
                    ['Parents can review child data', '✅'],
                    ['Parents can delete child data', '✅'],
                    ['No behavioural advertising to children', '✅'],
                    ['No third-party data sharing for children', '✅'],
                    ['Data minimisation (nickname + age range only)', '✅'],
                    ['Secure data transmission (HTTPS)', '✅'],
                    ['Data retention policy defined', '✅'],
                    ['Contact mechanism for parents', '✅'],
                  ].map(([req, status]) => (
                    <tr key={req} className="border-b border-gray-50">
                      <td className="p-2">{req}</td>
                      <td className="p-2 text-center">{status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Contact</h2>
            <p className="text-gray-600">
              For COPPA inquiries, to request data deletion, or to report concerns:<br/>
              <a href="mailto:privacy@kidcoloring.app" className="text-violet-600 hover:underline">privacy@kidcoloring.app</a><br/>
              We respond within 30 days to all privacy requests.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex gap-6 text-sm">
          <Link href="/privacy" className="text-violet-600 hover:underline">Privacy Policy →</Link>
          <Link href="/terms" className="text-violet-600 hover:underline">Terms of Service →</Link>
          <Link href="/" className="text-gray-500 hover:underline">← Back</Link>
        </div>
      </div>
    </div>
  )
}
