/**
 * GET  /api/help?category=&search=
 * GET  /api/help?slug=<slug>
 * POST /api/help/rate  { slug, helpful: bool }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getHelpArticles,
  getHelpArticle,
  searchHelpArticles,
  rateArticle,
  HELP_CATEGORIES,
} from "@/lib/help-center";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const search = req.nextUrl.searchParams.get("search");
  const category = req.nextUrl.searchParams.get("category") ?? undefined;

  if (slug) {
    const article = await getHelpArticle(slug);
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, article });
  }

  if (search && search.length >= 2) {
    const results = await searchHelpArticles(search);
    return NextResponse.json({ ok: true, results, query: search });
  }

  const articles = await getHelpArticles(category);
  const grouped: Record<string, typeof articles> = {};
  for (const a of articles) {
    grouped[a.category] = grouped[a.category] ?? [];
    grouped[a.category].push(a);
  }

  return NextResponse.json({
    ok: true,
    categories: HELP_CATEGORIES,
    articles,
    grouped,
    total: articles.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { slug?: string; helpful?: boolean };
  if (!body.slug || body.helpful === undefined) {
    return NextResponse.json({ error: "slug and helpful required" }, { status: 400 });
  }
  await rateArticle(body.slug, body.helpful);
  return NextResponse.json({ ok: true });
}
