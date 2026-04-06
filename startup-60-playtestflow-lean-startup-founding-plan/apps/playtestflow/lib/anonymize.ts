/**
 * Tester anonymization utilities
 * 
 * Each tester gets a stable, pseudonymous ID derived from:
 *   SHA-256(email + sessionId + salt)
 * 
 * This means:
 * - The same email across different sessions = different tester_id (session-scoped)
 * - The designer cannot reverse the ID back to an email
 * - The ID is stable across page refreshes (deterministic)
 * - A per-session salt adds an extra layer vs. rainbow tables
 * 
 * The salt is stored in the session_signups row alongside the tester_id.
 * The original email is stored separately (needed for sending session details).
 */

/**
 * Generate a random salt (used once per signup)
 */
export function generateSalt(): string {
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Node.js fallback
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a unique consent token for a signup (UUID-style, used in URLs)
 */
export function generateConsentToken(): string {
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  // Format as UUID
  array[6] = (array[6] & 0x0f) | 0x40
  array[8] = (array[8] & 0x3f) | 0x80
  const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

/**
 * Hash email + sessionId + salt using SHA-256 (Web Crypto API)
 * Returns a 16-char hex prefix (sufficient for display/analytics)
 */
export async function hashTesterIdentity(
  email: string,
  sessionId: string,
  salt: string
): Promise<string> {
  const input = `${email.toLowerCase().trim()}:${sessionId}:${salt}`
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fullHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return `ptf_${fullHex.slice(0, 16)}`
  }
  
  // Node.js fallback (server-side)
  const { createHash } = await import('crypto')
  const hash = createHash('sha256').update(input).digest('hex')
  return `ptf_${hash.slice(0, 16)}`
}

/**
 * Generate both a tester_id and consent_token for a new signup.
 * Call this server-side when creating a session_signup row.
 */
export async function generateTesterCredentials(
  email: string,
  sessionId: string
): Promise<{ testerId: string; salt: string; consentToken: string }> {
  const salt = generateSalt()
  const testerId = await hashTesterIdentity(email, sessionId, salt)
  const consentToken = generateConsentToken()
  return { testerId, salt, consentToken }
}
