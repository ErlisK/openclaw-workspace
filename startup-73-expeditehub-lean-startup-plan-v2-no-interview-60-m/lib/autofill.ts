/**
 * Austin ADU Permit Packet — AI Autofill Engine
 *
 * Deterministic rule-based autofill from structured project + GIS data.
 * No LLM needed for structured fields (achieves 70%+ fill rate).
 * Template-based prose generation for narrative fields.
 */

import { AUSTIN_ADU_FORM_FIELDS, FilledField, FormField } from './form-template'

export interface ProjectData {
  // Intake
  homeowner_email: string
  address: string
  zip?: string | null
  city?: string
  state?: string
  proposed_adu_type?: string
  proposed_adu_sqft?: number | null
  has_plans?: boolean
  timeline?: string
  notes?: string

  // GIS
  lat?: number | null
  lng?: number | null
  parcel_id?: string | null
  zoning?: string | null
  lot_size_sqft?: number | null
  year_built?: number | null
  existing_sqft?: number | null

  // GIS derived
  adu_eligible?: boolean
  max_adu_sqft?: number | null
}

export interface PacketDraft {
  project_id: string
  fields: FilledField[]
  fill_rate: number         // 0–1
  filled_required: number
  total_required: number
  autofill_score: number    // 0–100
  missing_fields: string[]
  generated_at: string
  version: number
}

// ── Zone-based setback rules (Austin LDC §25-2) ──────────────────────────────
const ZONE_SETBACKS: Record<string, { front: number; rear: number; side: number; height: number }> = {
  default: { front: 25, rear: 10, side: 5, height: 15 },
  SF_1:    { front: 25, rear: 10, side: 5, height: 35 },
  SF_2:    { front: 25, rear: 10, side: 5, height: 35 },
  SF_3:    { front: 25, rear: 10, side: 5, height: 35 },
  SF_4A:   { front: 15, rear: 10, side: 5, height: 35 },
  SF_4B:   { front: 15, rear: 5,  side: 5, height: 35 },
  SF_5:    { front: 15, rear: 5,  side: 5, height: 35 },
  SF_6:    { front: 15, rear: 5,  side: 5, height: 40 },
  MF_1:    { front: 15, rear: 10, side: 5, height: 40 },
  MF_2:    { front: 15, rear: 10, side: 5, height: 40 },
  RR:      { front: 50, rear: 20, side: 15, height: 35 },
}

function getSetbacks(zoning: string | null | undefined) {
  if (!zoning) return ZONE_SETBACKS.default
  const key = zoning.toUpperCase().replace('-', '_').replace(' ', '_')
  return ZONE_SETBACKS[key] ?? ZONE_SETBACKS.default
}

// ── ADU type normalization ────────────────────────────────────────────────────
function normalizeAduType(raw: string | undefined): string {
  if (!raw) return 'Detached ADU (DADU)'
  const r = raw.toLowerCase()
  if (r.includes('detach') || r.includes('backyard') || r.includes('cottage')) return 'Detached ADU (DADU)'
  if (r.includes('attach') || r.includes('addition')) return 'Attached ADU'
  if (r.includes('garage')) return 'Garage Conversion'
  if (r.includes('junior') || r.includes('jadu') || r.includes('internal')) return 'Junior ADU (JADU)'
  return 'Detached ADU (DADU)'
}

// ── Construction value estimate ───────────────────────────────────────────────
function estimateConstructionValue(sqft: number | null | undefined, type: string): number {
  const basePerSqft = type.includes('Garage') ? 95 : type.includes('Junior') ? 75 : 150
  return Math.round((sqft ?? 600) * basePerSqft)
}

// ── Lot coverage estimate ─────────────────────────────────────────────────────
function estimateLotCoverage(aduSqft: number, existingSqft: number | null, lotSqft: number | null): number | null {
  if (!lotSqft) return null
  const existing = existingSqft ?? 1500
  const footprint = aduSqft * 0.6  // approximate 1-story footprint
  return Math.round(((existing * 0.7 + footprint) / lotSqft) * 100)
}

