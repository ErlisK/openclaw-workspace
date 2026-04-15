'use client'
/**
 * components/onboarding/OnboardingTour.tsx
 *
 * Step-by-step guided tour that lights up dashboard elements.
 * Shows one tooltip at a time, advancing through ONBOARDING_STEPS that have tooltip config.
 *
 * Activated by:
 *   1. Auto-start on first visit (localStorage flag)
 *   2. "Restart tour" button in OnboardingChecklist
 *   3. window.dispatchEvent(new CustomEvent('betawindow:start_tour'))
 */
import { useEffect, useState, useCallback } from 'react'
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps'
import OnboardingTooltip from './OnboardingTooltip'

const TOUR_STEPS = ONBOARDING_STEPS.filter(s => s.tooltip)
const TOUR_KEY = 'betawindow_tour_seen'

interface TourProps {
  autoStart?: boolean
}

export default function OnboardingTour({ autoStart = true }: TourProps) {
  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)

  const startTour = useCallback(() => {
    setStepIdx(0)
    setActive(true)
  }, [])

  const endTour = useCallback(() => {
    setActive(false)
    localStorage.setItem(TOUR_KEY, '1')
  }, [])

  const next = useCallback(() => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      setStepIdx(i => i + 1)
    } else {
      endTour()
    }
  }, [stepIdx, endTour])

  useEffect(() => {
    if (autoStart && !localStorage.getItem(TOUR_KEY)) {
      // Small delay to let the page render
      const t = setTimeout(startTour, 800)
      return () => clearTimeout(t)
    }
  }, [autoStart, startTour])

  useEffect(() => {
    const handler = () => startTour()
    window.addEventListener('betawindow:start_tour', handler)
    return () => window.removeEventListener('betawindow:start_tour', handler)
  }, [startTour])

  if (!active || TOUR_STEPS.length === 0) return null

  const currentStep = TOUR_STEPS[stepIdx]
  const tooltip = currentStep.tooltip!

  return (
    <OnboardingTooltip
      target={tooltip.target}
      text={tooltip.text}
      placement={tooltip.placement}
      stepTitle={currentStep.title}
      stepIndex={stepIdx}
      totalSteps={TOUR_STEPS.length}
      onDismiss={next}
    />
  )
}
