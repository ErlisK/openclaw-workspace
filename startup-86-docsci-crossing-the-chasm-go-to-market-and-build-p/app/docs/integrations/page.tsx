import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Integrations — DocsCI CI/CD setup guides",
  description: "Set up DocsCI with GitHub Actions, GitLab CI, and other CI platforms. Copy-paste-ready YAML templates.",
  alternates: { canonical: "https://snippetci.com/docs/integrations" },
};

const integrations = [
  { slug: "github-actions", name: "GitHub Actions", icon: "⚙️", desc: "Copy-paste YAML for basic, advanced, monorepo, and scheduled workflows." },
  { slug: "gitlab-ci", name: "GitLab CI", icon: "🦊", desc: ".gitlab-ci.yml templates with MR comment posting and nightly runs." },
];

export default function IntegrationsIndexPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="integrations-index">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm">
        <Link href="/docs" className="text-white font-bold">← Docs</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Integrations</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">Integrations</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map(i => (
            <Link key={i.slug} href={`/docs/integrations/${i.slug}`}
              className="block p-5 bg-gray-900 border border-gray-700 hover:border-indigo-600 rounded-xl transition-colors group"
              data-testid={`integration-card-${i.slug}`}>
              <div className="text-2xl mb-2">{i.icon}</div>
              <h2 className="text-white font-semibold mb-1 group-hover:text-indigo-300">{i.name}</h2>
              <p className="text-gray-400 text-sm">{i.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
