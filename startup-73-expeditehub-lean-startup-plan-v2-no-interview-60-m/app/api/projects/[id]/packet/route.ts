import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autofillPacket } from '@/lib/autofill'
import { generatePacketPdf } from '@/lib/pdf-generator'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // 1. Fetch project
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // 2. Get existing version count
  const { count } = await supabase
    .from('project_files')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)
    .like('file_name', '%packet-draft%')

  const version = (count ?? 0) + 1

  // 3. Run autofill engine
  const gisData = project.gis_data ?? {}
  const packet = autofillPacket(id, {
    homeowner_email: project.homeowner_email ?? '',
    address: project.address ?? '',
    zip: project.zip,
    city: project.city ?? 'Austin',
    state: project.state ?? 'TX',
    proposed_adu_type: project.proposed_adu_type,
    proposed_adu_sqft: project.proposed_adu_sqft,
    has_plans: project.has_plans,
    timeline: project.timeline,
    notes: project.notes,
    lat: project.lat,
    lng: project.lng,
    parcel_id: project.parcel_id,
    zoning: project.zoning,
    lot_size_sqft: project.lot_size_sqft,
    year_built: project.year_built,
    existing_sqft: project.existing_sqft,
    adu_eligible: gisData.adu_eligible,
    max_adu_sqft: gisData.max_adu_sqft,
  }, version)

  // 4. Generate PDF
  const pdfBytes = await generatePacketPdf(packet, project.address ?? id)
  const fileName = `packet-draft-v${version}-${id.slice(0, 8)}.pdf`

  // 5. Upload PDF to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(`${id}/${fileName}`, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('PDF upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 6. Get signed URL (valid 7 days for pro preview)
  const { data: urlData } = await supabase.storage
    .from('project-files')
    .createSignedUrl(`${id}/${fileName}`, 60 * 60 * 24 * 7)

  const pdfUrl = urlData?.signedUrl ?? null

  // 7. Record file in DB
  await supabase.from('project_files').insert({
    project_id: id,
    file_name: fileName,
    file_type: 'application/pdf',
    file_size: pdfBytes.length,
    storage_path: `${id}/${fileName}`,
    public_url: pdfUrl,
    uploaded_by: 'ai',
  })

  // 8. Update project with packet data
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      packet_draft: packet,
      packet_status: 'draft_ready',
      autofill_score: packet.autofill_score,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('Project update error:', updateError)
  }

  return NextResponse.json({
    success: true,
    project_id: id,
    version,
    autofill_score: packet.autofill_score,
    fill_rate: packet.fill_rate,
    filled_required: packet.filled_required,
    total_required: packet.total_required,
    missing_fields: packet.missing_fields,
    pdf_url: pdfUrl,
    generated_at: packet.generated_at,
  })
}
