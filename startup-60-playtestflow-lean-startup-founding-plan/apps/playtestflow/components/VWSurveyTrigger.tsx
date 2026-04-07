'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const VWSurveyModal = dynamic(() => import('./VWSurveyModal'), { ssr: false })

interface VWSurveyTriggerProps {
  /** Only show to users on trial */
  isTrialing: boolean
}

/**
 * VWSurveyTrigger — mounts in the dashboard layout and shows the VW survey
 * to trialing users who haven't yet submitted it.
 * 
 * Shows after 30s on first visit (or on subsequent visits if not yet done).
 * Suppressed by localStorage flag to avoid re-showing after dismiss.
 */
export default function VWSurveyTrigger({ isTrialing }: VWSurveyTriggerProps) {
  const [show, setShow] = useState(false)
  const [variant, setVariant] = useState<'A' | 'B'>('A')
  const [annualPrice, setAnnualPrice] = useState(31.20)
  const [annualSavingsPct, setAnnualSavingsPct] = useState(20)

  useEffect(() => {
    if (!isTrialing) return

    // Check if already dismissed or submitted this session
    const dismissed = localStorage.getItem('ptf_vw_dismissed')
    const submitted = localStorage.getItem('ptf_vw_submitted')
    if (submitted) return

    // Check server-side submission status + get A/B variant
    fetch('/api/survey/vw')
      .then(r => r.json())
      .then(data => {
        if (data.submitted) {
          localStorage.setItem('ptf_vw_submitted', '1')
          return
        }
        if (dismissed) return

        setVariant(data.variant ?? 'A')
        setAnnualPrice(data.annual_price ?? 31.20)
        setAnnualSavingsPct(data.annual_savings_pct ?? 20)

        // Show after 30s (non-intrusive)
        const timer = setTimeout(() => setShow(true), 30_000)
        return () => clearTimeout(timer)
      })
      .catch(() => {}) // non-throwing
  }, [isTrialing])

  function handleClose() {
    setShow(false)
    localStorage.setItem('ptf_vw_dismissed', '1')
  }

  function handleSubmit() {
    localStorage.setItem('ptf_vw_submitted', '1')
  }

  if (!show) return null

  return (
    <VWSurveyModal
      variant={variant}
      annualPrice={annualPrice}
      annualSavingsPct={annualSavingsPct}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  )
}
