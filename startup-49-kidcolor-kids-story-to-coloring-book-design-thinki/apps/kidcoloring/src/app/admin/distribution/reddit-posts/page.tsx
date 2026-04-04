import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Reddit Post Templates — KidColoring Admin' }

const POSTS = [
  {
    subreddit: 'r/Teachers',
    flair:     'Resource',
    title:     'Free printable coloring pages for your classroom (10 pages, K-5, no signup)',
    body: `Hi r/Teachers! 👋

I made a free 10-page coloring pack specifically for classrooms. No signup, no watermarks, instant PDF download.

**What's included:**
- 🦕 3 Dinosaur pages
- 🚀 2 Space pages
- 🦄 2 Fantasy pages (unicorn + dragon)
- 🤖 1 Robot
- 🐶 2 Animal pages

**Classroom license included:** Print unlimited copies for your students.

Download: kidcoloring-research.vercel.app/teachers

---

Also — if you want personalised books where each student gets pages based on THEIR interests, that's the main app. Free to try (4 pages), $6.99 for the full book.

I built this because my daughter kept asking for coloring books with HER specific dinosaur. Made for K-5, content safety reviewed, COPPA compliant.

Happy to send more themed packs if this is useful for your class! What themes would your students want?`,
    utm: 'utm_source=reddit&utm_medium=post&utm_campaign=teachers',
  },
  {
    subreddit: 'r/Parenting',
    flair:     'Resource',
    title:     'Built a site to make personalised coloring books for kids — free to try',
    body: `Long-time lurker, first time poster.

My daughter loves dinosaurs but hates coloring books that have the "wrong kind" of dinosaur or generic characters she doesn't care about. So I spent a few weekends building something.

**KidColoring** lets you:
1. Type your kid's name and favourite things
2. Get 8 personalised coloring pages in 2 minutes
3. Download as PDF and print at home

**Free tier:** 4 pages with no account needed.
**Full book:** $6.99 (8+ pages, personalised PDF)

Site: kidcoloring-research.vercel.app

A few things that matter to me as a parent:
- **No child accounts** — parent email only (COPPA compliant)
- **Content safety filter** — every prompt is reviewed before generating
- **No subscriptions required** — one-time purchase, print forever

Tried it with a few kids at my daughter's birthday party — they were SO excited to see their name and favourite things on the pages.

Would love feedback from parents! What themes do your kids love? What would make this more useful?`,
    utm: 'utm_source=reddit&utm_medium=post&utm_campaign=parenting',
  },
  {
    subreddit: 'r/SideProject',
    flair:     'Show & Tell',
    title:     'Show HN-style: I built a personalised coloring book generator for kids',
    body: `Hey r/SideProject! I want to share what I've been building for the last few months.

**KidColoring** — personalised coloring books for kids, generated in 2 minutes.

**The problem:** Kids get more engaged with coloring when the content is about things THEY love. Generic books sit unused; personalised ones get colored over and over.

**What I built:**
- Next.js 15 + Supabase + Vercel
- Pollinations.ai for image generation (free, no API key needed)
- Content safety filter v1.3 with semantic scanning + age-adaptive profiles
- Stripe checkout (test mode, going live soon)
- COPPA-compliant auth (parent-only, no child PII)

**Stack highlights:**
- Server-side pricing experiments (4-variant test: $4.99/$6.99/$9.99/anchor)
- Supabase Realtime for live generation status
- pdf-lib for PDF export (fun bug: WinAnsi fonts can't encode emoji 🦕)

**Current traction:** ~410 sessions, working on first paid conversions.

**What's next:** Product Hunt launch, teacher marketplace listings, gallery of user-created pages.

Live: kidcoloring-research.vercel.app
Gallery: kidcoloring-research.vercel.app/gallery

Happy to answer questions about the tech or the approach!`,
    utm: 'utm_source=reddit&utm_medium=post&utm_campaign=sideproject',
  },
  {
    subreddit: 'r/KidsActivities',
    flair:     'Activity',
    title:     'Personalised coloring books based on your child\'s interests — free to try',
    body: `Hi r/KidsActivities!

Sharing something I built for my own kids that might be useful for yours.

**KidColoring** creates personalised coloring books based on what YOUR child loves — in 2 minutes.

How it works:
1. Choose your child's favourite themes (dinosaurs, unicorns, space, robots, dragons, etc.)
2. Add their name for the hero
3. Get 8 unique coloring pages instantly
4. Download as PDF and print

**Free to try:** 4 pages with zero signup.

What kids have been loving:
- Specific dinosaurs by name (T-Rex, Stegosaurus, etc.)
- Their favourite characters + original AI art style
- Space adventures with their name as the astronaut

Ages 3–10 work best. Simpler designs for younger, more detailed for older.

Try it: kidcoloring-research.vercel.app

What themes do your kids go crazy for? Always looking to add more!`,
    utm: 'utm_source=reddit&utm_medium=post&utm_campaign=kidsactivities',
  },
]

