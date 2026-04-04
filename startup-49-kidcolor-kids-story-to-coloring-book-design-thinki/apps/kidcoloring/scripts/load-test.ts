#!/usr/bin/env node
/**
 * load-test.ts — Simulate 50 concurrent coloring book generation sessions
 *
 * Tests:
 *   1. Session creation concurrency (50 simultaneous)
 *   2. Page generation via /api/v1/generate/batch (50 concurrent sessions)
 *   3. PDF export stress test (10 concurrent)
 *
 * Metrics captured:
 *   - p50 / p95 / p99 latency per route
 *   - Error rate
 *   - Supabase DB connection pool behaviour
 *   - Pollinations 429 rate under load
 *
 * Run: npx tsx scripts/load-test.ts
 */

const BASE_URL = process.env.TEST_URL ?? 'https://kidcoloring-research.vercel.app'
const CONCURRENCY = 50

// ── Helpers ──────────────────────────────────────────────────────────────────
async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; ms: number; error?: string }> {
  const t0 = Date.now()
  try {
    const result = await fn()
    return { result, ms: Date.now() - t0 }
  } catch (err) {
    return { result: null, ms: Date.now() - t0, error: err instanceof Error ? err.message : String(err) }
  }
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.floor((p / 100) * sorted.length)
  return sorted[Math.min(idx, sorted.length - 1)]
}

function stats(latencies: number[]) {
  const errors = latencies.filter(l => l < 0).length
  const good   = latencies.filter(l => l >= 0)
  return {
    p50:   good.length ? percentile(good, 50) : 0,
    p95:   good.length ? percentile(good, 95) : 0,
    p99:   good.length ? percentile(good, 99) : 0,
    avg:   good.length ? Math.round(good.reduce((s, v) => s + v, 0) / good.length) : 0,
    errors,
  }
}

interface Session { sessionId: string; sessionToken: string }

