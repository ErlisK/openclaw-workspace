'use client'
/**
 * components/onboarding/OnboardingTooltip.tsx
 *
 * Lightweight tooltip that anchors to a data-onboarding-target element.
 * Renders a floating callout with backdrop pointer-events.
 *
 * Usage:
 *   <button data-onboarding-target="new-project-btn">Create project</button>
 *   <OnboardingTooltip target="new-project-btn" text="Start here!" placement="bottom" onDismiss={() => {}} />
 */
import { useEffect, useRef, useState } from 'react'

interface TooltipProps {
  target: string              // data-onboarding-target value
  text: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  onDismiss?: () => void
  stepTitle?: string
  stepIndex?: number
  totalSteps?: number
}

export default function OnboardingTooltip({
  target,
  text,
  placement = 'bottom',
  onDismiss,
  stepTitle,
  stepIndex,
  totalSteps,
}: TooltipProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [arrowPos, setArrowPos] = useState<{ top: number; left: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anchor = document.querySelector(`[data-onboarding-target="${target}"]`) as HTMLElement | null
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const tw = tooltip.offsetWidth || 240
    const th = tooltip.offsetHeight || 100
    const gap = 10

    let top = 0
    let left = 0
    let arrTop = 0
    let arrLeft = 0

    if (placement === 'bottom') {
      top = rect.bottom + gap + window.scrollY
      left = rect.left + rect.width / 2 - tw / 2 + window.scrollX
      arrTop = -8
      arrLeft = tw / 2 - 8
    } else if (placement === 'top') {
      top = rect.top - th - gap + window.scrollY
      left = rect.left + rect.width / 2 - tw / 2 + window.scrollX
      arrTop = th - 2
      arrLeft = tw / 2 - 8
    } else if (placement === 'right') {
      top = rect.top + rect.height / 2 - th / 2 + window.scrollY
      left = rect.right + gap + window.scrollX
      arrTop = th / 2 - 8
      arrLeft = -8
    } else {
      top = rect.top + rect.height / 2 - th / 2 + window.scrollY
      left = rect.left - tw - gap + window.scrollX
      arrTop = th / 2 - 8
      arrLeft = tw - 2
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8))

    setPos({ top, left })
    setArrowPos({ top: arrTop, left: arrLeft })

    // Pulse the anchor element
    anchor.classList.add('onboarding-pulse')
    return () => anchor.classList.remove('onboarding-pulse')
  }, [target, placement])

  if (!pos) return null

  return (
    <>
      {/* Semi-transparent backdrop to focus attention */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.05)' }}
      />
      <div
        ref={tooltipRef}
        data-testid="onboarding-tooltip"
        className="fixed z-50 w-60 bg-indigo-700 text-white rounded-xl shadow-2xl p-3 text-sm"
        style={{ top: pos.top, left: pos.left }}
      >
        {/* Arrow */}
        {arrowPos && (
          <div
            className="absolute w-4 h-4 bg-indigo-700 rotate-45"
            style={{ top: arrowPos.top, left: arrowPos.left }}
          />
        )}

        <div className="relative">
          {stepTitle && (
            <div className="font-semibold text-xs text-indigo-200 mb-1">
              {stepIndex !== undefined && totalSteps !== undefined
                ? `Step ${stepIndex + 1} of ${totalSteps} — `
                : ''}
              {stepTitle}
            </div>
          )}
          <p className="leading-relaxed">{text}</p>
          <button
            onClick={onDismiss}
            className="mt-2 text-xs text-indigo-200 hover:text-white underline"
          >
            Got it →
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes onboarding-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
          50% { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
        }
        .onboarding-pulse {
          animation: onboarding-ring 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>
    </>
  )
}
