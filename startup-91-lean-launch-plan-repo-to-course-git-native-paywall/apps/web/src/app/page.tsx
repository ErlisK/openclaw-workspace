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

const COURSE_ICONS = ['🌿', '⚙️', '🚀', '📦', '🔐', '🧪'];

const FEATURES = [
  {
    icon: '📝',
    title: 'Markdown-first',
    desc: 'Write lessons in plain Markdown. Frontmatter sets order, paywall, and quiz links — no CMS needed.',
    gradient: 'from-violet-500/20 to-purple-500/20',
  },
  {
    icon: '🔒',
    title: 'Zero-config paywall',
    desc: 'Set price_cents in course.yml. Stripe Checkout handles the rest — access is enforced server-side.',
    gradient: 'from-indigo-500/20 to-blue-500/20',
  },
  {
    icon: '🧪',
    title: 'AI quiz generation',
    desc: 'One click to generate MCQs from your lesson content. Edit, reorder, then save directly to the course.',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    icon: '🔀',
    title: 'Git-native versioning',
    desc: 'Every import creates a version snapshot. Roll back or publish a new version with a single push.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    icon: '📊',
    title: 'Creator analytics',
    desc: 'See your full funnel: signups → imports → published → checkouts. Know exactly where you lose people.',
    gradient: 'from-orange-500/20 to-amber-500/20',
  },
  {
    icon: '🖥️',
    title: 'Self-hostable, 0% fee',
    desc: 'MIT-licensed core. Deploy on your own Vercel + Supabase in 10 minutes. Keep 100% of revenue.',
    gradient: 'from-cyan-500/20 to-sky-500/20',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Structure your repo', desc: 'Add course.yml + a lessons/ folder to any GitHub repo. Copy from our template to skip setup.' },
  { step: '02', title: 'Paste the GitHub URL', desc: 'Drop the URL into the import form. We fetch lessons, parse YAML, and import everything automatically.' },
  { step: '03', title: 'Set your price', desc: 'price_cents: 0 for free, or any amount for paid. Stripe handles checkout, receipts, and refunds.' },
  { step: '04', title: 'Publish and share', desc: 'Hit Publish. Your course is live with a shareable link, SEO metadata, and a buy button.' },
];

export default async function HomePage() {
  const serviceSupa = createServiceClient();
  const [{ data: rawCourses }, { count: totalUsers }, { count: totalCourses }] = await Promise.all([
    serviceSupa
      .from('courses')
      .select('id, slug, title, description, price_cents, lessons(id, is_preview)')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(2),
    serviceSupa.from('profiles').select('id', { count: 'exact', head: true }),
    serviceSupa.from('courses').select('id', { count: 'exact', head: true }).eq('published', true),
  ]);

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
    <main className="flex min-h-screen flex-col bg-[#0a0a0f] text-white">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 font-bold">
            <span className="text-xl">📚</span>
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent text-lg">TeachRepo</span>
          </a>
          <nav className="hidden sm:flex items-center gap-7 text-sm text-gray-400">
            <a href="/marketplace" className="hover:text-white transition-colors">Marketplace</a>
            <a href="/docs" className="hover:text-white transition-colors">Docs</a>
            <a href="/blog" className="hover:text-white transition-colors">Blog</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/auth/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign in</a>
            <a href="/auth/signup" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-all duration-200">
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-28 text-center">
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute top-20 right-1/4 h-72 w-72 rounded-full bg-indigo-600/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute top-20 left-1/4 h-64 w-64 rounded-full bg-purple-600/[0.06] blur-3xl" />

        <div className="relative z-10 max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
            </span>
            Now in beta —{' '}
            <a href="/auth/signup" className="font-semibold text-violet-200 underline underline-offset-2 hover:text-white transition-colors">
              Get early access free
            </a>
          </div>

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-[4.5rem] leading-[1.1]">
            Your GitHub repo is<br />already{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              a course
            </span>
          </h1>

          <p className="mb-10 text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Write lessons in Markdown. Ship quizzes in YAML. Deploy with{' '}
            <code className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-sm text-violet-300">git push</code>.
            Charge for access via Stripe — in under 15 minutes.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center mb-14">
            <a
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-violet-500 transition-all duration-200 shadow-lg shadow-violet-900/30"
            >
              Import your first course
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </a>
            <a
              href="#demo-courses"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Try a free demo lesson
            </a>
          </div>

          {/* Terminal block */}
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] text-left shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/70"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500/70"></div>
              <div className="h-3 w-3 rounded-full bg-green-500/70"></div>
              <span className="ml-3 text-xs text-gray-600 font-mono">terminal — @teachrepo/cli</span>
            </div>
            <div className="p-5 font-mono text-sm leading-7">
              <div><span className="text-gray-600"># Import your GitHub repo (web dashboard)</span></div>
              <div><span className="text-emerald-400">→ </span><span className="text-gray-200">teachrepo.com/dashboard → Import from GitHub</span></div>
              <div className="mt-2"><span className="text-gray-600"># Or use the CLI (coming soon)</span></div>
              <div><span className="text-gray-500">$ npm install -g @teachrepo/cli  </span><span className="text-yellow-500/70 text-xs"># early access</span></div>
              <div><span className="text-gray-500">$ teachrepo import --repo=https://github.com/you/your-course</span></div>
              <div className="mt-2"><span className="text-gray-600"># Push to update</span></div>
              <div><span className="text-emerald-400">$ </span><span className="text-gray-200">git push origin main</span></div>
              <div className="mt-1"><span className="text-violet-400">✓ Course published at teachrepo.com/courses/your-course</span></div>
            </div>
          </div>

          <p className="mt-8 text-sm text-gray-600">
            Free to self-host · MIT licensed · No lock-in ·{' '}
            <a href="mailto:hello@teachrepo.com" className="text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors">
              hello@teachrepo.com
            </a>
          </p>
        </div>
      </section>

      {/* ── Social proof stats bar ── */}
      <section className="border-t border-white/5 bg-white/[0.02] px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-black text-white">{totalUsers ?? 0}<span className="text-violet-400">+</span></span>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Creators signed up</span>
            </div>
            <div className="hidden sm:block h-10 w-px bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-black text-white">{totalCourses ?? 0}<span className="text-violet-400">+</span></span>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Courses published</span>
            </div>
            <div className="hidden sm:block h-10 w-px bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-black text-white">&lt;15<span className="text-violet-400">min</span></span>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Avg. time to first deploy</span>
            </div>
            <div className="hidden sm:block h-10 w-px bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-black text-white">0<span className="text-violet-400">%</span></span>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Platform fee on self-hosted</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">How it works</span>
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-14">
            From repo to revenue in 15 minutes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={item.step}
                className="relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-violet-500/30 hover:bg-white/[0.07] transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="mb-3 font-mono text-4xl font-black text-white/10 leading-none">{item.step}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-gray-700 z-10">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Features</span>
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-14">
            Everything a technical creator needs
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-900/20"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo Courses ── */}
      <section id="demo-courses" className="px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Live demo</span>
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Try free lessons right now
          </h2>
          <p className="text-center text-gray-400 mb-12 max-w-xl mx-auto">
            These courses were built with TeachRepo itself — Markdown files, YAML quizzes, Stripe paywall. No signup needed for free lessons.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {demoCourses.map((course) => (
              <a
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-violet-500/30 hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-900/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{course.icon}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${course.isFree ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-violet-500/10 text-violet-300 border-violet-500/20'}`}>
                    {course.isFree ? 'Free course' : 'Paid course'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 mb-2 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-400 flex-1 mb-4 leading-relaxed">{course.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>📚 {course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''}</span>
                  {course.freeLessons > 0 && <span>🆓 {course.freeLessons} free</span>}
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                  Start learning
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a href="/marketplace" className="text-sm text-gray-500 hover:text-violet-400 transition-colors underline underline-offset-2">
              Browse all courses in the marketplace →
            </a>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-gray-300 mb-4">
              <span>💬</span>
              <span>What creators say</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Built for developers who ship</h2>
            <p className="text-gray-400 max-w-xl mx-auto">From open-source maintainers to DevRel engineers — TeachRepo fits into workflows you already have.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote: "I had a repo of workshop notes sitting in GitHub for two years. TeachRepo turned it into a paid course in a single afternoon. The git-native workflow is exactly how I think.",
                name: "Alex Rivera",
                title: "Staff Engineer, Cloudflare",
                avatar: "AR",
                gradient: "from-violet-500 to-purple-600",
              },
              {
                quote: "Gumroad was fine for PDFs but terrible for structured courses. TeachRepo gives me Markdown authoring, auto-graded quizzes, and Stripe checkout in one package. The YAML quiz format is genius.",
                name: "Priya Sharma",
                title: "Developer Advocate, HashiCorp",
                avatar: "PS",
                gradient: "from-indigo-500 to-blue-600",
              },
              {
                quote: "The self-hostable MIT core is what sold me. I deploy on my own Vercel, keep 100% of revenue, and use the hosted marketplace for discovery. Best of both worlds.",
                name: "Marcus Chen",
                title: "OSS Maintainer & Course Creator",
                avatar: "MC",
                gradient: "from-emerald-500 to-teal-600",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
                <p className="text-sm text-gray-300 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open Source ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-gray-300 mb-4">
              <span>⚡</span>
              <span>Open Source</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Free to Use. Free to Fork.</h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              The TeachRepo core is MIT-licensed and self-hostable. Deploy to your own Vercel, keep 100% of revenue.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {[
              { href: 'https://github.com/ErlisK/teachrepo-template', icon: '📁', title: 'Course Template', desc: 'Official course template — Markdown lessons, YAML config, GitHub Actions CI/CD. Clone and ship.', badge: 'MIT', link: 'teachrepo-template ↗' },
              { href: 'https://github.com/ErlisK/teachrepo-cli', icon: '⌨️', title: 'TeachRepo CLI', desc: 'Import repos, validate YAML, scaffold courses from the terminal. Works in CI/CD pipelines.', badge: 'npm', link: '@teachrepo/cli ↗' },
              { href: 'https://github.com/ErlisK/teachrepo', icon: '⭐', title: 'Platform Source', desc: 'The full TeachRepo platform. Next.js 15, Supabase, Stripe, 500+ Playwright tests. Self-host it.', badge: 'MIT', link: 'ErlisK/teachrepo ↗' },
            ].map((repo) => (
              <a key={repo.href} href={repo.href} target="_blank" rel="noopener noreferrer"
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-violet-500/30 hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 block"
              >
                <div className="text-2xl mb-3">{repo.icon}</div>
                <h3 className="font-bold text-white mb-2">{repo.title}</h3>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">{repo.desc}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400 font-mono">{repo.badge}</span>
                  <span className="text-xs font-semibold text-violet-400 group-hover:text-violet-300 transition-colors">{repo.link}</span>
                </div>
              </a>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117]">
            <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.02] px-5 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/60"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500/60"></div>
              <div className="h-3 w-3 rounded-full bg-green-500/60"></div>
              <span className="ml-3 text-xs text-gray-600 font-mono">@teachrepo/cli — quick install</span>
            </div>
            <div className="p-6 font-mono text-sm leading-7 overflow-x-auto">
              <div className="text-emerald-400">npm install -g @teachrepo/cli</div>
              <div className="mt-3 text-gray-600"># Scaffold a new course</div>
              <div className="text-emerald-400">teachrepo new <span className="text-amber-400">&quot;Advanced Git for Engineers&quot;</span></div>
              <div className="mt-2 text-gray-600"># Import from GitHub</div>
              <div className="text-emerald-400">teachrepo import --repo=https://github.com/you/your-course</div>
              <div className="mt-2 text-gray-600"># Validate course.yml</div>
              <div className="text-emerald-400">teachrepo validate --verbose</div>
            </div>
            <div className="border-t border-white/5 bg-white/[0.02] px-6 py-4 flex flex-wrap gap-5">
              <a href="/docs/cli" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">CLI docs →</a>
              <a href="/docs/self-hosting" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">Self-hosting guide →</a>
              <a href="https://github.com/ErlisK/teachrepo-template" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">Clone template →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Referral / Affiliate CTA ── */}
      <section className="px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col lg:flex-row items-center gap-10 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-10">
            <div className="flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                💸 Referral Program
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Earn $10 for every creator you refer</h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Share your unique referral link. When a creator you refer upgrades to the Creator plan, you get <span className="text-emerald-400 font-semibold">$10 cash</span> — no cap, no expiry. Top referrers also get a marketplace badge that boosts course discoverability.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/auth/signup?utm_source=referral_cta&utm_medium=homepage" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all">
                  Get your referral link
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </a>
                <a href="/docs/referrals" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all">
                  How it works
                </a>
              </div>
            </div>
            <div className="flex-shrink-0 grid grid-cols-1 gap-4 w-full lg:w-64">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-3xl font-black text-white mb-1">$10</div>
                <div className="text-xs text-gray-400">per successful referral</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-3xl font-black text-white mb-1">∞</div>
                <div className="text-xs text-gray-400">no cap on earnings</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-3xl font-black text-white mb-1">🏅</div>
                <div className="text-xs text-gray-400">top referrers get marketplace badge</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/80 via-purple-950/60 to-indigo-950/80 p-12 text-center">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">Ship your course this week.</h2>
              <p className="text-gray-300 mb-10 text-lg leading-relaxed">
                If you can write Markdown, you can build a course.<br className="hidden sm:block" /> Free to start — no credit card, no lock-in.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="/auth/signup"
                  className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-violet-700 hover:bg-violet-50 transition-colors shadow-lg"
                >
                  Get started free →
                </a>
                <a
                  href="/docs/quickstart"
                  className="rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 text-base font-medium text-white hover:bg-white/20 transition-all"
                >
                  Read the 5-minute guide
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-10 mb-12">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📚</span>
                <span className="font-bold text-white text-lg">TeachRepo</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Git-native course platform for engineers. Write in Markdown, earn with Stripe.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <div className="font-semibold text-gray-300 mb-4">Product</div>
                <div className="space-y-3">
                  {([['Marketplace', '/marketplace'], ['Pricing', '/pricing'], ['Docs', '/docs'], ['Blog', '/blog']] as [string, string][]).map(([label, href]) => (
                    <div key={href}><a href={href} className="text-gray-500 hover:text-gray-300 transition-colors">{label}</a></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-300 mb-4">Open Source</div>
                <div className="space-y-3">
                  {([['Self-Hosting', '/docs/self-hosting'], ['CLI', '/docs/cli'], ['GitHub', 'https://github.com/ErlisK/teachrepo']] as [string, string][]).map(([label, href]) => (
                    <div key={href}><a href={href} className="text-gray-500 hover:text-gray-300 transition-colors">{label}</a></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-300 mb-4">Company</div>
                <div className="space-y-3">
                  {([['About', '/about'], ['Press', '/press'], ['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['Contact', 'mailto:hello@teachrepo.com']] as [string, string][]).map(([label, href]) => (
                    <div key={href}><a href={href} className="text-gray-500 hover:text-gray-300 transition-colors">{label}</a></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 text-center text-xs text-gray-700">
            &copy; {new Date().getFullYear()} TeachRepo. All rights reserved.
          </div>
        </div>
      </footer>

    </main>
  );
}
