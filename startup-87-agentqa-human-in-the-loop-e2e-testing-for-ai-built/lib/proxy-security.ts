/**
 * lib/proxy-security.ts
 *
 * URL validation and rate limiting for /api/proxy.
 * Prevents SSRF (Server-Side Request Forgery) by:
 *   1. Enforcing http/https-only
 *   2. Blocking private/loopback/link-local IP ranges
 *   3. Resolving hostnames via DNS and re-checking the resulting IPs
 *   4. Blocking known-dangerous domain patterns
 *   5. An in-process token-bucket rate limiter per IP
 */

import { NextRequest } from 'next/server'
import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'

// ---------------------------------------------------------------------------
// SSRF: blocked IP ranges (CIDR-style prefix checks)
// ---------------------------------------------------------------------------

interface IpRange {
  prefix: string
  bits: number
  label: string
}

const BLOCKED_IPV4_RANGES: IpRange[] = [
  { prefix: '127.',    bits: 8,  label: 'loopback'       },
  { prefix: '10.',     bits: 8,  label: 'private RFC1918' },
  { prefix: '172.16.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.17.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.18.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.19.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.20.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.21.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.22.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.23.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.24.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.25.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.26.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.27.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.28.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.29.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.30.', bits: 12, label: 'private RFC1918' },
  { prefix: '172.31.', bits: 12, label: 'private RFC1918' },
  { prefix: '192.168.', bits: 16, label: 'private RFC1918' },
  { prefix: '169.254.', bits: 16, label: 'link-local'      },
  { prefix: '100.64.',  bits: 10, label: 'CGNAT'           },
  { prefix: '0.',       bits: 8,  label: 'reserved'        },
  { prefix: '240.',     bits: 4,  label: 'reserved'        },
]

const BLOCKED_IPV6_PREFIXES = [
  '::1',          // loopback
  'fc',           // unique local
  'fd',           // unique local
  'fe80',         // link-local
  '::ffff:',      // IPv4-mapped (may hide private IPv4)
  '64:ff9b:',     // NAT64 (may resolve to private IPv4)
]

function isPrivateIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) {
    for (const range of BLOCKED_IPV4_RANGES) {
      if (ip.startsWith(range.prefix)) return true
    }
    return false
  }
  if (version === 6) {
    const lower = ip.toLowerCase()
    for (const pfx of BLOCKED_IPV6_PREFIXES) {
      if (lower.startsWith(pfx)) return true
    }
    return false
  }
  return false
}

// ---------------------------------------------------------------------------
// Domain block-list (patterns that should never be proxied)
// ---------------------------------------------------------------------------

const BLOCKED_HOSTNAME_PATTERNS = [
  /localhost/i,
  /\.local$/i,
  /\.internal$/i,
  /\.corp$/i,
  /\.home$/i,
  /metadata\.google\.internal/i,
  /169\.254\.169\.254/,   // AWS/GCP/Azure IMDS
  /fd[0-9a-f]{2}/i,       // IPv6 unique-local shorthand
]

function isBlockedHostname(hostname: string): boolean {
  for (const pat of BLOCKED_HOSTNAME_PATTERNS) {
    if (pat.test(hostname)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Public URL validation + SSRF check (async: does DNS resolution)
// ---------------------------------------------------------------------------

export type UrlCheckResult =
  | { ok: true; url: URL }
  | { ok: false; reason: string; status: 400 | 403 | 422 }

export async function validateProxyUrl(raw: string | null): Promise<UrlCheckResult> {
  if (!raw) {
    return { ok: false, reason: 'Missing ?url= parameter', status: 400 }
  }

  // Parse
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: 'Invalid URL', status: 400 }
  }

  // Protocol check
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: `Disallowed scheme: ${parsed.protocol}`, status: 400 }
  }

  const hostname = parsed.hostname

  // Hostname block-list
  if (isBlockedHostname(hostname)) {
    return { ok: false, reason: 'Blocked hostname', status: 403 }
  }

  // If the hostname is already a literal IP, check it directly
  if (isIP(hostname) > 0) {
    if (isPrivateIp(hostname)) {
      return { ok: false, reason: 'Blocked IP address', status: 403 }
    }
    return { ok: true, url: parsed }
  }

  // Resolve hostname → check resolved IPs (prevent DNS rebinding / SSRF)
  try {
    const results = await dnsLookup(hostname, { all: true })
    for (const r of results) {
      if (isPrivateIp(r.address)) {
        return { ok: false, reason: 'Hostname resolves to a blocked IP', status: 403 }
      }
    }
  } catch {
    // DNS failure — treat as unreachable but not a security block
    // Let the fetch fail naturally (avoids false-positives for valid but slow DNS)
  }

  return { ok: true, url: parsed }
}

// ---------------------------------------------------------------------------
// In-process token-bucket rate limiter
// ---------------------------------------------------------------------------

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

const RATE_LIMIT = {
  maxTokens: 20,       // burst: 20 requests
  refillRate: 10,      // tokens per minute
  refillIntervalMs: 60_000,
}

// Prune buckets every 5 minutes to avoid unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key)
  }
}, 5 * 60_000)

export function checkRateLimit(req: NextRequest): { allowed: boolean; remaining: number } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  const now = Date.now()
  let bucket = buckets.get(ip)

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT.maxTokens, lastRefill: now }
    buckets.set(ip, bucket)
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill
  const refilled = Math.floor(elapsed / RATE_LIMIT.refillIntervalMs) * RATE_LIMIT.refillRate
  if (refilled > 0) {
    bucket.tokens = Math.min(RATE_LIMIT.maxTokens, bucket.tokens + refilled)
    bucket.lastRefill = now
  }

  if (bucket.tokens <= 0) {
    return { allowed: false, remaining: 0 }
  }

  bucket.tokens -= 1
  return { allowed: true, remaining: bucket.tokens }
}
