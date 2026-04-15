import { NextResponse } from 'next/server'
import { JOB_TEMPLATES, getTemplate, getTemplatesByTier } from '@/lib/templates/job-templates'
import type { JobTier } from '@/lib/types'

/**
 * GET /api/templates
 * Public — no auth required.
 * Query params:
 *   ?tier=quick|standard|deep   — filter by compatible tier
 *   ?category=Authentication    — filter by category
 *   ?id=tpl_signup_auth         — get single template
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const tier = url.searchParams.get('tier') as JobTier | null
  const category = url.searchParams.get('category')
  const id = url.searchParams.get('id')

  // Single template lookup
  if (id) {
    const tpl = getTemplate(id)
    if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    return NextResponse.json({ template: tpl })
  }

  // Filtered list
  let templates = tier ? getTemplatesByTier(tier) : JOB_TEMPLATES
  if (category) {
    templates = templates.filter(t => t.category === category)
  }

  return NextResponse.json({
    templates,
    total: templates.length,
    categories: [...new Set(JOB_TEMPLATES.map(t => t.category))],
  })
}
