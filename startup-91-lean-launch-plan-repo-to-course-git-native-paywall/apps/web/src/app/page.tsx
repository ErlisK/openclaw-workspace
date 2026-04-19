import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TeachRepo — Turn your GitHub repo into a paywalled course',
  description:
    'Write lessons in Markdown, define quizzes in YAML, deploy with git push. Accept payments with Stripe in under 15 minutes.',
  alternates: { canonical: 'https://teachrepo.com' },
  openGraph: {
    title: 'TeachRepo — Git-native course platform for engineers',
    description:
      'Convert any GitHub repo or Markdown notes into a paywalled, versioned mini-course. Free to self-host.',
    url: 'https://teachrepo.com',
    siteName: 'TeachRepo',
    type: 'website',
    images: [{ url: 'https://teachrepo.com/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TeachRepo — Git-native course platform',
    description: 'Markdown in, paywalled course out. Deploy with git push.',
    images: ['https://teachrepo.com/og-default.png'],
  },
};

// Icons for demo courses by index
const COURSE_ICONS = ['🌿', '⚙️', '🚀', '📦', '🔐', '🧪'];

const FEATURES = [
  {
    icon: '📝',
    title: 'Markdown-first',
    desc: 'Write lessons in plain Markdown or MDX. Frontmatter controls order, access, and quiz links.',
  },
  {
    icon: '🔒',
    title: 'Built-in paywall',
    desc: 'Stripe Checkout handles payments. Lesson access is enforced server-side — no client tricks.',
  },
  {
    icon: '🧪',
    title: 'Auto-graded quizzes',
    desc: 'Define quizzes in YAML. Multiple-choice, true/false, short-answer. AI generation in one click.',
  },
  {
    icon: '🔀',
    title: 'Git-native versioning',
    desc: 'Every import creates a version snapshot. Roll back or publish updates with a single push.',
  },
  {
    icon: '📊',
    title: 'Analytics & affiliates',
    desc: 'Track signups, completions, and revenue. Give affiliates referral links with configurable commissions.',
  },
  {
    icon: '🖥️',
    title: 'Self-hostable',
    desc: '0% platform fee on the OSS tier. Deploy on your own Vercel + Supabase in under 10 minutes.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Write in your repo', desc: 'Create Markdown lessons + a course.yml file anywhere in your repo.' },
  { step: '2', title: 'Import via CLI or dashboard', desc: 'Run `teachrepo import` or paste your GitHub URL in the dashboard.' },
  { step: '3', title: 'Set a price', desc: 'Free, $9, $99 — set price_cents in course.yml. Stripe does the rest.' },
  { step: '4', title: 'Publish and share', desc: 'Hit publish. Your course page is live on teachrepo.com with a shareable URL.' },
];

export default async function HomePage() {
  // Fetch top 2 published courses for demo section
  const serviceSupa = createServiceClient();
  const { data: rawCourses } = await serviceSupa
    .from('courses')
    .select('id, slug, title, description, price_cents, lessons(id, is_preview)')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(2);

  const demoCourses = (rawCourses ?? []).map((c, i) => {
    const lessons = (c.lessons as { id: string; is_preview: boolean }[]) ?? [];
    return {
      slug: c.slug,
      title: c.title,
      description: c.description ?? '',
      lessonCount: lessons.length,
      freeLessons: lessons.filter((l) => l.is_preview).length,
      isFree: c.price_cents === 0,
      icon: COURSE_ICONS[i % COURSE_ICONS.length],
    };
  });
  return (
    <main className="flex min-h-screen flex-col">

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="/" className="text-lg font-bold text-violet-600">📚 TeachRepo</a>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <a href="/marketplace" className="hover:text-gray-900">Marketplace</a>
            <a href="/docs" className="hover:text-gray-900">Docs</a>
            <a href="/pricing" className="hover:text-gray-900">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/auth/login" className="text-sm font-medium text-gray-700 hover:text-violet-600">Sign in</a>
            <a href="/auth/signup" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Get started</a>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center bg-gradient-to-b from-white to-violet-50">
        <div className="max-w-4xl">
          <div className="mb-6 inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
            🚀 Now in beta — <a href="/auth/signup" className="ml-1 underline font-semibold">Get early access</a>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl leading-tight">
            Turn your{' '}
            <span className="text-violet-600">GitHub repo</span>
            {' '}into a paywalled course
          </h1>

          <p className="mb-10 text-xl text-gray-600 max-w-2xl mx-auto">
            Write lessons in Markdown. Define quizzes in YAML frontmatter. Deploy with{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-base">git push</code>.
            Accept payments with Stripe. Done in under 15 minutes.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/auth/signup"
              className="inline-flex items-center rounded-lg bg-violet-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-violet-700 transition-colors"
            >
              Start for free →
            </a>
            <a
              href="#demo-courses"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Try a free demo lesson
            </a>
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Self-hostable · Free tier · No lock-in · <a href="mailto:hello@teachrepo.com" className="underline">hello@teachrepo.com</a>
          </p>
        </div>
      </section>

      {/* ── Demo Courses ──────────────────────────────────────────────────── */}
      <section id="demo-courses" className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">Live demo</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
            Try free lessons right now
          </h2>
          <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">
            These courses were built with TeachRepo itself — Markdown files, YAML quizzes, Stripe paywall. No signup needed for free lessons.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {demoCourses.map((course) => (
              <a
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="group flex flex-col rounded-2xl border border-gray-200 p-6 hover:border-violet-300 hover:shadow-md transition-all bg-white"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{course.icon}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${course.isFree ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700'}`}>
                    {course.isFree ? 'Free course' : 'Paid course'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-violet-700 mb-2">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 flex-1 mb-4">{course.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>📚 {course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''}</span>
                  {course.freeLessons > 0 && <span>🆓 {course.freeLessons} free</span>}
                </div>
                <div className="mt-4 text-sm font-medium text-violet-600 group-hover:text-violet-800">
                  Start learning →
                </div>
              </a>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a href="/marketplace" className="text-sm text-gray-500 hover:text-violet-600 underline">
              Browse all courses in the marketplace →
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">How it works</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            From repo to revenue in 15 minutes
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">Features</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Everything a technical creator needs
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-100 p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-violet-600 text-white text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to ship your course?</h2>
          <p className="text-violet-200 mb-8 text-lg">
            Free tier available. No credit card required to start.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/auth/signup"
              className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-violet-700 hover:bg-violet-50 transition-colors"
            >
              Create your account →
            </a>
            <a
              href="/docs/quickstart"
              className="rounded-lg border border-violet-400 px-6 py-3 text-base font-medium text-white hover:bg-violet-700 transition-colors"
            >
              Read the docs
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-10 bg-gray-900 text-gray-400 text-sm">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-semibold text-white">TeachRepo</div>
          <nav className="flex flex-wrap gap-6 justify-center">
            <a href="/marketplace" className="hover:text-white">Marketplace</a>
            <a href="/docs" className="hover:text-white">Docs</a>
            <a href="/pricing" className="hover:text-white">Pricing</a>
            <a href="/docs/self-hosting" className="hover:text-white">Self-Hosting</a>
            <a href="/legal/terms" className="hover:text-white">Terms</a>
            <a href="/legal/privacy" className="hover:text-white">Privacy</a>
            <a href="mailto:hello@teachrepo.com" className="hover:text-white">Contact</a>
          </nav>
          <div className="text-xs text-gray-600">&copy; {new Date().getFullYear()} TeachRepo. All rights reserved.</div>
        </div>
      </footer>

    </main>
  );
}
