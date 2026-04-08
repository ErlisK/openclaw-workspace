import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET: integrations dashboard data
export async function GET(_req: NextRequest) {
  const db = sb()

  const [
    { data: ssoProviders },
    { data: cmsJobs },
    { data: retractions },
    { data: livingCitations },
    { data: cronJobs },
    { data: exportTemplates },
  ] = await Promise.all([
    db.from('cc_sso_providers').select('*').order('created_at', { ascending: false }),
    db.from('cc_cms_export_jobs').select('*').order('created_at', { ascending: false }).limit(20),
    db.from('cc_retraction_checks').select('*').order('last_checked', { ascending: false }),
    db.from('cc_living_citations').select('*').order('last_validated', { ascending: false }),
    db.from('cc_cron_jobs').select('*').order('name'),
    db.from('cc_export_templates').select('id,name,target_system,format,compliance_pack,version,active').order('target_system'),
  ])

  const retracted = retractions?.filter(r => r.retracted) || []
  const eoc = retractions?.filter(r => r.expression_of_concern) || []
  const verdictChanged = livingCitations?.filter(c => c.verdict_changed) || []
  const activeCrons = cronJobs?.filter(c => c.enabled) || []

  return NextResponse.json({
    sso: {
      providers: ssoProviders || [],
      count: ssoProviders?.length || 0,
      tested: ssoProviders?.filter(p => p.tested_at).length || 0,
    },
    exports: {
      jobs: cmsJobs || [],
      templates: exportTemplates || [],
      done: cmsJobs?.filter(j => j.status === 'done').length || 0,
      processing: cmsJobs?.filter(j => j.status === 'processing').length || 0,
    },
    retraction: {
      monitored: retractions?.length || 0,
      retracted: retracted.length,
      expressionOfConcern: eoc.length,
      clean: (retractions?.length || 0) - retracted.length - eoc.length,
      items: retractions || [],
    },
    livingCitations: {
      total: livingCitations?.length || 0,
      verdictChanged: verdictChanged.length,
      alertsSent: livingCitations?.filter(c => c.alert_sent).length || 0,
      items: livingCitations || [],
    },
    cron: {
      total: cronJobs?.length || 0,
      active: activeCrons.length,
      jobs: cronJobs || [],
    },
  })
}
