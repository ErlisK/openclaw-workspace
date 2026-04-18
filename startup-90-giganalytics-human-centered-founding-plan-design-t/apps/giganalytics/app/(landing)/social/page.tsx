import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GigAnalytics Social — Follow Us',
  description: 'Follow GigAnalytics on Twitter/X, Reddit, LinkedIn and Product Hunt. Get tips on freelance ROI, pricing experiments, and multi-income analytics.',
}

const PRODUCTION_URL = 'https://startup-90-giganalytics-human-cente.vercel.app'

const socialLinks = [
  {
    platform: 'Twitter / X',
    handle: '@giganalytics',
    icon: '🐦',
    url: 'https://x.com/giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=twitter&utm_medium=social&utm_campaign=launch`,
    color: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    status: 'pending_setup',
    description: 'Daily tips on gig ROI, pricing experiments, and true hourly rate math.',
  },
  {
    platform: 'LinkedIn',
    handle: 'GigAnalytics',
    icon: '💼',
    url: 'https://linkedin.com/company/giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=linkedin&utm_medium=social&utm_campaign=launch`,
    color: 'bg-blue-600/10 border-blue-600/30 text-blue-400',
    status: 'pending_setup',
    description: 'Product updates, case studies, and freelance analytics insights.',
  },
  {
    platform: 'Reddit',
    handle: 'u/giganalytics',
    icon: '🤖',
    url: 'https://reddit.com/user/giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=reddit&utm_medium=social&utm_campaign=launch`,
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    status: 'pending_setup',
    description: 'Active in r/freelance, r/entrepreneur, r/SideProject with ROI tips.',
  },
  {
    platform: 'Product Hunt',
    handle: 'GigAnalytics',
    icon: '🚀',
    url: 'https://www.producthunt.com/products/giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=producthunt&utm_medium=listing&utm_campaign=launch`,
    color: 'bg-orange-600/10 border-orange-600/30 text-orange-500',
    status: 'live',
    description: 'Upvote us on Product Hunt to help more freelancers find us.',
  },
]

const twitterThread = [
  {
    n: 1,
    text: 'I just launched GigAnalytics — an analytics dashboard for people with 2–5 income streams.\n\nThe insight that started it: most freelancers think they earn $80/hr. They actually earn ~$47.\n\nHere\'s the thread 🧵',
  },
  {
    n: 2,
    text: 'The "true hourly rate" gap:\n\n• Upwork fees: −13%\n• Admin/unpaid time: −20%\n• Client acquisition: −8%\n• Tools & software: −$3/hr\n\n$80 becomes ~$47 in real take-home. Most freelancers have no idea.',
  },
  {
    n: 3,
    text: 'GigAnalytics calculates this automatically:\n\n→ Import from Stripe, PayPal, or CSV\n→ Log time with a one-tap timer\n→ See true hourly rate per income stream\n\nNo spreadsheets. 5 min setup.',
  },
  {
    n: 4,
    text: 'It also shows you:\n\n📊 Which streams pull their weight\n🗺️ Best times/days to accept work (heatmap)\n🧪 A/B pricing experiments with stat significance\n🤖 AI suggestions based on YOUR data\n\nAll privacy-first. No raw data sharing.',
  },
  {
    n: 5,
    text: 'Free plan includes:\n• 2 income streams\n• Unlimited CSV imports\n• Full ROI dashboard\n• Heatmap\n\nPro ($29/mo) adds AI insights + benchmark data from anonymized freelancer pool.\n\n→ startup-90-giganalytics-human-cente.vercel.app\n\nWould love your feedback 🙏',
  },
]

const redditPost = {
  subreddit: 'r/freelance',
  title: 'I built a tool to calculate your real hourly rate (after fees, admin time, acquisition costs) — free to use',
  body: `Hey r/freelance,

I've been a freelancer for a few years and always felt like my "billing rate" was a lie. I charge $80/hr but when I tracked everything — platform fees (13% avg), time spent on proposals and admin (20% of my week), client acquisition effort — my real hourly rate was closer to $47.

So I built **GigAnalytics** to calculate this automatically.

**What it does:**
- Connect Stripe/PayPal or upload a CSV — it parses everything
- Log work time with a one-tap timer (or import from calendar)
- See true hourly rate per income stream, factoring in all costs
- Heatmap of when you earn most per hour
- A/B pricing experiments if you want to test raising rates

**Free plan** includes 2 streams + unlimited imports + full ROI dashboard.

→ ${PRODUCTION_URL}?utm_source=reddit&utm_medium=organic&utm_campaign=launch_post

I'm the solo founder — happy to answer questions. Would love feedback from people who actually juggle multiple income streams.`,
}

