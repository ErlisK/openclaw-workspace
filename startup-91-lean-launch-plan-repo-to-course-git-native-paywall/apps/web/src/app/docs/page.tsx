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
    desc: 'Full reference for the teachrepo CLI tool — init, import, deploy, and more.',
    icon: '⌨️',
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
    desc: 'Understand TeachRepo\'s pricing tiers, revenue share, and paywall mechanics.',
    icon: '💰',
  },
  {
    href: '/docs/self-hosting',
    title: 'Self-Hosting Guide',
    desc: 'Deploy TeachRepo on your own infrastructure with full control.',
    icon: '🖥️',
  },
];

export default function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700">
          Documentation
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Build with TeachRepo
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Everything you need to convert your GitHub repo or Markdown notes into a
          paywalled, versioned course site — in minutes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:border-violet-200 hover:shadow-md transition-all"
          >
            <div className="mb-3 text-3xl">{s.icon}</div>
            <h2 className="mb-1 font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
              {s.title}
            </h2>
            <p className="text-sm text-gray-500">{s.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-violet-50 p-8 text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-900">Ready to launch?</h2>
        <p className="mb-6 text-gray-600">
          Deploy your first course in minutes. No credit card required.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="/auth/signup"
            className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Start for Free
          </a>
          <a
            href="/docs/quickstart"
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Read the Docs
          </a>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          Questions?{' '}
          <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
            hello@teachrepo.com
          </a>
        </p>
      </div>
    </div>
  );
}
