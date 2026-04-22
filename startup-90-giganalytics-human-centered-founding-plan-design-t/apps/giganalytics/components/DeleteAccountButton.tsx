'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }
      // Redirect to home after deletion
      router.push('/?deleted=1')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:text-red-700 hover:underline"
      >
        Delete My Account
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 mb-2">
              Delete Your Account
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete your account and all associated data, including imported
              transactions, time entries, and income streams. <strong>This cannot be undone.</strong>
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">
                {error}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting…' : 'Yes, delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
