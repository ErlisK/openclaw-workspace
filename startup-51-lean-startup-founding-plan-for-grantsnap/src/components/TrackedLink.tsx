'use client'

import { track, EventType } from '@/lib/analytics'
import { MouseEvent } from 'react'

interface TrackedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  eventType?: EventType
  source: string
  ctaLabel: string
  section?: string
}

/**
 * Drop-in anchor replacement that fires a cta_click event before navigating.
 */
export function TrackedLink({
  eventType = 'cta_click',
  source,
  ctaLabel,
  section,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    track({ event_type: eventType, source, cta_label: ctaLabel, section })
    onClick?.(e)
  }
  return (
    <a onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

interface TrackedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  eventType?: EventType
  source: string
  ctaLabel: string
  section?: string
}

export function TrackedButton({
  eventType = 'cta_click',
  source,
  ctaLabel,
  section,
  onClick,
  children,
  ...props
}: TrackedButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    track({ event_type: eventType, source, cta_label: ctaLabel, section })
    onClick?.(e)
  }
  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  )
}
