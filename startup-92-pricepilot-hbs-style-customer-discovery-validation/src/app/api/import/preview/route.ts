import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { detectColumnMapping } from '@/lib/csv-parser'

// POST /api/import/preview — returns detected mapping + preview rows without importing
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const csvText = await file.text()
    const lines = csvText.trim().split('\n').filter(l => l.trim())
    if (lines.length < 1) return NextResponse.json({ error: 'Empty file' }, { status: 422 })

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const result = detectColumnMapping(headers)

    // Add preview rows
    result.preview = lines.slice(1, 4).map(l =>
      l.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    )

    return NextResponse.json({
      headers,
      mapping: result.mapping,
      confidence: result.confidence,
      preview: result.preview,
      errors: result.errors,
      warnings: result.warnings,
      row_count: lines.length - 1,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
