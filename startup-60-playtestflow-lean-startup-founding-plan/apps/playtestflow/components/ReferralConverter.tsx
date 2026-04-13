'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * ReferralConverter — mounts in dashboard layout.
 * On first load after OAuth callback, fires /api/referral/convert
 * if a ref code is present in URL params or sessionStorage.
 * Idempotent: server rejects duplicate conversions.
 */
export default function ReferralConverter() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlRef = searchParams.get('ptf_ref')
    const storedRef = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ptf_ref') : null
    const ref = urlRef ?? storedRef
    if (!ref) return

    // Clear storage immediately (prevent double-fire on re-render)
    if (storedRef) sessionStorage.removeItem('ptf_ref')

    fetch('/api/referral/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: ref, source: urlRef ? 'direct' : 'session' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.reward?.description) {
          // Brief toast-style notification in console (can be wired to a toast system)
          console.info(`[PlaytestFlow] Referral bonus applied: ${d.reward.description}`)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
