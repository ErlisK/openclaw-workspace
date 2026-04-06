import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * GET /api/templates?project_id=...
 * List templates for a project (designer-authenticated).
 * 
 * POST /api/templates
 * Create a new session template.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  let query = supabase
    .from('session_templates')
    .select('*')
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    project_id, name, description, duration_minutes, max_testers,
    roles, timing_blocks, scripted_tasks,
    pre_survey_schema, post_survey_schema, is_default,
  } = body

  if (!project_id || !name) {
    return NextResponse.json({ error: 'project_id and name required' }, { status: 400 })
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .eq('designer_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data, error } = await supabase.from('session_templates').insert({
    project_id,
    designer_id: user.id,
    name,
    description: description ?? null,
    duration_minutes: duration_minutes ?? 90,
    max_testers: max_testers ?? 6,
    roles: roles ?? [],
    timing_blocks: timing_blocks ?? [],
    scripted_tasks: scripted_tasks ?? [],
    pre_survey_schema: pre_survey_schema ?? DEFAULT_PRE_SURVEY,
    post_survey_schema: post_survey_schema ?? DEFAULT_POST_SURVEY,
    is_default: is_default ?? false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, template: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name','description','duration_minutes','max_testers','roles',
    'timing_blocks','scripted_tasks','pre_survey_schema','post_survey_schema','is_default']

  const patch = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  )

  // Bump version on content changes
  if (patch.roles || patch.timing_blocks || patch.scripted_tasks) {
    patch.version = supabase.rpc as any  // placeholder — handled via SQL below
  }

  const { data, error } = await supabase
    .from('session_templates')
    .update({ ...patch, version: (updates.version ?? 1) + 1 })
    .eq('id', id)
    .eq('designer_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, template: data })
}

// ─── Default survey schemas ────────────────────────────────────────────────────

const DEFAULT_PRE_SURVEY = [
  {
    id: 'experience_level',
    question: 'How experienced are you with tabletop games?',
    type: 'rating',
    options: ['Beginner', 'Casual', 'Experienced', 'Expert'],
    required: true,
  },
  {
    id: 'familiar_with_genre',
    question: 'Are you familiar with this type of game?',
    type: 'boolean',
    required: false,
  },
  {
    id: 'preferred_role',
    question: 'Do you have a preferred role or playstyle?',
    type: 'text',
    required: false,
  },
  {
    id: 'device_type',
    question: 'What device will you use?',
    type: 'multi_select',
    options: ['Laptop/Desktop', 'iPad/Tablet', 'Phone', 'Multiple'],
    required: false,
  },
  {
    id: 'accessibility_needs',
    question: 'Any accessibility needs we should know about?',
    type: 'text',
    required: false,
  },
]

const DEFAULT_POST_SURVEY = [
  {
    id: 'overall_rating',
    question: 'Overall, how was your experience?',
    type: 'rating',
    scale: 5,
    required: true,
  },
  {
    id: 'clarity_rating',
    question: 'How clear and easy to understand were the rules?',
    type: 'rating',
    scale: 5,
    required: false,
  },
  {
    id: 'fun_rating',
    question: 'How fun did you find the game?',
    type: 'rating',
    scale: 5,
    required: false,
  },
  {
    id: 'would_play_again',
    question: 'Would you play this game again?',
    type: 'boolean',
    required: false,
  },
  {
    id: 'confusion_areas',
    question: 'Where did you get confused or stuck? (one per line)',
    type: 'text',
    required: false,
  },
  {
    id: 'suggested_changes',
    question: 'What would you change or improve?',
    type: 'text',
    required: false,
  },
  {
    id: 'most_enjoyed',
    question: 'What did you enjoy most?',
    type: 'text',
    required: false,
  },
  {
    id: 'time_played_minutes',
    question: 'About how long did you play? (minutes)',
    type: 'number',
    required: false,
  },
]
