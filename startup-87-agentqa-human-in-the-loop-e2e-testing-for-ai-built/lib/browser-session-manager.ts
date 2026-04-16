/**
 * Browser Session Manager
 *
 * Manages Playwright browser instances for remote-browser testing sessions.
 * Each session gets its own BrowserContext with network/console interception.
 * Screenshots are captured on demand and returned as base64 JPEG.
 *
 * NOTE: State is in-process (module-level Map). In a multi-instance Vercel
 * deployment, sessions are sticky to the instance that created them. For
 * production, migrate to a dedicated browser server (e.g. Browserbase, Fly.io).
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright-core'

export interface BrowserEvent {
  id: string
  session_id: string
  event_type: 'network_request' | 'network_response' | 'console_log' | 'navigation' | 'page_error'
  ts: string
  request_url?: string
  method?: string
  status_code?: number
  response_time_ms?: number
  log_level?: string
  log_message?: string
  payload?: Record<string, unknown>
}

export interface BrowserSession {
  sessionId: string
  jobUrl: string
  context: BrowserContext
  page: Page
  events: BrowserEvent[]
  startedAt: number
  lastActivityAt: number
  currentUrl: string
  viewportWidth: number
  viewportHeight: number
}

// Module-level store — persists across requests within the same process instance
const sessions = new Map<string, BrowserSession>()
let browserSingleton: Browser | null = null

// Maximum idle time before session is auto-cleaned (35 minutes)
const MAX_IDLE_MS = 35 * 60 * 1000
// Maximum events to keep in memory per session
const MAX_EVENTS = 2000

let eventCounter = 0
function makeEventId() { return `ev-${Date.now()}-${++eventCounter}` }

async function getBrowser(): Promise<Browser> {
  if (browserSingleton && browserSingleton.isConnected()) {
    return browserSingleton
  }

  // Use @sparticuz/chromium for serverless environments (Vercel/Lambda)
  // Falls back to system chromium for local dev
  let executablePath: string | undefined
  let launchArgs: string[]

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sparticuz = require('@sparticuz/chromium')
    executablePath = await sparticuz.default.executablePath()
    launchArgs = sparticuz.default.args
  } catch {
    executablePath = undefined
    launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ]
  }

  browserSingleton = await chromium.launch({
    headless: true,
    executablePath,
    args: launchArgs,
  })
  return browserSingleton
}

export async function startSession(
  sessionId: string,
  jobUrl: string,
  viewportWidth = 1280,
  viewportHeight = 800,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Close any existing session with this id
  await stopSession(sessionId)

  try {
    const browser = await getBrowser()
    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: viewportHeight },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()

    const session: BrowserSession = {
      sessionId,
      jobUrl,
      context,
      page,
      events: [],
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      currentUrl: jobUrl,
      viewportWidth,
      viewportHeight,
    }

    // ── Network interception ────────────────────────────────────────────
    const requestStartTimes = new Map<string, number>()

    page.on('request', (request) => {
      const rid = `${request.method()}-${request.url()}-${Date.now()}`
      requestStartTimes.set(rid, Date.now())
      pushEvent(session, {
        event_type: 'network_request',
        request_url: request.url(),
        method: request.method(),
        payload: { resource_type: request.resourceType() },
      })
    })

    page.on('response', (response) => {
      const rid = `${response.request().method()}-${response.url()}-${Date.now()}`
      const started = requestStartTimes.get(rid) ?? Date.now()
      requestStartTimes.delete(rid)
      pushEvent(session, {
        event_type: 'network_response',
        request_url: response.url(),
        method: response.request().method(),
        status_code: response.status(),
        response_time_ms: Date.now() - started,
      })
    })

    // ── Console interception ────────────────────────────────────────────
    page.on('console', (msg) => {
      pushEvent(session, {
        event_type: 'console_log',
        log_level: msg.type() as BrowserEvent['log_level'],
        log_message: msg.text(),
      })
    })

    // ── Page errors ─────────────────────────────────────────────────────
    page.on('pageerror', (err) => {
      pushEvent(session, {
        event_type: 'page_error',
        log_level: 'error',
        log_message: err.message,
      })
    })

    // ── Navigation ──────────────────────────────────────────────────────
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        session.currentUrl = frame.url()
        pushEvent(session, {
          event_type: 'navigation',
          request_url: frame.url(),
          log_message: `Navigated to ${frame.url()}`,
        })
      }
    })

    sessions.set(sessionId, session)

    // Navigate to the job URL
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

function pushEvent(session: BrowserSession, partial: Omit<BrowserEvent, 'id' | 'session_id' | 'ts'>) {
  session.lastActivityAt = Date.now()
  const event: BrowserEvent = {
    id: makeEventId(),
    session_id: session.sessionId,
    ts: new Date().toISOString(),
    ...partial,
  }
  session.events.push(event)
  if (session.events.length > MAX_EVENTS) {
    session.events.splice(0, session.events.length - MAX_EVENTS)
  }
}

export async function getScreenshot(
  sessionId: string,
): Promise<{ ok: true; screenshot: string; url: string } | { ok: false; error: string }> {
  const session = sessions.get(sessionId)
  if (!session) return { ok: false, error: 'Session not found' }

  try {
    session.lastActivityAt = Date.now()
    const buf = await session.page.screenshot({ type: 'jpeg', quality: 80 })
    return {
      ok: true,
      screenshot: buf.toString('base64'),
      url: session.currentUrl,
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function drainEvents(sessionId: string): Promise<BrowserEvent[]> {
  const session = sessions.get(sessionId)
  if (!session) return []
  const drained = [...session.events]
  session.events = []
  return drained
}

export type ActionPayload =
  | { type: 'click'; x: number; y: number }
  | { type: 'scroll'; deltaX: number; deltaY: number }
  | { type: 'navigate'; url: string }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'reload' }
  | { type: 'type'; text: string }
  | { type: 'keypress'; key: string }

export async function performAction(
  sessionId: string,
  action: ActionPayload,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = sessions.get(sessionId)
  if (!session) return { ok: false, error: 'Session not found' }

  try {
    session.lastActivityAt = Date.now()
    const page = session.page

    switch (action.type) {
      case 'click': {
        pushEvent(session, {
          event_type: 'console_log',
          log_level: 'info',
          log_message: `Click at (${action.x}, ${action.y})`,
        })
        await page.mouse.click(action.x, action.y)
        // Wait briefly for any navigation/re-render
        await page.waitForTimeout(300)
        break
      }
      case 'scroll': {
        await page.mouse.wheel(action.deltaX, action.deltaY)
        await page.waitForTimeout(100)
        break
      }
      case 'navigate': {
        await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
        break
      }
      case 'back': {
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 })
        break
      }
      case 'forward': {
        await page.goForward({ waitUntil: 'domcontentloaded', timeout: 10000 })
        break
      }
      case 'reload': {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 })
        break
      }
      case 'type': {
        await page.keyboard.type(action.text)
        break
      }
      case 'keypress': {
        await page.keyboard.press(action.key)
        break
      }
    }

    return { ok: true, url: page.url() }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function stopSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId)
  if (!session) return
  sessions.delete(sessionId)
  try {
    await session.context.close()
  } catch {
    // ignore
  }
}

export function getSessionInfo(sessionId: string) {
  const s = sessions.get(sessionId)
  if (!s) return null
  return {
    sessionId: s.sessionId,
    jobUrl: s.jobUrl,
    currentUrl: s.currentUrl,
    startedAt: s.startedAt,
    lastActivityAt: s.lastActivityAt,
    eventCount: s.events.length,
    viewportWidth: s.viewportWidth,
    viewportHeight: s.viewportHeight,
  }
}

// Periodically clean up idle sessions (runs on each request to start/screenshot)
export function cleanupIdleSessions() {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.lastActivityAt > MAX_IDLE_MS) {
      stopSession(id)
    }
  }
}
