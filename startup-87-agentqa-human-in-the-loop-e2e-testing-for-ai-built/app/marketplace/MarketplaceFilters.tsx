'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  currentTier?: string
  currentSort: string
  totalJobs: number
}

const TIERS = [
  { value: '', label: 'All Tiers' },
  { value: 'quick', label: '⚡ Quick ($5, 10 min)' },
  { value: 'standard', label: '⏱ Standard ($10, 20 min)' },
  { value: 'deep', label: '🔬 Deep ($15, 30 min)' },
]

const SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'highest_pay', label: 'Highest Pay' },
]

export default function MarketplaceFilters({ currentTier, currentSort, totalJobs }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/marketplace?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <span data-testid="marketplace-job-count" className="text-sm text-gray-500 mr-2">
        <strong className="text-gray-900">{totalJobs}</strong> job{totalJobs !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Tier:</label>
        <select
          value={currentTier ?? ''}
          onChange={e => update('tier', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {TIERS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Sort:</label>
        <select
          value={currentSort}
          onChange={e => update('sort', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {SORTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {currentTier && (
        <button
          onClick={() => update('tier', '')}
          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
        >
          Clear filter
        </button>
      )}
    </div>
  )
}
