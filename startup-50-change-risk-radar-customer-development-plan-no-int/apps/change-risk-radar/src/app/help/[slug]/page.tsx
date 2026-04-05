import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHelpArticle, getHelpArticles, HELP_CATEGORIES } from "@/lib/help-center";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const article = await getHelpArticle(slug);
  if (!article) return { title: "Not Found" };
  return {
    title: `${article.title} — Help Center`,
    description: article.excerpt ?? undefined,
  };
}

export default async function HelpArticlePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const [article, allArticles] = await Promise.all([
    getHelpArticle(slug),
    getHelpArticles(),
  ]);

  if (!article) notFound();

  const catInfo = HELP_CATEGORIES.find(c => c.id === article.category);
  const relatedArticles = allArticles
    .filter(a => a.category === article.category && a.slug !== article.slug)
    .slice(0, 3);

  function renderMarkdown(md: string): string {
    return md
      .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-800 mt-6 mb-3">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/```\n?([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4">$1</pre>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-indigo-600 hover:underline">$1</a>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-700">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-gray-700 mb-4">');
  }

  const htmlContent = renderMarkdown(article.content);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/help" className="hover:text-indigo-600">Help Center</Link>
          <span>›</span>
          <Link href={`/help?category=${article.category}`} className="hover:text-indigo-600">
            {catInfo?.emoji} {catInfo?.label ?? article.category}
          </Link>
          <span>›</span>
          <span className="text-gray-800 font-medium truncate">{article.title}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <article className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="mb-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                  {catInfo?.emoji} {catInfo?.label ?? article.category}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>
              {article.excerpt && (
                <p className="text-lg text-gray-500 mb-6 pb-6 border-b border-gray-100">
                  {article.excerpt}
                </p>
              )}
              <div
                className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: `<p class="text-gray-700 mb-4">${htmlContent}</p>` }}
              />
              <div className="mt-10 pt-6 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Was this article helpful?</p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                    👍 Yes ({article.helpful_count})
                  </button>
                  <button className="px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                    👎 No ({article.not_helpful_count})
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {relatedArticles.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Related Articles</h3>
                <ul className="space-y-2">
                  {relatedArticles.map(a => (
                    <li key={a.slug}>
                      <Link href={`/help/${a.slug}`} className="text-sm text-indigo-600 hover:underline leading-snug block">
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Need more help?</h3>
              <p className="text-xs text-gray-600 mb-3">Our team responds within 4 business hours.</p>
              <Link
                href="/support/new"
                className="block text-center text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Contact Support
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/status" className="text-gray-600 hover:text-indigo-600">🟢 System Status</Link></li>
                <li><Link href="/pricing" className="text-gray-600 hover:text-indigo-600">💳 Pricing</Link></li>
                <li><Link href="/legal/dpa" className="text-gray-600 hover:text-indigo-600">📋 DPA / GDPR</Link></li>
                <li><Link href="/pilot/security" className="text-gray-600 hover:text-indigo-600">🔒 Security Pack</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
