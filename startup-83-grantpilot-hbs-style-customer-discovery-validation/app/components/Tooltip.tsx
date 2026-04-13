'use client'

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'right' | 'left'
  maxWidth?: string
}

/**
 * Lightweight accessible tooltip.
 * Usage: <Tooltip text="Helpful hint"><span>ⓘ</span></Tooltip>
 */
export default function Tooltip({ text, children, position = 'top', maxWidth = 'max-w-xs' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)

  // Hide on Escape
  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setVisible(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible])

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  }

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
  }

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      role="tooltip"
      aria-label={text}
    >
      {children}

      {visible && (
        <span
          role="tooltip"
          className={`
            pointer-events-none absolute z-50 whitespace-normal rounded-lg
            bg-gray-800 text-white text-xs px-3 py-2 leading-relaxed shadow-lg
            ${maxWidth} ${positionClasses[position]}
          `}
          style={{ width: 'max-content', maxWidth: '220px' }}
        >
          {text}
          {/* Arrow */}
          <span
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </span>
      )}
    </span>
  )
}
