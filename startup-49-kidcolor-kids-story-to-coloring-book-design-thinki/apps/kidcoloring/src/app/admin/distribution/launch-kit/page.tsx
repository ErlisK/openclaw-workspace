import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Product Hunt Launch Kit — KidColoring Admin' }

const LAUNCH_COPY = {
  tagline: 'Turn any kid\'s interests into a personalised coloring book in 2 minutes',
  description: `KidColoring lets parents and teachers create personalised coloring books for kids based on their own interests, heroes, and stories.

Just enter your child's name, pick their favourite themes (dinosaurs, space, unicorns, robots…), and we generate a unique 8-page printable coloring book — instantly.

**Why we built this:**
We couldn't find coloring books that felt personal to our kids. Generic books sit on the shelf; books with their name and their favourite things get colored immediately and over and over.

**What makes it different:**
- 100% personalised: every page is generated based on what YOUR child loves
- Age-appropriate: we adjust complexity for 3–10 year olds
- Print at home: instant PDF download, print as many times as you want
- COPPA compliant: no child accounts, no child data collected
- Fast: 8 personalised pages in under 2 minutes

**Free to try:** 4 pages free, no account needed. Download the full 8-page book for $6.99.

We've also built a free teacher pack (10 pages, classroom license) for educators.

Would love feedback from parents and teachers in the community! 🎨`,
  
  firstComment: `Hi everyone! Maker here 👋

Quick backstory: My daughter kept asking for coloring books with HER favourite dinosaur — not the generic ones in stores. I started building this one weekend and couldn't stop.

A few things I'm most proud of:
1. **Content safety filter v1.3** — we're very careful about what AI generates for kids. Every prompt goes through semantic scanning + age-adaptive filtering before being shown
2. **COPPA compliance** — parent-only accounts, no child PII, explicit parental consent
3. **Free teacher pack** — teachers can grab a free classroom pack at kidcoloring-research.vercel.app/teachers

Honest about where we are:
- Image quality varies (using Pollinations.ai, improving)
- Stripe in test mode → payments work but not charging yet
- Still early, 0-spend, learning from every user

I'd love to know: **What themes would your kids want?** And would a subscription (new books every month) be useful?

Happy to answer any questions!`,

  hunterNote: `Looking for a hunter! If you'd like to hunt this product, please reach out: scide-founder@agentmail.to

We're targeting a Tuesday or Wednesday launch (best PH days). Happy to share preview access.`,
}

const GALLERY_DESCRIPTION = `**Images/gallery for PH submission:**
- Main image: Screenshot of the creation flow (interests → story → preview → coloring pages)
- GIF: Screen recording of a 60-second book generation
- Thumbnail: Colorful coloring page with KidColoring.app watermark

Screenshots needed:
1. Landing page hero
2. Interests selection screen  
3. Generated coloring page preview
4. PDF download / print screen
5. Admin analytics dashboard (shows the data we track)`

const UTM_LINKS = [
  { label: 'PH primary CTA',      url: 'https://kidcoloring-research.vercel.app?utm_source=producthunt&utm_medium=launch&utm_campaign=ph-launch-2025' },
  { label: 'Gallery (featured)',   url: 'https://kidcoloring-research.vercel.app/gallery?utm_source=producthunt&utm_medium=launch' },
  { label: 'Teachers page',       url: 'https://kidcoloring-research.vercel.app/teachers?utm_source=producthunt&utm_medium=launch' },
]

export default function LaunchKitPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/admin/distribution" className="text-sm text-violet-600 hover:underline">← Distribution</Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-2 mb-1">🚀 Product Hunt Launch Kit</h1>
        <p className="text-sm text-gray-500 mb-8">Copy-paste assets for the PH launch</p>

        {/* Tagline */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800">Tagline (60 chars max)</h2>
            <span className="text-xs text-gray-400">{LAUNCH_COPY.tagline.length} chars</span>
          </div>
          <pre className="bg-gray-50 rounded-xl p-4 text-sm whitespace-pre-wrap font-sans text-gray-800">
            {LAUNCH_COPY.tagline}
          </pre>
        </section>

        {/* Description */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-2">Product description</h2>
          <pre className="bg-gray-50 rounded-xl p-4 text-sm whitespace-pre-wrap font-sans text-gray-800 max-h-72 overflow-y-auto">
            {LAUNCH_COPY.description}
          </pre>
        </section>

        {/* First comment */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-2">Maker&apos;s first comment</h2>
          <pre className="bg-gray-50 rounded-xl p-4 text-sm whitespace-pre-wrap font-sans text-gray-800 max-h-72 overflow-y-auto">
            {LAUNCH_COPY.firstComment}
          </pre>
        </section>

        {/* Hunter note */}
        <section className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-4">
          <h2 className="font-bold text-orange-800 mb-2">🏹 Looking for a hunter</h2>
          <p className="text-sm text-orange-700 whitespace-pre-wrap">{LAUNCH_COPY.hunterNote}</p>
        </section>

        {/* Gallery */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-2">Gallery / screenshots needed</h2>
          <pre className="bg-gray-50 rounded-xl p-4 text-sm whitespace-pre-wrap font-sans text-gray-800">
            {GALLERY_DESCRIPTION}
          </pre>
        </section>

        {/* UTM links */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-3">UTM-tracked launch URLs</h2>
          <div className="space-y-2">
            {UTM_LINKS.map(l => (
              <div key={l.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">{l.label}</p>
                <code className="text-xs text-violet-700 break-all">{l.url}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Launch checklist */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-3">Launch day checklist</h2>
          <div className="space-y-2 text-sm">
            {[
              { done: true,  item: 'Landing page live (kidcoloring-research.vercel.app)' },
              { done: true,  item: 'Gallery page live (/gallery)' },
              { done: true,  item: 'Teacher pack page live (/teachers)' },
              { done: true,  item: 'Privacy / Terms / COPPA pages live' },
              { done: true,  item: 'Content safety filter v1.3 active' },
              { done: false, item: 'Stripe live keys configured in Vercel env' },
              { done: false, item: 'PH submission form completed (tagline, description, gallery)' },
              { done: false, item: 'GIF screen recording created' },
              { done: false, item: 'Hunter found / self-hunting prepared' },
              { done: false, item: 'Notify personal network to upvote 0:01 AM PST Tuesday' },
              { done: false, item: 'First comment drafted and queued' },
              { done: false, item: 'UTM links tested (track source=producthunt in analytics)' },
            ].map(i => (
              <div key={i.item} className={`flex items-start gap-3 p-2.5 rounded-xl ${i.done ? 'bg-green-50' : 'bg-gray-50'}`}>
                <span className={i.done ? 'text-green-600' : 'text-gray-300'}>
                  {i.done ? '✅' : '⬜'}
                </span>
                <span className={i.done ? 'text-green-700' : 'text-gray-600'}>{i.item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
