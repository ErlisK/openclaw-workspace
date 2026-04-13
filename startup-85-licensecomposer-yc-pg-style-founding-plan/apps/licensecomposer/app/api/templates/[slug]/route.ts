/**
 * app/api/templates/[slug]/route.ts
 * GET /api/templates/:slug
 * Returns full template metadata including clauses and wizard questions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;

  // Validate slug — alphanumeric + hyphens only
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const svc = createServiceClient();

  const { data: template, error } = await svc
    .from('templates')
    .select(`
      id, slug, name, description, document_type, tier, price_cents,
      tags, jurisdictions, platforms, lawyer_reviewed, is_featured,
      current_version, is_active
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Fetch wizard questions for this template
  const { data: wizardQuestions } = await svc
    .from('wizard_questions')
    .select('id, key, label, question_type, options, is_required, sort_order, help_text')
    .eq('template_id', template.id)
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    template: {
      ...template,
      isPremium: template.tier === 'premium',
      priceDollars: (template.price_cents ?? 0) / 100,
      wizardQuestions: wizardQuestions ?? [],
    },
  });
}
