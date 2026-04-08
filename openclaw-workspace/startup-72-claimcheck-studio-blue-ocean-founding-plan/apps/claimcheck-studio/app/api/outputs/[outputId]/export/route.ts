import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { exportToWordPress, exportToWebflow, exportToContentful, type ChannelOutputResult, type WordPressExportConfig, type WebflowExportConfig, type ContentfulExportConfig } from '@/lib/channel-generator'

/**
 * POST /api/outputs/[outputId]/export
 *
 * Body: { cmsType: 'wordpress'|'webflow'|'contentful'|'json'|'markdown', config: {...} }
 *
 * CMS config shapes:
 *   wordpress:  { siteUrl, username, password, status? }
 *   webflow:    { apiToken, collectionId, siteId }
 *   contentful: { spaceId, accessToken, contentTypeId, environment? }
 *   json/markdown: no config needed — returns file
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ outputId: string }> }
) {
  const { outputId } = await params
  const body = await request.json() as {
    cmsType: 'wordpress' | 'webflow' | 'contentful' | 'json' | 'markdown'
    config?: WordPressExportConfig | WebflowExportConfig | ContentfulExportConfig
  }

  const { cmsType, config } = body
  if (!cmsType) return NextResponse.json({ error: 'cmsType required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Fetch the output
  const { data: outputRow, error } = await supabase
    .from('generated_outputs')
    .select('*')
    .eq('id', outputId)
    .single()

  if (error || !outputRow) return NextResponse.json({ error: 'Output not found' }, { status: 404 })

  // Reconstruct ChannelOutputResult from stored row
  const output: ChannelOutputResult = {
    outputId: outputRow.id,
    sessionId: outputRow.session_id,
    format: outputRow.format,
    readingLevel: outputRow.reading_level,
    territory: outputRow.territory,
    content: outputRow.content || '',
    disclaimer: outputRow.disclaimer || '',
    fullOutput: outputRow.content || '',
    wordCount: outputRow.word_count || 0,
    tweetCount: outputRow.tweet_count || undefined,
    citationBundle: outputRow.citation_bundle || [],
    claimsUsed: outputRow.claim_ids || [],
    generatedAt: outputRow.generated_at,
    model: outputRow.model || 'claude-haiku-4-5',
    tokensUsed: outputRow.tokens_used || 0,
    cmsMetadata: outputRow.cms_metadata || {},
  }

  let exportResult: Record<string, unknown> = {}

  try {
    switch (cmsType) {
      case 'json': {
        exportResult = {
          cmsType: 'json',
          exported: true,
          data: output,
        }
        break
      }

      case 'markdown': {
        const md = output.content
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<[^>]+>/g, '')
        exportResult = { cmsType: 'markdown', exported: true, markdown: md }
        break
      }

      case 'wordpress': {
        if (!config) return NextResponse.json({ error: 'WordPress config required: { siteUrl, username, password }' }, { status: 400 })
        const wpResult = await exportToWordPress(output, config as WordPressExportConfig)
        exportResult = { cmsType: 'wordpress', exported: true, ...wpResult }
        break
      }

      case 'webflow': {
        if (!config) return NextResponse.json({ error: 'Webflow config required: { apiToken, collectionId, siteId }' }, { status: 400 })
        const wfResult = await exportToWebflow(output, config as WebflowExportConfig)
        exportResult = { cmsType: 'webflow', exported: true, ...wfResult }
        break
      }

      case 'contentful': {
        if (!config) return NextResponse.json({ error: 'Contentful config required: { spaceId, accessToken, contentTypeId }' }, { status: 400 })
        const cfResult = await exportToContentful(output, config as ContentfulExportConfig)
        exportResult = { cmsType: 'contentful', exported: true, ...cfResult }
        break
      }

      default:
        return NextResponse.json({ error: `Unknown cmsType: ${cmsType}` }, { status: 400 })
    }

    // Log export to cms_exports table
    await supabase.from('cms_exports').insert({
      output_id: outputId,
      session_id: outputRow.session_id,
      cms_type: cmsType,
      status: 'success',
      external_id: (exportResult.postId || exportResult.itemId || exportResult.entryId || null) as string | null,
      external_url: (exportResult.postUrl || exportResult.slug || null) as string | null,
      export_config: config || {},
      exported_at: new Date().toISOString(),
    })

    return NextResponse.json({ ...exportResult, outputId })

  } catch (err) {
    // Log failure
    await supabase.from('cms_exports').insert({
      output_id: outputId,
      session_id: outputRow.session_id,
      cms_type: cmsType,
      status: 'error',
      error_message: String(err),
      export_config: config || {},
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/outputs/[outputId]/export — list export history
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ outputId: string }> }
) {
  const { outputId } = await params
  const { data, error } = await getSupabaseAdmin()
    .from('cms_exports')
    .select('*')
    .eq('output_id', outputId)
    .order('exported_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exports: data || [] })
}
