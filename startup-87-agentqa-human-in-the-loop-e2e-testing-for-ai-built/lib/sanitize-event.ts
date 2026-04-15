/**
 * sanitizeEvent — strips sensitive data from captured session events
 * before persisting to the database.
 */

const SENSITIVE_URL_PATTERNS = /\/(login|auth|payment|checkout|password|reset)/i

export interface SessionEvent {
  kind: 'network' | 'console' | 'click'
  ts: number
  payload: Record<string, unknown>
}

export function sanitizeEvent(event: SessionEvent): SessionEvent | null {
  const { kind, payload } = event

  try {
    if (kind === 'network') {
      const url = (payload.url as string) ?? ''
      // Drop request bodies for sensitive endpoints
      if (SENSITIVE_URL_PATTERNS.test(url)) {
        return {
          ...event,
          payload: {
            ...payload,
            body: '[REDACTED - sensitive endpoint]',
            request_body: '[REDACTED]',
          },
        }
      }

      // Scrub headers
      const headers = payload.headers as Record<string, string> | undefined
      if (headers) {
        const scrubbedHeaders: Record<string, string> = {}
        for (const [k, v] of Object.entries(headers)) {
          const lower = k.toLowerCase()
          if (['authorization', 'cookie', 'set-cookie', 'x-api-key'].includes(lower)) {
            scrubbedHeaders[k] = '[REDACTED]'
          } else {
            scrubbedHeaders[k] = v
          }
        }
        return { ...event, payload: { ...payload, headers: scrubbedHeaders } }
      }
    }

    // Scrub common patterns from any payload
    const serialized = JSON.stringify(payload)
    const scrubbed = applyRedactionPatterns(serialized)

    return {
      ...event,
      payload: JSON.parse(scrubbed) as Record<string, unknown>,
    }
  } catch {
    // If scrubbing fails, drop the event rather than leak data
    return null
  }
}

function applyRedactionPatterns(s: string): string {
  return s
    // Bearer tokens
    .replace(/Bearer [A-Za-z0-9._\-]{8,}/g, 'Bearer [REDACTED]')
    // Stripe secret keys
    .replace(/sk_(?:live|test)_[A-Za-z0-9]{8,}/g, 'sk_[REDACTED]')
    // Stripe publishable keys in requests
    .replace(/pk_(?:live|test)_[A-Za-z0-9]{8,}/g, 'pk_[REDACTED]')
    // JWTs (eyJ...)
    .replace(/eyJ[A-Za-z0-9._\-]{20,}/g, '[JWT_REDACTED]')
    // 16-digit PANs (credit card numbers)
    .replace(/\b(?:\d{4}[- ]?){3}\d{4}\b/g, '[PAN_REDACTED]')
    // Email addresses
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
}

export function sanitizeEvents(events: SessionEvent[]): SessionEvent[] {
  return events.flatMap(e => {
    const safe = sanitizeEvent(e)
    return safe ? [safe] : []
  })
}
