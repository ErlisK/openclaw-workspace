import { Metadata } from "next";
import Link from "next/link";
import { getHelpArticles, HELP_CATEGORIES } from "@/lib/help-center";

export const metadata: Metadata = {
  title: "Help Center — Change Risk Radar",
  description: "Guides, tutorials, and answers for Change Risk Radar users.",
};

export const dynamic = "force-dynamic";

export default async function HelpCenterPage(props: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const category = searchParams.category;
  const articles = await getHelpArticles(category);

  const grouped: Record<string, typeof articles> = {};
  for (const a of articles) {
    grouped[a.category] = grouped[a.category] ?? [];
    grouped[a.category].push(a);
  }

  const displayCategories = category
    ? HELP_CATEGORIES.filter(c => c.id === category)
    : HELP_CATEGORIES;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-indigo-200 text-lg mb-8">
            Guides, tutorials, and answers for Change Risk Radar
          </p>
          {/* Search form */}
          <form action="/help" method="get" className="flex gap-3 max-w-xl mx-auto">
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Search articles..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-base outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-10">
          <Link
            href="/help"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !category
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:border-indigo-300"
            }`}
          >
            All
          </Link>
          {HELP_CATEGORIES.map(c => (
            <Link
              key={c.id}
              href={`/help?category=${c.id}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === c.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-indigo-300"
              }`}
            >
              {c.emoji} {c.label}
            </Link>
          ))}
        </div>

        {/* Articles by category */}
        {displayCategories.map(cat => {
          const catArticles = grouped[cat.id] ?? [];
          if (!catArticles.length) return null;
          return (
            <div key={cat.id} className="mb-12">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>{cat.emoji}</span> {cat.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catArticles.map(article => (
                  <Link
                    key={article.slug}
                    href={`/help/${article.slug}`}
                    className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
                    {article.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                      {article.tags.slice(0, 3).map(t => (
                        <span key={t} className="bg-gray-100 px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {articles.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-medium">No articles found</p>
            <p className="text-sm mt-2">
              Can&apos;t find what you need?{" "}
              <Link href="/support/new" className="text-indigo-600 hover:underline">
                Open a support ticket
              </Link>
            </p>
          </div>
        )}

        {/* Contact support CTA */}
        <div className="mt-12 bg-indigo-50 border border-indigo-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Still need help?</h3>
          <p className="text-gray-600 mb-5">
            Our support team typically responds within 4 business hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/support/new"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Open a Support Ticket
            </Link>
            <Link
              href="/status"
              className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:border-indigo-300 transition-colors"
            >
              Check System Status
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
