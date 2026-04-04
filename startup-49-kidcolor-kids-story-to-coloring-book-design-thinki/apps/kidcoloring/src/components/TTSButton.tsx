/**
 * TTSButton — floating "Read aloud" toggle
 *
 * Renders a fixed-position button (bottom-right) that toggles Text-to-Speech.
 * Hides itself when the browser doesn't support speechSynthesis (SSR-safe).
 *
 * Usage:
 *   const tts = useTextToSpeech()
 *   <TTSButton tts={tts} />
 *   tts.speak("Page 1 is ready: Dinosaur in space!")
 */
'use client'

import type { useTextToSpeech } from '@/hooks/useTTS'

type TTSInstance = ReturnType<typeof useTextToSpeech>

interface Props {
  tts: TTSInstance
  /** Override default bottom-right positioning (e.g. for inline use) */
  className?: string
}

export default function TTSButton({ tts, className }: Props) {
  const { enabled, supported, speaking, toggle } = tts

  // Don't render anything if the browser can't do TTS
  if (!supported) return null

  return (
    <button
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Turn off read-aloud' : 'Turn on read-aloud'}
      title={enabled ? 'Read-aloud ON — tap to turn off' : 'Tap to read pages aloud'}
      className={className ?? `
        fixed bottom-5 right-5 z-50
        flex items-center gap-2
        min-h-[52px] min-w-[52px] px-3
        rounded-2xl border-2 shadow-lg
        font-semibold text-sm
        transition-all duration-200
        focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-violet-600
        ${enabled
          ? 'bg-violet-600 border-violet-700 text-white shadow-violet-200'
          : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700'
        }
      `}
    >
      {/* Speaker icon — animates while speaking */}
      <span
        className={`text-xl leading-none select-none ${speaking ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      >
        {speaking ? '🔊' : enabled ? '🔊' : '🔇'}
      </span>

      {/* Label — hidden on very small screens to save space */}
      <span className="hidden sm:inline whitespace-nowrap">
        {speaking ? 'Reading…' : enabled ? 'Read aloud' : 'Read aloud'}
      </span>
    </button>
  )
}
