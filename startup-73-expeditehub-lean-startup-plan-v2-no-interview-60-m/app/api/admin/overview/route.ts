import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthed } from '@/lib/admin-auth'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET /api/admin/overview
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = db()

  const [projects, pros, quotes, leads, files, auditLog] = await Promise.all([
    supabase.from('projects').select('id, address, status, packet_status, autofill_score, created_at, homeowner_email, proposed_adu_type, zoning').order('created_at', { ascending: false }).limit(50),
    supabase.from('pros').select('id, name, email, specialty, status, license_number, zip, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('quotes').select('id, project_id, pro_name, pro_email, quote_amount, status, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('leads').select('id, email, project_type, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('project_files').select('id, project_id, file_name, file_type, file_size, created_at, uploaded_by').order('created_at', { ascending: false }).limit(50),
    supabase.from('audit_log').select('id, created_at, actor_email, actor_role, action, entity_type, entity_id, meta').order('created_at', { ascending: false }).limit(100),
  ])

  return NextResponse.json({
    projects: projects.data ?? [],
    pros:     pros.data ?? [],
    quotes:   quotes.data ?? [],
    leads:    leads.data ?? [],
    files:    files.data ?? [],
    audit_log: auditLog.data ?? [],
    stats: {
      projects:      (projects.data ?? []).length,
      projects_with_packet: (projects.data ?? []).filter(p => p.packet_status === 'draft_ready').length,
      pros_pending:  (pros.data ?? []).filter(p => p.status === 'pending').length,
      pros_active:   (pros.data ?? []).filter(p => p.status === 'active').length,
      quotes:        (quotes.data ?? []).length,
      leads:         (leads.data ?? []).length,
    },
  })
}