const linkedinPost = `🚀 Launching GigAnalytics — the analytics dashboard I wish existed when I started freelancing.

Most freelancers track what they earn. Almost none track what they *keep* after platform fees, unpaid admin time, and client acquisition effort.

The gap is usually 30–45%.

GigAnalytics closes that gap:

📊 True hourly rate per income stream (fees + time = real number)
🧪 A/B pricing experiments with statistical significance
🗺️ Earnings heatmap (best times/days by platform)
🤖 AI-powered suggestions based on your actual data
📥 Import from Stripe, PayPal, CSV — 5-minute setup

Built for the multi-income earner: freelancers, consultants, creators running 2–5 streams.

Free plan available. Pro at $29/mo.

→ ${PRODUCTION_URL}?utm_source=linkedin&utm_medium=social&utm_campaign=launch

Would love to connect with freelancers and hear what metrics actually matter to you.

#freelance #sideincome #gigeconomy #analytics #saas #buildinpublic`

export default function SocialPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">GigAnalytics</Link>
        <nav className="flex gap-6 text-sm text-gray-400">
          <Link href="/blog" className="hover:text-white">Blog</Link>
          <Link href="/launch" className="hover:text-white">Launch</Link>
          <Link href="/signup?utm_source=social_page&utm_campaign=launch" className="text-blue-400 hover:text-blue-300">Sign up free →</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="text-sm text-blue-400 font-medium mb-3 uppercase tracking-wide">Social</div>
          <h1 className="text-4xl font-bold text-white mb-4">Follow GigAnalytics</h1>
          <p className="text-gray-400 text-lg">
            We&apos;re building in public. Follow along for tips on freelance ROI,
            pricing experiments, and multi-income analytics.
          </p>
        </div>

        {/* Social channels */}
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          {socialLinks.map(s => (
            <div key={s.platform} className={`border rounded-xl p-6 ${s.color}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="font-semibold text-white">{s.platform}</div>
                  <div className="text-xs text-gray-500">{s.handle}</div>
                </div>
                {s.status === 'live' && (
                  <span className="ml-auto text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Live</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">{s.description}</p>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                Follow on {s.platform} →
              </a>
            </div>
          ))}
        </div>

        {/* Twitter Thread */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">Twitter/X Launch Thread</h2>
          <p className="text-gray-400 text-sm mb-6">Full thread copy — ready to post</p>
          <div className="space-y-4">
            {twitterThread.map(t => (
              <div key={t.n} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <div className="text-xs text-gray-500 mb-2 font-mono">Tweet {t.n}/{twitterThread.length}</div>
                <pre className="text-gray-200 text-sm whitespace-pre-wrap font-sans leading-relaxed">{t.text}</pre>
              </div>
            ))}
          </div>
        </div>

        {/* Reddit Post */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">Reddit Launch Post</h2>
          <p className="text-gray-400 text-sm mb-6">
            Target: <span className="text-orange-400 font-mono">{redditPost.subreddit}</span> +
            r/entrepreneur + r/SideProject
          </p>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-sm text-orange-400 font-semibold mb-2">📌 Title:</div>
            <div className="text-white mb-4 font-medium">{redditPost.title}</div>
            <div className="text-sm text-orange-400 font-semibold mb-2">📝 Body:</div>
            <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{redditPost.body}</pre>
          </div>
        </div>

        {/* LinkedIn Post */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">LinkedIn Launch Post</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{linkedinPost}</pre>
          </div>
        </div>

        {/* UTM Links */}
        <div className="bg-gray-900/50 rounded-2xl p-8 mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Attribution URLs</h2>
          <p className="text-gray-400 text-sm mb-4">Use these links in all posts to track signup attribution:</p>
          <div className="space-y-2 font-mono text-xs">
            {[
              ['Twitter', 'utm_source=twitter&utm_medium=social&utm_campaign=launch'],
              ['LinkedIn', 'utm_source=linkedin&utm_medium=social&utm_campaign=launch'],
              ['Reddit organic', 'utm_source=reddit&utm_medium=organic&utm_campaign=launch_post'],
              ['Reddit ad', 'utm_source=reddit&utm_medium=cpc&utm_campaign=launch_ad'],
              ['Product Hunt', 'utm_source=producthunt&utm_medium=listing&utm_campaign=launch'],
              ['Indie Hackers', 'utm_source=indiehackers&utm_medium=listing&utm_campaign=launch'],
            ].map(([label, params]) => (
              <div key={label} className="bg-gray-800 rounded px-3 py-2">
                <span className="text-gray-400 mr-2">{label}:</span>
                <span className="text-blue-400 break-all">{PRODUCTION_URL}?{params}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-950/30 border border-blue-900/40 rounded-2xl p-10 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Try GigAnalytics free</h3>
          <p className="text-gray-400 mb-8">5-minute setup. No credit card required.</p>
          <Link
            href="/signup?utm_source=social_page&utm_medium=cta&utm_campaign=launch"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 py-4 rounded-xl transition-colors"
          >
            Get started free →
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 px-6 text-center text-sm text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <Link href="/blog" className="hover:text-gray-300">Blog</Link>
          <Link href="/launch" className="hover:text-gray-300">Launch</Link>
          <Link href="/pricing" className="hover:text-gray-300">Pricing</Link>
        </div>
        <p>© {new Date().getFullYear()} GigAnalytics</p>
      </footer>
    </div>
  )
}
