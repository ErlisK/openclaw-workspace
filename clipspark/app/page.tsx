import WaitlistForm from "@/components/WaitlistForm";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-bold text-xl text-gray-900">ClipSpark</span>
        </div>
        <a
          href="#waitlist"
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Join Waitlist
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm px-3 py-1 rounded-full mb-6">
          🎙️ Built for nano-creators with &lt;10k followers
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Turn podcasts &amp; webinars into{" "}
          <span className="text-orange-500">platform-ready short clips</span>{" "}
          in minutes.
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          ClipSpark uses AI to find your best moments, add captions, suggest
          titles &amp; hashtags, and export to TikTok, Reels, Shorts, and
          LinkedIn — no editing skills required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <a
            href="#waitlist"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Join the Waitlist — Free
          </a>
          <a
            href="#how-it-works"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            See How It Works
          </a>
        </div>
        <p className="text-sm text-gray-500">
          $5/month when we launch · No credit card needed to join
        </p>
      </section>

      {/* Social proof placeholders */}
      <section className="bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 mb-4 uppercase tracking-wide font-medium">
            Built for creators who publish weekly
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {["Solo Podcasters", "Livestream Hosts", "Indie Coaches", "Startup Founders"].map(
              (label) => (
                <div key={label} className="flex items-center gap-2 text-gray-400">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Everything you need to repurpose content fast
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: "🤖",
              title: "AI-Picked Timestamps",
              desc: "Our AI identifies your most engaging moments — no manual scrubbing through hours of footage.",
            },
            {
              icon: "💬",
              title: "Auto-Generated Captions",
              desc: "Accurate captions styled for each platform. Boost accessibility and watch time automatically.",
            },
            {
              icon: "✍️",
              title: "Titles & Hashtags",
              desc: "Catchy, platform-optimized titles and hashtag sets generated for every clip instantly.",
            },
            {
              icon: "🖼️",
              title: "Simple Thumbnails",
              desc: "Clean, eye-catching thumbnails created automatically. Customize to match your brand.",
            },
            {
              icon: "🚀",
              title: "One-Click Export",
              desc: "Publish directly to TikTok, Instagram Reels, YouTube Shorts, and LinkedIn with one click.",
            },
            {
              icon: "💰",
              title: "Nano-Creator Pricing",
              desc: "Just $5/month or $50/year. Pro tools without the pro price tag.",
            },
          ].map((b) => (
            <div
              key={b.title}
              className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{b.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{b.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How ClipSpark Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: "📤",
                title: "Upload Your Content",
                desc: "Drop in your podcast, webinar, or livestream. MP3, MP4, and YouTube/RSS links supported.",
              },
              {
                step: "2",
                icon: "✨",
                title: "AI Finds the Gold",
                desc: "ClipSpark finds the most engaging highlights and formats them for each platform automatically.",
              },
              {
                step: "3",
                icon: "📱",
                title: "Export Everywhere",
                desc: "Review clips, tweak captions if needed, then publish to TikTok, Reels, Shorts, and LinkedIn.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  {item.step}
                </div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Simple, Honest Pricing
        </h2>
        <p className="text-gray-600 mb-8">
          No per-clip fees. No hidden upsells. One flat rate for creators who publish weekly.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border-2 border-gray-200 rounded-2xl p-6 text-left">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              $5<span className="text-base font-normal text-gray-500">/mo</span>
            </div>
            <div className="text-gray-500 text-sm mb-4">Billed monthly</div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✅ 4 long-form uploads/mo</li>
              <li>✅ AI highlight detection</li>
              <li>✅ Auto captions + titles</li>
              <li>✅ Export to all platforms</li>
            </ul>
          </div>
          <div className="border-2 border-orange-500 rounded-2xl p-6 text-left relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium">
              Best Value
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              $50<span className="text-base font-normal text-gray-500">/yr</span>
            </div>
            <div className="text-gray-500 text-sm mb-4">~$4.17/mo · Save 17%</div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✅ Everything in monthly</li>
              <li>✅ Priority processing</li>
              <li>✅ Early access to new features</li>
              <li>✅ Founding member badge</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Join the waitlist for early-bird pricing.
        </p>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist" className="bg-orange-50 py-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Get Early Access</h2>
          <p className="text-gray-600 mb-8">
            Join creators waiting for ClipSpark. Be first to try it and lock in founding member pricing.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span className="font-semibold text-gray-700">ClipSpark</span>
            <span className="text-gray-400 text-sm">© 2025</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-700">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-700">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
