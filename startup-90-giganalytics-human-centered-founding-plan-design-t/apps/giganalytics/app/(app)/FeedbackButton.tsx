'use client'

import { useState } from 'react'

interface FeedbackButtonProps {
  userEmail?: string
}

export default function FeedbackButton({ userEmail }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false)

  const mailtoSubject = encodeURIComponent('GigAnalytics Feedback')
  const mailtoBody = encodeURIComponent(
    `Hi GigAnalytics team,\n\nI have feedback about:\n\n[describe your feedback here]\n\n---\nPage: ${typeof window !== 'undefined' ? window.location.pathname : '(unknown)'}\nUser: ${userEmail ?? '(not logged in)'}`
  )
  const mailtoUrl = `mailto:hello@hourlyroi.com?subject=${mailtoSubject}&body=${mailtoBody}`

  const githubBugUrl =
    'https://github.com/ErlisK/openclaw-workspace/issues/new?template=bug_report.md&labels=giganalytics'
  const githubFeatureUrl =
    'https://github.com/ErlisK/openclaw-workspace/issues/new?template=feature_request.md&labels=giganalytics,enhancement'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Send feedback"
        aria-label="Open feedback menu"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span>💬</span>
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Menu */}
          <div className="absolute bottom-full right-0 mb-2 z-50 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Send feedback</p>
            </div>

            <a
              href={mailtoUrl}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span>✉️</span>
              <div>
                <p className="font-medium">Email support</p>
                <p className="text-gray-400">hello@hourlyroi.com</p>
              </div>
            </a>

            <a
              href={githubBugUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span>🐛</span>
              <div>
                <p className="font-medium">Report a bug</p>
                <p className="text-gray-400">Opens GitHub Issues</p>
              </div>
            </a>

            <a
              href={githubFeatureUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span>💡</span>
              <div>
                <p className="font-medium">Request a feature</p>
                <p className="text-gray-400">Opens GitHub Issues</p>
              </div>
            </a>

            <a
              href="/docs"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800"
            >
              <span>📚</span>
              <div>
                <p className="font-medium">Browse docs</p>
                <p className="text-gray-400">CSV templates, formulas, AI guide</p>
              </div>
            </a>
          </div>
        </>
      )}
    </div>
  )
}
