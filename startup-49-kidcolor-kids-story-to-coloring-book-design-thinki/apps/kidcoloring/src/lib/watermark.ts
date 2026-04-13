/**
 * src/lib/watermark.ts
 *
 * Server-side watermark utility for gallery images.
 * Adds a subtle KidColoring.app watermark to shared pages.
 * Uses CSS overlay approach (no server-side image processing needed).
 */

export interface WatermarkConfig {
  /** Opacity of the watermark overlay (0–1) */
  opacity:  number
  /** Text shown in the watermark */
  text:     string
  /** Position on the image */
  position: 'bottom-right' | 'bottom-left' | 'center'
}

export const DEFAULT_WATERMARK: WatermarkConfig = {
  opacity:  0.35,
  text:     'KidColoring.app',
  position: 'bottom-right',
}

/**
 * Returns CSS variables for watermark overlay positioning.
 * Used in the gallery ImageCard component.
 */
export function getWatermarkStyles(config = DEFAULT_WATERMARK) {
  const pos: Record<string, Record<string, string>> = {
    'bottom-right': { bottom: '8px', right: '10px' },
    'bottom-left':  { bottom: '8px', left: '10px' },
    'center':       { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
  }
  return {
    ...pos[config.position],
    opacity: String(config.opacity),
  }
}
