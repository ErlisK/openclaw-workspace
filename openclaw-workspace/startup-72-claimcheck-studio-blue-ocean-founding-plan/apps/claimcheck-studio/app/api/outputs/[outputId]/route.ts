import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ChannelOutputResult } from '@/lib/channel-generator'

/**
 * GET /api/outputs/[outputId]              — get a specific output
 * GET /api/outputs/[outputId]?format=md    — Markdown download
 * GET /api/outputs/[outputId]?format=txt   — plain text download
 * GET /api/outputs/[outputId]?format=html  — HTML download
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ outputId: string }> }
) {
  const { outputId } = await params
  const format = request.nextUrl.searchParams.get('format')

  const { data, error } = await getSupabaseAdmin()
    .from('generated_outputs')
    .select('*')
    .eq('id', outputId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Output not found' }, { status: 404 })

  const content = (data.content || '') as string
  const meta = (data.cms_metadata || {}) as { title?: string; slug?: string }
  const slug = meta.slug || outputId.slice(0, 8)
  const generatedAt = (data.generated_at || new Date().toISOString() as string).slice(0, 10)

  if (format === 'txt') {
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="citebundle_${data.format}_${slug}_${generatedAt}.txt"`,
      },
    })
  }

  if (format === 'md') {
    const md = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<[^>]+>/g, '')
    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="citebundle_${data.format}_${slug}_${generatedAt}.md"`,
      },
    })
  }

  if (format === 'html') {
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="citebundle_${data.format}_${slug}_${generatedAt}.html"`,
      },
    })
  }

  // Default: JSON response
  return NextResponse.json({ output: data })
}
