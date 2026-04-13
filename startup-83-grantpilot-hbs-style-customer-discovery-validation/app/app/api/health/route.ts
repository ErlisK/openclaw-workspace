import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {}

  // ── Supabase connectivity ─────────────────────────────────────────────────
  try {
    const t = Date.now()
    const admin = createAdminClient()
    const { error } = await admin.from('organizations').select('id').limit(1)
    checks.supabase = { ok: !error, ms: Date.now() - t, error: error?.message }
  } catch (e) {
    checks.supabase = { ok: false, error: String(e) }
  }

  // ── OpenAI key presence ───────────────────────────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY || ''
  checks.openai = {
    ok: openaiKey.startsWith('sk-') && openaiKey !== 'sk-placeholder-configure-openai-key-for-ai-features',
    error: !openaiKey.startsWith('sk-') ? 'OPENAI_API_KEY not configured — AI features disabled, heuristics active' : undefined,
  }

  // ── Required env vars ─────────────────────────────────────────────────────
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  const missingEnv = required.filter(k => !process.env[k])
  checks.env = { ok: missingEnv.length === 0, error: missingEnv.length > 0 ? `Missing: ${missingEnv.join(', ')}` : undefined }

  const allOk = Object.values(checks).every(c => c.ok)
  const totalMs = Date.now() - start

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_ms: totalMs,
    checks,
    features: {
      ai_narrative: checks.openai.ok,
      ai_budget: checks.openai.ok,
      heuristic_qa: true,         // always available
      pdf_export: true,
      zip_export: true,
      ics_export: true,
      sample_rfps: true,
    },
  }, { status: allOk ? 200 : 503 })
}
