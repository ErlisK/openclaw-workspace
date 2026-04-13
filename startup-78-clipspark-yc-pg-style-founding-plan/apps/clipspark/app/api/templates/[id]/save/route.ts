import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

type Params = { params: Promise<{ id: string }> }

// POST /api/templates/[id]/save — save (or unsave) a template
export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if already saved
  const { data: existing } = await supabase
    .from('template_saves')
    .select('id')
    .eq('user_id', user.id)
    .eq('template_id', id)
    .single()

  if (existing) {
    // Unsave
    await supabase.from('template_saves').delete().eq('id', existing.id)
    // Decrement saves_count
    const { data: tmpl2 } = await supabase.from('templates').select('saves_count').eq('id', id).single()
    await supabase.from('templates').update({ saves_count: Math.max(0, (tmpl2?.saves_count || 1) - 1) }).eq('id', id)
    return NextResponse.json({ saved: false })
  } else {
    // Save
    await supabase.from('template_saves').insert({ user_id: user.id, template_id: id })
    // Increment saves_count
    const { data: tmpl } = await supabase.from('templates').select('saves_count').eq('id', id).single()
    await supabase.from('templates').update({ saves_count: (tmpl?.saves_count || 0) + 1 }).eq('id', id)

    trackServer(user.id, 'template_saved', {
      template_id: id,
    })

    return NextResponse.json({ saved: true })
  }
}
