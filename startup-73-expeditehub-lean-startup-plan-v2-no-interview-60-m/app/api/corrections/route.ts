import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Known Austin ADU BP-001 field keys for LLM extraction stub
const KNOWN_FIELD_KEYS: Record<string, string> = {
  'impervious cover':          'impervious_cover_pct',
  'impervious':                'impervious_cover_pct',
  'setback':                   'setback_front',
  'front setback':             'setback_front',
  'rear setback':              'setback_rear',
  'side setback':              'setback_side',
  'lot size':                  'lot_area_sqft',
  'lot area':                  'lot_area_sqft',
  'floor area ratio':          'adu_max_sqft_allowed',
  'far':                       'adu_max_sqft_allowed',
  'square footage':            'proposed_sqft',
  'adu size':                  'proposed_sqft',
  'height':                    'max_height_ft',
  'utility':                   'utility_connection',
  'survey':                    'survey',
  'site plan':                 'site_plan',
  'floor plan':                'floor_plan',
  'elevation':                 'elevation',
  'drainage':                  'drainage',
  'tree':                      'tree_survey',
  'zoning':                    'zoning',
  'owner':                     'owner_name',
  'contractor':                'contractor_name',
  'license':                   'contractor_license',
}

// LLM stub: rule-based extraction from raw text
// Replace with real LLM call (OpenAI, Claude, etc.) when API key available
function extractFieldTagsFromText(
  rawText: string,
  correctionLetterId: string,
  projectId: string
): Array<{
  correction_letter_id: string
  project_id: string
  field_key: string
  field_label: string
  correction_note: string
  severity: string
  source: string
  original_value: string | null
  corrected_value: string | null
}> {
  const tags: ReturnType<typeof extractFieldTagsFromText> = []
  const lines = rawText.split('\n').filter(l => l.trim().length > 10)

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Skip lines that look like headers/boilerplate
    if (lower.includes('city of austin') || lower.includes('dear') || lower.includes('sincerely')) continue

    // Look for correction signals
    const isCorrectionLine =
      lower.includes('must') || lower.includes('required') || lower.includes('incorrect') ||
      lower.includes('does not') || lower.includes('missing') || lower.includes('revise') ||
      lower.includes('correct') || lower.includes('provide') || lower.includes('submit') ||
      lower.includes('exceed') || lower.includes('insufficient') || lower.includes('deficient')

    if (!isCorrectionLine) continue

    // Match against known fields
    let matchedKey = ''
    let matchedLabel = ''
    for (const [phrase, key] of Object.entries(KNOWN_FIELD_KEYS)) {
      if (lower.includes(phrase)) {
        matchedKey = key
        matchedLabel = phrase.charAt(0).toUpperCase() + phrase.slice(1)
        break
      }
    }

    if (!matchedKey) {
      // Generic "unknown field" fallback
      matchedKey = 'unknown'
      matchedLabel = 'Unknown field'
    }

    // Extract value patterns like "XX%" or "XX ft" or "XX sq ft"
    const valueMatch = line.match(/(\d+(?:\.\d+)?)\s*(%|ft|sq\s*ft|sqft|square feet)/i)
    const correctedValue = valueMatch ? valueMatch[0] : null

    const severity = lower.includes('must') || lower.includes('required') || lower.includes('missing')
      ? 'required' : 'advisory'

    // Avoid duplicates for same field key
    if (!tags.find(t => t.field_key === matchedKey)) {
      tags.push({
        correction_letter_id: correctionLetterId,
        project_id: projectId,
        field_key: matchedKey,
        field_label: matchedLabel,
        correction_note: line.trim().substring(0, 500),
        severity,
        source: 'llm_extracted',
        original_value: null,
        corrected_value: correctedValue,
      })
    }
  }

  return tags
}

// GET /api/corrections?project_id=xxx
export async function GET(req: NextRequest) {
  const db = getSupabaseAdmin()
  const projectId = new URL(req.url).searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const [lettersRes, tagsRes] = await Promise.all([
    db.from('correction_letters')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    db.from('correction_field_tags')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    letters: lettersRes.data ?? [],
    tags: tagsRes.data ?? [],
  })
}

// POST /api/corrections — upload correction letter + trigger extraction
export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin()
  const formData = await req.formData()

  const projectId    = formData.get('project_id') as string
  const quoteId      = formData.get('quote_id') as string | null
  const uploadedBy   = formData.get('uploaded_by') as string
  const uploaderRole = (formData.get('uploader_role') as string) || 'pro'
  const caseNumber   = formData.get('case_number') as string | null
  const rawText      = formData.get('raw_text') as string | null  // paste of OCR/manual text
  const file         = formData.get('file') as File | null

  if (!projectId || !uploadedBy) {
    return NextResponse.json({ error: 'project_id and uploaded_by required' }, { status: 400 })
  }

  let fileUrl = ''
  let fileName = 'pasted-text'
  let fileSize = 0
  let mimeType = 'text/plain'

  // Upload file to Supabase Storage if provided
  if (file) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, JPG, PNG, or TXT.' }, { status: 400 })
    }

    const path = `corrections/${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await db.storage
      .from('project-files')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: urlData } = db.storage.from('project-files').getPublicUrl(path)
    fileUrl  = urlData.publicUrl
    fileName = file.name
    fileSize = file.size
    mimeType = file.type
  }

  // Insert correction letter record
  const { data: letter, error: letterErr } = await db
    .from('correction_letters')
    .insert({
      project_id:      projectId,
      quote_id:        quoteId || null,
      uploaded_by:     uploadedBy,
      uploader_role:   uploaderRole,
      file_url:        fileUrl,
      file_name:       fileName,
      file_size_bytes: fileSize,
      mime_type:       mimeType,
      case_number:     caseNumber || null,
      raw_text:        rawText || null,
      status:          rawText ? 'extracting' : 'pending_review',
      extraction_model: rawText ? 'stub-v1' : null,
    })
    .select()
    .single()

  if (letterErr) return NextResponse.json({ error: letterErr.message }, { status: 500 })

  // Run extraction stub if raw text was provided
  let tags: unknown[] = []
  if (rawText && letter) {
    const extracted = extractFieldTagsFromText(rawText, letter.id, projectId)
    if (extracted.length > 0) {
      const { data: insertedTags } = await db
        .from('correction_field_tags')
        .insert(extracted)
        .select()
      tags = insertedTags ?? []
    }

    // Update letter status
    await db
      .from('correction_letters')
      .update({ status: 'extracted', extracted_at: new Date().toISOString() })
      .eq('id', letter.id)
  }

  return NextResponse.json({ letter, tags, extracted: tags.length })
}

// PATCH /api/corrections — add/update a manual tag, or resolve a tag
export async function PATCH(req: NextRequest) {
  const db = getSupabaseAdmin()
  const body = await req.json()
  const { action, tag_id, letter_id, ...patch } = body

  if (action === 'resolve_tag' && tag_id) {
    const { data, error } = await db
      .from('correction_field_tags')
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: patch.resolved_by })
      .eq('id', tag_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (action === 'add_tag' && letter_id) {
    const { data, error } = await db
      .from('correction_field_tags')
      .insert({ ...patch, correction_letter_id: letter_id, source: 'manual' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (action === 'update_letter_status' && letter_id) {
    const { data, error } = await db
      .from('correction_letters')
      .update({ status: patch.status, case_number: patch.case_number, notes: patch.notes })
      .eq('id', letter_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
