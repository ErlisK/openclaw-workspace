import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lookupParcel, describeZoning } from '@/lib/parcel'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const body = await req.json()
  const {
    homeowner_email,
    address,
    zip,
    proposed_adu_type,
    proposed_adu_sqft,
    has_plans,
    plans_ready,
    timeline,
    notes,
    posthog_distinct_id,
    existing_structure_sqft,
    hard_surface_sqft,
    utility_connection,
    owner_phone,
  } = body

  if (!homeowner_email || !address) {
    return NextResponse.json({ error: 'email and address required' }, { status: 400 })
  }

  // 1. Look up parcel data from GIS
  const gisData = await lookupParcel(address)
  const zoningInfo = describeZoning(gisData.zoning)

  // 2. Upsert/find lead record
  const { data: leadData } = await supabase
    .from('leads')
    .select('id')
    .eq('email', homeowner_email)
    .single()

  // 3. Create project record
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      homeowner_email,
      lead_id: leadData?.id ?? null,
      address,
      zip: zip || gisData.zip,
      city: 'Austin',
      state: 'TX',
      lat: gisData.lat,
      lng: gisData.lng,
      parcel_id: gisData.parcel_id,
      zoning: gisData.zoning,
      lot_size_sqft: gisData.lot_size_sqft,
      year_built: gisData.year_built,
      existing_sqft: gisData.existing_sqft,
      proposed_adu_type: proposed_adu_type || 'Detached ADU',
      proposed_adu_sqft: proposed_adu_sqft || null,
      has_plans: has_plans || false,
      plans_ready: plans_ready || null,
      timeline: timeline || null,
      notes: notes || null,
      existing_structure_sqft: existing_structure_sqft ?? gisData.existing_sqft ?? null,
      hard_surface_sqft: hard_surface_sqft ?? null,
      utility_connection: utility_connection ?? null,
      owner_phone: owner_phone ?? null,
      type: 'ADU',
      jurisdiction: 'Austin, TX',
      status: 'intake_complete',
      gis_data: { ...gisData, adu_eligible: zoningInfo.aduEligible, max_adu_sqft: zoningInfo.maxAduSqft },
      packet_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Project insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    project_id: project.id,
    gis: {
      lat: gisData.lat,
      lng: gisData.lng,
      zip: gisData.zip,
      zoning: gisData.zoning,
      zoning_description: zoningInfo.description,
      adu_eligible: zoningInfo.aduEligible,
      max_adu_sqft: zoningInfo.maxAduSqft,
      adu_notes: zoningInfo.notes,
      lot_size_sqft: gisData.lot_size_sqft,
      year_built: gisData.year_built,
    },
  })
}
