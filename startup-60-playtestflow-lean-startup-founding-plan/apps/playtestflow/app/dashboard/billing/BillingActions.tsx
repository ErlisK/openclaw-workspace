'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  action: 'upgrade' | 'portal' | 'topup'
  label: string
  variant?: 'primary' | 'outline' | 'outline-yellow' | 'small'
  packageId?: string
  className?: string
}

export default function BillingActions({ action, label, variant = 'outline', packageId, className = '' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')

    try {
      if (action === 'upgrade') {
        router.push('/pricing')
        return
      }

      if (action === 'portal') {
        const res = await fetch('/api/billing/portal', { method: 'POST' })
        const data = await res.json()
        if (data.url) { window.location.href = data.url; return }
        setError(data.error ?? 'Could not open portal')
        return
      }

      if (action === 'topup' && packageId) {
        const res = await fetch('/api/billing/topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId }),
        })
        const data = await res.json()
        if (data.url) { window.location.href = data.url; return }
        setError(data.error ?? 'Top-up failed')
        return
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const baseClasses = 'transition-colors rounded-lg font-semibold disabled:opacity-50'
  const variantClasses: Record<string, string> = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm',
    outline: 'bg-white/6 hover:bg-white/10 border border-white/15 text-white px-4 py-2 text-sm',
    'outline-yellow': 'bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 px-4 py-2 text-sm',
    small: 'bg-white/8 hover:bg-white/12 border border-white/15 text-white px-2 py-1 text-xs',
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${baseClasses} ${variantClasses[variant] ?? variantClasses.outline}`}
      >
        {loading ? '…' : label}
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
