import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation — TeachRepo',
  description: 'Learn how to build and deploy Git-native paywalled courses with TeachRepo.',
};

const sections = [
  {
    href: '/docs/quickstart',
    title: 'Quickstart Guide',
    desc: 'Set up your first course from a GitHub repo in under 10 minutes.',
    icon: '🚀',
  },
  {
    href: '/docs/repo-format',
    title: 'Repo Format',
    desc: 'Directory layout, file naming conventions, and course.yml + lesson frontmatter fields.',
    icon: '📁',
  },
  {
    href: '/docs/quizzes',
    title: 'Quizzes YAML Schema',
    desc: 'Full schema for auto-graded quizzes — MCQ, true/false, short answer, and AI generation.',
    icon: '🧪',
  },
  {
    href: '/docs/cli',
    title: 'CLI Reference',
    desc: 'Full reference for @teachrepo/cli — import, validate, new, whoami. Works in CI/CD.',
    icon: '⌨️',
  },
  {
    href: '/docs/template',
    title: 'Course Template',
    desc: 'Official course template with GitHub Actions CI/CD. Clone it and ship your first course.',
    icon: '📋',
  },
  {
    href: '/docs/payments-affiliates',
    title: 'Payments & Affiliates',
    desc: 'Stripe checkout integration, pricing models, affiliate links, and commission payouts.',
    icon: '💳',
  },
  {
    href: '/docs/course-yaml',
    title: 'course.yml Reference',
    desc: 'Every field in course.yml and lesson frontmatter, explained.',
    icon: '📄',
  },
  {
    href: '/docs/pricing',
    title: 'Pricing & Billing',
    desc: "What's free forever (MIT), what's in the Creator plan ($29/mo), rev-share, and billing FAQ.",
    icon: '💰',
  },
  {
    href: '/docs/self-hosting',
    title: 'Self-Hosting Guide',
    desc: 'Deploy on Vercel, Railway, Fly.io, or Docker. Full step-by-step with Supabase + Stripe setup.',
    icon: '🖥️',
  },
  {
    href: '/docs/github-actions',
    title: 'GitHub Actions CI/CD',
    desc: 'Automate deploys, E2E tests, DB migrations, and course auto-publish on push.',
    icon: '⚙️',
  },
];

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 font-bold">
            <span className="text-xl">📚</span>
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent text-lg">TeachRepo</span>
          </a>
          <nav className="hidden sm:flex items-center gap-7 text-sm text-gray-400">
            <a href="/marketplace" className="hover:text-white transition-colors">Marketplace</a>
            <a href="/docs" className="text-white">Docs</a>
            <a href="/blog" className="hover:text-white transition-colors">Blog</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/auth/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign in</a>
            <a href="/auth/signup" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-all">Get started</a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-20 lg:px-8">
        <div className="mb-16 text-center">
          <div className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300 mb-4">
            Documentation
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">
            Build with TeachRepo
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Everything you need to turn a GitHub repo into a paywalled, versioned course site.
          </p>
        </div>

        {/* Quick start highlight */}
        <div className="mb-8">
          <Link
            href="/docs/quickstart"
            className="group flex items-center gap-5 rounded-2xl border border-violet-500/30 bg-violet-500/[0.08] p-7 hover:border-violet-500/50 hover:bg-violet-500/[0.12] transition-all duration-300"
          >
            <div className="text-4xl shrink-0">🚀</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">
                Quickstart Guide
              </h2>
              <p className="text-gray-400">Set up your first course from a GitHub repo in under 10 minutes.</p>
            </div>
            <div className="text-violet-400 group-hover:translate-x-1 transition-transform">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.slice(1).map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-violet-500/30 hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-900/20"
            >
              <div className="text-2xl mb-3">{section.icon}</div>
              <h3 className="font-semibold text-white group-hover:text-violet-300 mb-2 transition-colors">
                {section.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">{section.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-violet-400 group-hover:text-violet-300 transition-colors">
                Read docs
                <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* CLI snippet */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117]">
          <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.02] px-5 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/60"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500/60"></div>
            <div className="h-3 w-3 rounded-full bg-green-500/60"></div>
            <span className="ml-3 text-xs text-gray-600 font-mono">quick start</span>
          </div>
          <div className="p-6 font-mono text-sm leading-7 overflow-x-auto">
            <div className="text-gray-600"># Install CLI</div>
            <div className="text-emerald-400">npm install -g @teachrepo/cli</div>
            <div className="mt-3 text-gray-600"># Scaffold from template</div>
            <div className="text-emerald-400">teachrepo init my-course</div>
            <div className="mt-3 text-gray-600"># Push to GitHub → auto-publish</div>
            <div className="text-emerald-400">git push origin main</div>
          </div>
          <div className="border-t border-white/5 bg-white/[0.02] px-6 py-4 flex flex-wrap gap-5">
            <Link href="/docs/cli" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">Full CLI reference →</Link>
            <Link href="/docs/quickstart" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">Quickstart guide →</Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="font-semibold text-white">TeachRepo</div>
          <nav className="flex flex-wrap gap-6 justify-center text-gray-500">
            <a href="/marketplace" className="hover:text-gray-300 transition-colors">Marketplace</a>
            <a href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
            <a href="/blog" className="hover:text-gray-300 transition-colors">Blog</a>
            <a href="mailto:hello@teachrepo.com" className="hover:text-gray-300 transition-colors">Contact</a>
          </nav>
          <div className="text-xs text-gray-700">&copy; {new Date().getFullYear()} TeachRepo</div>
        </div>
      </footer>
    </div>
  );
}
