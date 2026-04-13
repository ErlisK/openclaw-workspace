import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })
    const orgId = member.organization_id

    const body = await req.json()
    const { application_id, section_key, section_title, content_md, word_count, word_limit, change_type, narrative_id } = body

    if (!application_id || !section_key) return NextResponse.json({ error: 'application_id and section_key required' }, { status: 400 })

    let savedNarrativeId = narrative_id

    if (narrative_id) {
      // Update existing narrative + bump version
      const { data: existing } = await admin.from('narratives').select('version, content_md').eq('id', narrative_id).single()
      const currentVersion = existing?.version || 1
      const previousContent = existing?.content_md || ''

      // Save old version to narrative_versions if content changed
      if (previousContent && previousContent !== content_md) {
        await admin.from('narrative_versions').insert({
          narrative_id,
          application_id,
          organization_id: orgId,
          section_key,
          version: currentVersion,
          content_md: previousContent,
          word_count: previousContent.split(/\s+/).filter(Boolean).length,
          change_type: change_type || 'edit',
          change_summary: `Version ${currentVersion} — ${change_type || 'edit'}`,
          created_by: user.id,
        })
      }

      // Update current narrative
      await admin.from('narratives').update({
        content_md,
        word_count: word_count || content_md.split(/\s+/).filter(Boolean).length,
        version: currentVersion + 1,
        status: change_type === 'ai_generate' ? 'draft' : 'draft',
        ai_generated: change_type === 'ai_generate',
        edited_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq('id', narrative_id)

    } else {
      // Create new narrative
      const { data: newNarrative } = await admin.from('narratives').insert({
        application_id,
        organization_id: orgId,
        section_key,
        section_title: section_title || section_key,
        content_md,
        word_count: word_count || content_md.split(/\s+/).filter(Boolean).length,
        word_limit: word_limit || null,
        version: 1,
        status: 'draft',
        ai_generated: change_type === 'ai_generate',
      }).select('id').single()
      savedNarrativeId = newNarrative?.id
    }

    // Audit log
    await admin.from('audit_log').insert({
      organization_id: orgId,
      user_id: user.id,
      event_type: change_type === 'ai_generate' ? 'ai_narrative_save' : 'narrative_edit',
      table_name: 'narratives',
      record_id: savedNarrativeId,
      metadata: { section_key, word_count, change_type },
    })

    return NextResponse.json({ id: savedNarrativeId, saved: true })
  } catch (err) {
    console.error('narrative save error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