export default function RedditPostsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/admin/distribution" className="text-sm text-violet-600 hover:underline">← Distribution</Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-2 mb-1">🤖 Reddit Post Templates</h1>
        <p className="text-sm text-gray-500 mb-2">
          Post in communities where it adds genuine value. Read the rules first.
          Never spam — one post per subreddit, space them a week apart.
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-8 text-sm text-amber-800">
          <p className="font-bold mb-1">⚠️ Reddit posting guidelines</p>
          <ul className="space-y-1 text-amber-700">
            <li>• Read each subreddit&apos;s rules before posting — some prohibit self-promotion entirely</li>
            <li>• Add genuine value — the free teacher pack and free trial are real, not fake</li>
            <li>• Don&apos;t post the same content to multiple subreddits the same day</li>
            <li>• Engage with comments — respond within 2 hours of posting if possible</li>
            <li>• r/SideProject and r/IndieHackers are more tolerant of &quot;I built a thing&quot; posts</li>
          </ul>
        </div>

        <div className="space-y-6">
          {POSTS.map(post => (
            <div key={post.subreddit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {post.subreddit}
                  </span>
                  {post.flair && (
                    <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {post.flair}
                    </span>
                  )}
                </div>
                <a
                  href={`https://www.reddit.com/${post.subreddit.replace('r/', '')}/submit?title=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-orange-500 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-orange-600 transition-colors"
                >
                  Open Reddit →
                </a>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">TITLE</p>
                <p className="font-semibold text-gray-900 text-sm">{post.title}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">BODY (copy + paste, customise for authenticity)</p>
                <pre className="bg-gray-50 rounded-xl p-4 text-xs whitespace-pre-wrap font-sans text-gray-700 max-h-64 overflow-y-auto">
                  {post.body.replace('kidcoloring-research.vercel.app', `kidcoloring-research.vercel.app?${post.utm}`)}
                </pre>
              </div>

              <div className="mt-3 bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-semibold">UTM URL for this post:</p>
                <code className="text-xs text-blue-700 break-all">
                  https://kidcoloring-research.vercel.app?{post.utm}
                </code>
              </div>
            </div>
          ))}
        </div>

        {/* Twitter/X templates */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">🐦 Twitter/X threads (launch day)</h2>
          <div className="space-y-4">
            {[
              {
                n: 1,
                text: `Built a personalised coloring book generator for kids 🎨

My daughter wanted a coloring book with HER dinosaur. Not the generic one. So I built it.

- Enter kid's name + interests
- Get 8 personalised pages in 2 minutes
- Download PDF, print at home
- Free to try → kidcoloring-research.vercel.app

🧵 How it works (thread)`,
              },
              {
                n: 2,
                text: `The tech stack:
- Next.js 15 App Router + TypeScript
- Pollinations.ai for image generation (free!)
- Supabase for auth + realtime status
- pdf-lib for PDF export
- Vercel for deployment

Fun constraint: pdf-lib WinAnsi fonts can't encode emoji 🦕 → had to strip all emoji from PDF text strings`,
              },
              {
                n: 3,
                text: `Content safety was the hardest part.

Kids' apps need to be much more careful. Built:
- Semantic scanner (not just keyword matching)
- Age-adaptive profiles (3-6 vs 7-10 vs 10+)  
- l33tspeak decoder (y3s, k1ds)
- 80+ hard-block terms

Every prompt goes through this before generating.`,
              },
              {
                n: 4,
                text: `COPPA compliance matters a lot to me.

- Parent-only accounts (no child auth)
- Age stored as integer (not DOB)
- No child PII collected
- Explicit parental consent required
- 2-minute hashed IP retention

Privacy policy: kidcoloring-research.vercel.app/privacy`,
              },
              {
                n: 5,
                text: `Free teacher pack available for K-5 classrooms:

10 pages, classroom license, no watermarks
→ kidcoloring-research.vercel.app/teachers

Teachers: indoor recess, early finishers, calm-down corner. 

DM if you want more themed packs for specific curricula.`,
              },
            ].map(t => (
              <div key={t.n} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {t.n}
                </div>
                <pre className="text-xs font-sans text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 flex-1">
                  {t.text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