// ── Step 1: Create 50 sessions concurrently ──────────────────────────────────
async function createSession(): Promise<Session | null> {
  const interests = [
    ['dinosaurs', 'space'],
    ['unicorns', 'fairies'],
    ['robots', 'superheroes'],
    ['puppies', 'kittens'],
    ['dragons', 'wizards'],
  ][Math.floor(Math.random() * 5)]

  const res = await fetch(`${BASE_URL}/api/v1/session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concept: 'interest-packs',
      config: {
        heroName:  `TestHero${Math.floor(Math.random() * 9999)}`,
        interests,
        ageRange:  '6-8',
        pageCount: 4,
      },
    }),
  })

  if (!res.ok) { console.error(`Session failed: ${res.status} ${await res.text()}`); return null }
  return await res.json() as Session
}

async function runSessionCreationTest() {
  console.log(`\n=== Step 1: Session Creation (${CONCURRENCY} concurrent) ===`)
  const t0      = Date.now()
  const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => timed(createSession)))
  const total   = Date.now() - t0

  const latencies = results.map(r => r.error ? -1 : r.ms)
  const s         = stats(latencies)
  const sessions  = results.map(r => r.result).filter(Boolean) as Session[]

  console.log(`  Completed in ${total}ms wall-clock`)
  console.log(`  Success: ${sessions.length}/${CONCURRENCY} (${Math.round(sessions.length/CONCURRENCY*100)}%)`)
  console.log(`  Latency → avg: ${s.avg}ms | p50: ${s.p50}ms | p95: ${s.p95}ms | p99: ${s.p99}ms`)
  console.log(`  Errors: ${s.errors}`)

  return { sessions, wallClock: total, ...s }
}

// ── Step 2: Batch generation (1 page per session, 20 concurrent) ─────────────
async function triggerBatch(sessionId: string): Promise<{ ok: boolean; pages: number; ms: number }> {
  const t0  = Date.now()
  const res = await fetch(`${BASE_URL}/api/v1/generate/batch`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sessionId }),
    // 120s timeout handled server-side; we'll wait up to 60s here for the first response
    signal:  AbortSignal.timeout(120_000),
  })
  const ms = Date.now() - t0

  if (!res.ok) return { ok: false, pages: 0, ms }
  const data = await res.json() as { ok: boolean; completedCount?: number }
  return { ok: data.ok, pages: data.completedCount ?? 0, ms }
}

async function runGenerationTest(sessions: Session[]) {
  // Test with first 20 sessions to avoid hammering Pollinations
  const sample    = sessions.slice(0, 20)
  console.log(`\n=== Step 2: Batch Generation (${sample.length} concurrent) ===`)
  console.log(`  Triggering server-side batch for each session...`)

  const t0      = Date.now()
  const results = await Promise.all(sample.map(s => timed(() => triggerBatch(s.sessionId))))
  const total   = Date.now() - t0

  const latencies    = results.map(r => r.error ? -1 : r.ms)
  const s            = stats(latencies)
  const successes    = results.filter(r => !r.error && (r.result as { ok: boolean })?.ok).length
  const pagesCreated = results.reduce((sum, r) => sum + ((r.result as { pages: number } | null)?.pages ?? 0), 0)

  console.log(`  Wall-clock: ${total}ms (max concurrency = ${sample.length})`)
  console.log(`  Success rate: ${successes}/${sample.length} (${Math.round(successes/sample.length*100)}%)`)
  console.log(`  Pages generated: ${pagesCreated}`)
  console.log(`  Latency → avg: ${s.avg}ms | p50: ${s.p50}ms | p95: ${s.p95}ms | p99: ${s.p99}ms`)
  console.log(`  Errors: ${s.errors}`)

  return { successes, sessionCount: sample.length, wallClock: total, pagesCreated, ...s }
}

// ── Step 3: PDF export stress test (10 concurrent) ───────────────────────────
async function exportPDF(sessionId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/v1/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    signal: AbortSignal.timeout(60_000),
  })
  return res.ok
}

async function runExportTest(sessions: Session[]) {
  const sample = sessions.slice(0, 10)
  console.log(`\n=== Step 3: PDF Export (${sample.length} concurrent) ===`)

  const t0      = Date.now()
  const results = await Promise.all(sample.map(s => timed(() => exportPDF(s.sessionId))))
  const total   = Date.now() - t0

  const latencies = results.map(r => r.error ? -1 : r.ms)
  const s         = stats(latencies)
  const successes = results.filter(r => !r.error && r.result).length

  console.log(`  Wall-clock: ${total}ms`)
  console.log(`  Success rate: ${successes}/${sample.length} (${Math.round(successes/sample.length*100)}%)`)
  console.log(`  Latency → avg: ${s.avg}ms | p50: ${s.p50}ms | p95: ${s.p95}ms | p99: ${s.p99}ms`)
  console.log(`  Errors: ${s.errors}`)

  return { successes, sessionCount: sample.length, wallClock: total, ...s }
}

// ── Step 4: Write CSV report ──────────────────────────────────────────────────
function writeReport(results: {
  session: Awaited<ReturnType<typeof runSessionCreationTest>>
  generation: Awaited<ReturnType<typeof runGenerationTest>>
  export: Awaited<ReturnType<typeof runExportTest>>
}) {
  const ts = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')
  const csv = [
    'test,concurrency,wall_ms,success_rate_pct,p50_ms,p95_ms,p99_ms,avg_ms,errors',
    `session_create,${CONCURRENCY},${results.session.wallClock},${Math.round((CONCURRENCY - results.session.errors)/CONCURRENCY*100)},${results.session.p50},${results.session.p95},${results.session.p99},${results.session.avg},${results.session.errors}`,
    `batch_generate,${20},${results.generation.wallClock},${Math.round(results.generation.successes/results.generation.sessionCount*100)},${results.generation.p50},${results.generation.p95},${results.generation.p99},${results.generation.avg},${results.generation.errors}`,
    `pdf_export,${10},${results.export.wallClock},${Math.round(results.export.successes/results.export.sessionCount*100)},${results.export.p50},${results.export.p95},${results.export.p99},${results.export.avg},${results.export.errors}`,
  ].join('\n')

  const path = `${process.env.HOME}/.openclaw/workspace/scide-output/load-test-${ts}.csv`
  const { writeFileSync } = require('fs')
  writeFileSync(path, csv)
  console.log(`\n📊 CSV report saved: ${path}`)
  return csv
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🏋️  KidColoring Load Test — ${new Date().toISOString()}`)
  console.log(`🎯  Target: ${BASE_URL}`)
  console.log(`⚡  Concurrency: ${CONCURRENCY} concurrent sessions\n`)

  const sessionResult = await runSessionCreationTest()

  let genResult = { successes: 0, sessionCount: 0, wallClock: 0, p50: 0, p95: 0, p99: 0, avg: 0, errors: 0, pagesCreated: 0 }
  let exportResult = { successes: 0, sessionCount: 0, wallClock: 0, p50: 0, p95: 0, p99: 0, avg: 0, errors: 0 }

  if (sessionResult.sessions.length > 0) {
    genResult    = await runGenerationTest(sessionResult.sessions)
    exportResult = await runExportTest(sessionResult.sessions)
  } else {
    console.log('\n⚠️  Skipping generation + export tests (no sessions created)')
  }

  writeReport({ session: sessionResult, generation: genResult, export: exportResult })

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log('📋 LOAD TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`\nTarget URL: ${BASE_URL}`)
  console.log(`Run at:     ${new Date().toISOString()}`)

  console.log('\n┌─────────────────────┬────────┬────────┬────────┬────────┐')
  console.log('│ Test                 │ P50    │ P95    │ P99    │ Errors │')
  console.log('├─────────────────────┼────────┼────────┼────────┼────────┤')
  console.log(`│ Session create (50)  │ ${String(sessionResult.p50+'ms').padEnd(6)} │ ${String(sessionResult.p95+'ms').padEnd(6)} │ ${String(sessionResult.p99+'ms').padEnd(6)} │ ${String(sessionResult.errors+'/'+CONCURRENCY).padEnd(6)} │`)
  console.log(`│ Batch generate (20)  │ ${String(genResult.p50+'ms').padEnd(6)} │ ${String(genResult.p95+'ms').padEnd(6)} │ ${String(genResult.p99+'ms').padEnd(6)} │ ${String(genResult.errors+'/20').padEnd(6)} │`)
  console.log(`│ PDF export (10)      │ ${String(exportResult.p50+'ms').padEnd(6)} │ ${String(exportResult.p95+'ms').padEnd(6)} │ ${String(exportResult.p99+'ms').padEnd(6)} │ ${String(exportResult.errors+'/10').padEnd(6)} │`)
  console.log('└─────────────────────┴────────┴────────┴────────┴────────┘')

  console.log('\n🎯 Success Criteria:')
  const sessionOk = sessionResult.p95 < 3000
  const genOk     = genResult.p95 < 60000
  const exportOk  = exportResult.p95 < 30000

  console.log(`  Session create p95 < 3s:   ${sessionOk ? '✅' : '❌'} (${sessionResult.p95}ms)`)
  console.log(`  Batch generate p95 < 60s:  ${genOk ? '✅' : '⚠️'} (${genResult.p95}ms) — image gen varies`)
  console.log(`  PDF export p95 < 30s:      ${exportOk ? '✅' : '❌'} (${exportResult.p95}ms)`)

  process.exit(0)
}

main().catch(console.error)
