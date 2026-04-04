/**
 * src/lib/logger.ts
 *
 * Unified structured logging for KidColoring.
 * - Server-side: writes to Supabase `error_logs` (admin client, bypasses RLS)
 * - Fire-and-forget: never throws, never blocks request
 * - Client-side: POSTs to /api/v1/log-error beacon
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.error('api', 'generate failed', { sessionId, err })
 *   logger.metric('/api/v1/generate', 'POST', 200, 1234)
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

type Severity = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
type ErrorType = 'client' | 'server' | 'api' | 'edge'

interface LogPayload {
  sessionId?:    string
  errorType?:    ErrorType
  errorCode?:    string
  stackTrace?:   string
  route?:        string
  method?:       string
  statusCode?:   number
  userAgent?:    string
  ip?:           string   // will be hashed before storage
  severity?:     Severity
  properties?:   Record<string, unknown>
}

interface MetricPayload {
  sessionId?: string
  userId?:    string
  ip?:        string
  properties?: Record<string, unknown>
}

// Singleton admin client — service role bypasses RLS for writes
let _adminClient: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _adminClient
}

function hashIp(ip?: string): string | null {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? 'kc-salt')).digest('hex').slice(0, 16)
}

function truncate(s?: string, max = 2000): string | null {
  if (!s) return null
  return s.length > max ? s.slice(0, max) + '...' : s
}

async function writeLog(
  errorMessage: string,
  opts: LogPayload = {}
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return
  try {
    const sb = getAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from('error_logs') as any).insert({
      session_id:    opts.sessionId ?? null,
      error_type:    opts.errorType ?? 'server',
      error_code:    opts.errorCode ?? null,
      error_message: truncate(errorMessage, 500),
      stack_trace:   truncate(opts.stackTrace, 2000),
      route:         opts.route ?? null,
      method:        opts.method ?? null,
      status_code:   opts.statusCode ?? null,
      user_agent:    truncate(opts.userAgent, 200) ?? null,
      ip_hash:       hashIp(opts.ip),
      severity:      opts.severity ?? 'error',
      properties:    opts.properties ?? {},
    } as Record<string, unknown>)
  } catch (e) {
    // Never let logging break the app
    console.error('[logger] write failed', e)
  }
}

async function writeMetric(
  endpoint: string,
  method:   string,
  statusCode: number,
  latencyMs: number,
  opts: MetricPayload = {}
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return
  // Skip logging at < 10% sample rate for 2xx to keep table lean
  if (statusCode >= 200 && statusCode < 300 && Math.random() > 0.1) return
  // Always log 4xx/5xx
  try {
    const sb = getAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from('api_metrics') as any).insert({  // eslint-disable-line
      endpoint,
      method,
      status_code: statusCode,
      latency_ms:  latencyMs,
      session_id:  opts.sessionId ?? null,
      user_id:     opts.userId ?? null,
      ip_hash:     hashIp(opts.ip),
      properties:  opts.properties ?? {},
    } as Record<string, unknown>)
  } catch (e) {
    console.error('[logger] metric write failed', e)
  }
}

export const logger = {
  /** Log an error — fire and forget */
  error(route: string, message: string, opts: LogPayload & { err?: unknown } = {}) {
    const err = opts.err
    const stack = err instanceof Error ? err.stack : undefined
    const msg   = err instanceof Error ? `${message}: ${err.message}` : message
    void writeLog(msg, {
      ...opts,
      route,
      severity: opts.severity ?? 'error',
      stackTrace: opts.stackTrace ?? stack,
    })
    if (process.env.NODE_ENV !== 'production') console.error(`[${route}] ${msg}`, opts.err)
  },

  /** Log a warning */
  warn(route: string, message: string, opts: LogPayload = {}) {
    void writeLog(message, { ...opts, route, severity: 'warn' })
    if (process.env.NODE_ENV !== 'production') console.warn(`[${route}] ${message}`)
  },

  /** Log informational event */
  info(route: string, message: string, opts: LogPayload = {}) {
    if (process.env.NODE_ENV !== 'production') console.info(`[${route}] ${message}`)
    // Only write info logs explicitly
    if (opts.severity === 'info') void writeLog(message, { ...opts, route, severity: 'info' })
  },

  /** Log a fatal error — always writes */
  fatal(route: string, message: string, opts: LogPayload & { err?: unknown } = {}) {
    const err = opts.err
    const stack = err instanceof Error ? err.stack : undefined
    const msg   = err instanceof Error ? `${message}: ${err.message}` : message
    void writeLog(msg, {
      ...opts,
      route,
      severity: 'fatal',
      stackTrace: opts.stackTrace ?? stack,
    })
    console.error(`[FATAL][${route}] ${msg}`, opts.err)
  },

  /** Record an API metric (latency + status) — fire and forget */
  metric(
    endpoint: string,
    method: string,
    statusCode: number,
    latencyMs: number,
    opts: MetricPayload = {}
  ) {
    void writeMetric(endpoint, method, statusCode, latencyMs, opts)
  },
}

/**
 * Timing helper for API routes
 *
 * Usage:
 *   const t = startTimer()
 *   // ...do work...
 *   logger.metric('/api/v1/session', 'POST', 200, t())
 */
export function startTimer(): () => number {
  const start = Date.now()
  return () => Date.now() - start
}

/**
 * Extract caller IP from NextRequest headers
 * Returns the first non-internal IP from x-forwarded-for or x-real-ip
 */
export function getClientIp(headers: Headers): string | undefined {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) {
    const ip = fwd.split(',')[0].trim()
    if (ip && !ip.startsWith('10.') && !ip.startsWith('172.') && !ip.startsWith('127.')) return ip
  }
  return headers.get('x-real-ip') ?? undefined
}
