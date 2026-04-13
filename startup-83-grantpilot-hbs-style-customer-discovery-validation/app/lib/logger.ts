/**
 * Structured logger for server-side use.
 * Outputs JSON logs compatible with Vercel Log Drains.
 * All logs go to stdout/stderr — Vercel captures them automatically.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  msg: string
  service: string
  timestamp: string
  [key: string]: unknown
}

function log(level: LogLevel, msg: string, meta: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    level,
    msg,
    service: 'grantpilot',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    ...meta,
  }
  // Scrub sensitive fields
  const safe = { ...entry }
  for (const key of ['password', 'token', 'secret', 'key', 'authorization']) {
    if (key in safe) safe[key] = '[REDACTED]'
  }

  const line = JSON.stringify(safe)
  if (level === 'error' || level === 'warn') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
}

// ─── Request logger middleware helper ─────────────────────────────────────────
export function logRequest(req: { method: string; url: string; headers?: Headers }, meta?: Record<string, unknown>) {
  logger.info('api_request', {
    method: req.method,
    url: req.url?.split('?')[0], // strip querystring from logs
    ...meta,
  })
}

export function logError(err: unknown, context: string, meta?: Record<string, unknown>) {
  const error = err instanceof Error ? err : new Error(String(err))
  logger.error(`${context}: ${error.message}`, {
    context,
    error_name: error.name,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    ...meta,
  })
}

// ─── Performance timer ────────────────────────────────────────────────────────
export function startTimer(name: string) {
  const start = Date.now()
  return {
    done: (meta?: Record<string, unknown>) => {
      const ms = Date.now() - start
      logger.info(`${name}_complete`, { duration_ms: ms, ...meta })
      return ms
    },
    error: (err: unknown, meta?: Record<string, unknown>) => {
      const ms = Date.now() - start
      logError(err, name, { duration_ms: ms, ...meta })
    },
  }
}