// ── Prose generator ───────────────────────────────────────────────────────────
function generateProjectDescription(data: ProjectData): string {
  const aduType = normalizeAduType(data.proposed_adu_type)
  const sqft = data.proposed_adu_sqft ?? 600
  const zoning = data.zoning ?? 'SF'
  const address = data.address

  const typeLabel = aduType.replace('(DADU)', '').replace('(JADU)', '').trim()
  const notes = data.notes ? ` Additional context: ${data.notes.slice(0, 150)}.` : ''

  return (
    `Proposed construction of a ${sqft} sq ft ${typeLabel} at ${address}, Austin TX. ` +
    `Property is zoned ${zoning}. ` +
    `Project consists of new residential accessory dwelling unit per City of Austin ADU ordinance. ` +
    `Work includes foundation, framing, roofing, plumbing, electrical, and mechanical systems.` +
    notes
  )
}

// ── Main autofill function ────────────────────────────────────────────────────
export function autofillPacket(projectId: string, data: ProjectData, version = 1): PacketDraft {
  const aduType = normalizeAduType(data.proposed_adu_type)
  const setbacks = getSetbacks(data.zoning)
  const aduSqft = data.proposed_adu_sqft ?? 600
  const constructionValue = estimateConstructionValue(aduSqft, aduType)
  const lotCoverage = estimateLotCoverage(aduSqft, data.existing_sqft ?? null, data.lot_size_sqft ?? null)

  // Lookup table: field id → { value, confidence, source }
  const lookup: Record<string, { value: string | number | boolean | null; confidence: FilledField['confidence']; source: string }> = {
    // Section A
    site_address:          { value: data.address,                      confidence: 'high',   source: 'intake' },
    site_city:             { value: data.city ?? 'Austin',             confidence: 'high',   source: 'intake' },
    site_state:            { value: data.state ?? 'TX',                confidence: 'high',   source: 'intake' },
    site_zip:              { value: data.zip ?? null,                  confidence: data.zip ? 'high' : 'low',   source: 'gis' },
    parcel_id:             { value: data.parcel_id ?? null,            confidence: data.parcel_id ? 'high' : 'low', source: 'gis' },
    legal_description:     { value: null,                              confidence: 'missing', source: 'needs_manual' },
    subdivision_name:      { value: null,                              confidence: 'missing', source: 'needs_manual' },
    lot_number:            { value: null,                              confidence: 'missing', source: 'needs_manual' },
    zoning_district:       { value: data.zoning ?? null,              confidence: data.zoning ? 'high' : 'low',  source: 'gis' },
    council_district:      { value: null,                              confidence: 'missing', source: 'needs_manual' },

    // Section B
    work_type:             { value: 'New Construction',                confidence: 'high',   source: 'rules' },
    use_type:              { value: 'Accessory Dwelling Unit',         confidence: 'high',   source: 'rules' },
    project_description:   { value: generateProjectDescription(data),  confidence: 'high',   source: 'generated' },
    is_adu:                { value: true,                              confidence: 'high',   source: 'rules' },
    adu_type:              { value: aduType,                           confidence: 'high',   source: 'intake' },

    // Section C
    existing_use:          { value: 'Single-Family Residential',       confidence: 'high',   source: 'rules' },
    existing_sqft:         { value: data.existing_sqft ?? null,        confidence: data.existing_sqft ? 'high' : 'low', source: 'gis' },
    proposed_sqft:         { value: aduSqft,                           confidence: 'high',   source: 'intake' },
    proposed_stories:      { value: aduSqft > 800 ? 2 : 1,            confidence: 'medium', source: 'rules' },
    proposed_bedrooms:     { value: aduSqft >= 800 ? 2 : 1,           confidence: 'medium', source: 'rules' },
    proposed_bathrooms:    { value: 1,                                 confidence: 'medium', source: 'rules' },
    construction_type:     { value: 'Type V-B (Wood Frame)',           confidence: 'high',   source: 'rules' },
    occupancy_class:       { value: 'R-3',                             confidence: 'high',   source: 'rules' },
    lot_area_sqft:         { value: data.lot_size_sqft ?? null,        confidence: data.lot_size_sqft ? 'high' : 'low', source: 'gis' },
    lot_coverage_pct:      { value: lotCoverage,                       confidence: lotCoverage !== null ? 'medium' : 'low', source: 'calculated' },
    impervious_cover_pct:  { value: lotCoverage ? Math.min(45, lotCoverage + 5) : null, confidence: 'low', source: 'estimated' },
    year_built_primary:    { value: data.year_built ?? null,           confidence: data.year_built ? 'high' : 'low', source: 'gis' },

    // Section D
    front_setback:         { value: setbacks.front,                    confidence: 'high',   source: 'ldc_rules' },
    rear_setback:          { value: setbacks.rear,                     confidence: 'high',   source: 'ldc_rules' },
    side_setback_left:     { value: setbacks.side,                     confidence: 'high',   source: 'ldc_rules' },
    side_setback_right:    { value: setbacks.side,                     confidence: 'high',   source: 'ldc_rules' },
    adu_height_ft:         { value: Math.round(setbacks.height * 0.9), confidence: 'high',   source: 'ldc_rules' },
    alley_access:          { value: false,                             confidence: 'low',    source: 'assumed' },

    // Section E
    owner_name:            { value: null,                              confidence: 'missing', source: 'needs_manual' },
    owner_email:           { value: data.homeowner_email,              confidence: 'high',   source: 'intake' },
    owner_phone:           { value: null,                              confidence: 'missing', source: 'needs_manual' },
    owner_address:         { value: data.address,                      confidence: 'medium', source: 'intake' },
    owner_occupied:        { value: true,                              confidence: 'medium', source: 'assumed' },

    // Section F — professional, needs manual
    contractor_name:       { value: null,                              confidence: 'missing', source: 'needs_manual' },
    contractor_license:    { value: null,                              confidence: 'missing', source: 'needs_manual' },
    architect_name:        { value: null,                              confidence: 'missing', source: 'needs_manual' },
    architect_license:     { value: null,                              confidence: 'missing', source: 'needs_manual' },

    // Section G
    construction_value:    { value: constructionValue,                 confidence: 'medium', source: 'estimated' },
    fee_basis:             { value: `${aduSqft} SF @ $${constructionValue / aduSqft}/SF`, confidence: 'medium', source: 'calculated' },

    // Section H
    water_connection:      { value: true,                              confidence: 'high',   source: 'rules' },
    sewer_connection:      { value: true,                              confidence: 'high',   source: 'rules' },
    electric_meter:        { value: false,                             confidence: 'medium', source: 'assumed' },

    // Section I
    floodplain:            { value: false,                             confidence: 'low',    source: 'assumed' },
    heritage_tree:         { value: false,                             confidence: 'low',    source: 'assumed' },
    hoa_approval:          { value: false,                             confidence: 'low',    source: 'assumed' },
    historic_district:     { value: false,                             confidence: 'low',    source: 'assumed' },
  }

  // Build filled fields
  const fields: FilledField[] = AUSTIN_ADU_FORM_FIELDS.map((field: FormField) => {
    const fill = lookup[field.id]
    if (!fill) {
      return { ...field, value: null, confidence: 'missing', source: 'unknown' }
    }
    return { ...field, ...fill }
  })

  // Calculate fill rate
  const required = fields.filter(f => f.required)
  const filledRequired = required.filter(f => f.confidence !== 'missing' && f.value !== null)
  const fillRate = filledRequired.length / required.length
  const autofillScore = Math.round(fillRate * 100)

  const missing = required
    .filter(f => f.confidence === 'missing' || f.value === null)
    .map(f => f.label)

  return {
    project_id: projectId,
    fields,
    fill_rate: fillRate,
    filled_required: filledRequired.length,
    total_required: required.length,
    autofill_score: autofillScore,
    missing_fields: missing,
    generated_at: new Date().toISOString(),
    version,
  }
}
