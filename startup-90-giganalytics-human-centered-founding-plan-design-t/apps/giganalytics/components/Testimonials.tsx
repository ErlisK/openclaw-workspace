'use client'

const testimonials = [
  {
    quote:
      "I had no idea my Upwork projects were paying me $18/hr after you factor in back-and-forth and revisions. Switched focus to direct clients — rate jumped to $64/hr overnight.",
    name: 'Marcus T.',
    role: 'Full-stack dev · 4 income streams',
    avatar: 'MT',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    quote:
      "The heatmap alone was worth it. I was accepting Fiverr orders on Sunday nights when my weekday slot is 3× less competitive. Simple change, +$400/mo extra.",
    name: 'Priya S.',
    role: 'UX designer · Fiverr + direct clients',
    avatar: 'PS',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    quote:
      "Took me 11 minutes to import my Stripe CSV and see my real net rate. I'd been quoting $55/hr for two years. I'm now at $80. Should've done this on day one.",
    name: 'Jordan R.',
    role: 'Copywriter · 3 platforms',
    avatar: 'JR',
    color: 'bg-green-100 text-green-700',
  },
]

export default function Testimonials() {
  return (
    <section className="max-w-4xl mx-auto mb-16 px-4">
      <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-6">
        What freelancers discovered in their first week
      </p>
      <div className="grid md:grid-cols-3 gap-5">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col gap-4"
          >
            <p className="text-sm text-gray-700 leading-relaxed flex-1">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${t.color}`}
              >
                {t.avatar}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                <div className="text-xs text-gray-500">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
