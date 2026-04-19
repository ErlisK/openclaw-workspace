import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find TeachRepo on Social — TeachRepo',
  description: 'Follow TeachRepo on GitHub, LinkedIn, and X/Twitter. Get updates on new courses, platform features, and the git-native course platform.',
};

const channels = [
  {
    name: 'GitHub',
    handle: '@ErlisK/teachrepo',
    url: 'https://github.com/ErlisK/teachrepo',
    icon: '⚡',
    color: 'bg-gray-900',
    description: 'Source code, issues, and releases. Star us to follow updates.',
    cta: 'Star on GitHub',
  },
  {
    name: 'X / Twitter',
    handle: '@TeachRepoHQ',
    url: 'https://twitter.com/TeachRepoHQ',
    icon: '𝕏',
    color: 'bg-black',
    description: 'Launch threads, build-in-public updates, and tips on shipping technical courses.',
    cta: 'Follow on X',
  },
  {
    name: 'LinkedIn',
    handle: 'TeachRepo',
    url: 'https://www.linkedin.com/company/teachrepo',
    icon: 'in',
    color: 'bg-blue-700',
    description: 'Product announcements and creator success stories.',
    cta: 'Follow on LinkedIn',
  },
  {
    name: 'Blog',
    handle: 'teachrepo.com/blog',
    url: '/blog',
    icon: '✍️',
    color: 'bg-violet-600',
    description: 'In-depth posts on the platform, git-native education, and lessons learned building in public.',
    cta: 'Read the blog',
  },
];

const launchThread = [
  {
    n: 1,
    text: `🚀 Launching TeachRepo today — turn any GitHub repo into a paywalled course in minutes.

Here's what we built and why: 🧵`,
  },
  {
    n: 2,
    text: `The problem: engineers who want to sell technical courses have two bad options:

❌ Platform lock-in (Teachable, Gumroad) — 10–30% cuts, WYSIWYG editors, no code support
❌ Hand-roll everything (SSG + Stripe + auth) — a weekend project that takes three weeks`,
  },
  {
    n: 3,
    text: `The solution: treat course content exactly like code.

✅ Write lessons in Markdown
✅ Configure pricing in YAML  
✅ Git push → course deployed
✅ Stripe checkout already wired up`,
  },
  {
    n: 4,
    text: `Key features we shipped:

📝 Markdown-native authoring (lessons live alongside your code)
💳 Stripe checkout, zero config
🧪 Auto-graded quizzes via YAML frontmatter
🔐 Gated StackBlitz sandboxes unlock on purchase
🔗 Built-in affiliate/ref tracking
📚 Git-versioned — every push = course update`,
  },
  {
    n: 5,
    text: `Pricing:

Free tier: self-host on your own Vercel, keep 100% of revenue. No platform fee. No strings.

Hosted: $19/mo + 5% on sales. Marketplace listing + analytics included.

We eat our own cooking — teachrepo.com is self-hosted on our own infra.`,
  },
  {
    n: 6,
    text: `Two free sample courses live today on the marketplace:

📘 Git for Engineers — master the workflows used at top teams
⚙️ GitHub Actions for Engineers — CI/CD automation

No signup required for the first lesson.

👉 teachrepo.com/marketplace`,
  },
  {
    n: 7,
    text: `We've got 600+ Playwright E2E tests keeping the platform stable.

The entire codebase is open on GitHub: github.com/ErlisK/teachrepo

Star us if you're interested in the build-in-public journey. More updates coming. 🙏`,
  },
];

export default function SocialPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <h1 className="text-3xl font-black text-gray-900 mb-2">Follow TeachRepo</h1>
        <p className="text-gray-500 mb-12">We build in public. Follow along wherever you hang out.</p>

        {/* Channels */}
        <div className="grid gap-4 sm:grid-cols-2 mb-16">
          {channels.map((c) => (
            <a
              key={c.name}
              href={c.url}
              target={c.url.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="group rounded-2xl border border-gray-100 bg-white p-5 hover:border-violet-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${c.color} text-white text-xs font-bold flex items-center justify-center`}>
                  {c.icon}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.handle}</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{c.description}</p>
              <span className="text-xs font-semibold text-violet-600 group-hover:underline">{c.cta} →</span>
            </a>
          ))}
        </div>

        {/* Launch thread */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Launch Thread</h2>
          <p className="text-sm text-gray-400 mb-8">Our X/Twitter launch thread — published on launch day.</p>
        </div>
        <div className="space-y-4">
          {launchThread.map((tweet) => (
            <div key={tweet.n} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  T
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">TeachRepo</span>
                    <span className="text-xs text-gray-400">@TeachRepoHQ</span>
                    <span className="text-xs text-gray-300">· {tweet.n}/{launchThread.length}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{tweet.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* LinkedIn post */}
        <div className="mt-16">
          <h2 className="text-xl font-bold text-gray-900 mb-1">LinkedIn Launch Post</h2>
          <p className="text-sm text-gray-400 mb-6">Published on launch day.</p>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center">in</div>
              <div>
                <div className="text-sm font-semibold text-gray-900">TeachRepo</div>
                <div className="text-xs text-gray-400">linkedin.com/company/teachrepo</div>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{`Today we're launching TeachRepo — a Git-native course platform for engineers.

The problem we were solving: selling a technical course meant fighting drag-and-drop UIs or paying 30% platform fees, or hand-rolling everything from scratch.

TeachRepo is the tool we wished existed: write lessons in Markdown, push to GitHub, get a Stripe-powered course site — deployed automatically.

Key features:
• Markdown-native lesson authoring  
• Stripe checkout built in (zero config)
• Auto-graded quizzes via YAML frontmatter  
• Gated code sandbox embeds  
• Git-versioned course content  
• Free tier: self-host, keep 100% revenue  

Two free sample courses are live today. No signup required for the first lesson.

👉 https://teachrepo.com

#buildinpublic #developertools #edtech #startups #github`}</p>
          </div>
        </div>

        {/* GitHub */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Open Source</h3>
          <p className="text-sm text-gray-600 mb-4">
            The TeachRepo codebase is public on GitHub. Open issues, fork it, or follow along as we build in public.
          </p>
          <a
            href="https://github.com/ErlisK/teachrepo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
          >
            ⭐ Star on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
