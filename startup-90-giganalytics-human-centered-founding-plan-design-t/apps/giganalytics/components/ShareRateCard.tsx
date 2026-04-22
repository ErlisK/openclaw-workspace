'use client'

interface ShareRateCardProps {
  hourlyRate: number
  streamCount: number
  netRevenue: number
  periodDays?: number
}

export function ShareRateCard({ hourlyRate, streamCount, netRevenue, periodDays = 30 }: ShareRateCardProps) {
  if (hourlyRate <= 0) return null

  const rate = Math.round(hourlyRate)
  const tweetText = encodeURIComponent(
    `I'm earning $${rate}/hr across ${streamCount} income stream${streamCount !== 1 ? 's' : ''} 📊\n\nFound this out with GigAnalytics — it calculates your true hourly rate across all your gigs, after fees.\n\nhttps://giganalytics.app`
  )
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://giganalytics.app')}`

  return (
    <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 mb-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm opacity-90">Share Your Rate</h3>
        <span className="text-xs opacity-60 bg-white/10 px-2 py-0.5 rounded-full">free growth 🚀</span>
      </div>

      {/* Card preview */}
      <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-4">
        <div className="text-xs opacity-60 uppercase tracking-wide mb-1">My True Hourly Rate</div>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-5xl font-bold">${rate}</span>
          <span className="text-xl opacity-70 mb-1">/hr</span>
        </div>
        <div className="text-sm opacity-70">
          Across {streamCount} income stream{streamCount !== 1 ? 's' : ''} · last {periodDays} days
        </div>
        <div className="text-xs opacity-50 mt-2">GigAnalytics · giganalytics.app</div>
      </div>

      <p className="text-xs opacity-70 mb-3">
        Help other freelancers find their true hourly rate — share your stats to inspire the community.
      </p>

      <div className="flex gap-2">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2.5 rounded-lg text-center transition-colors"
        >
          Post on 𝕏 Twitter
        </a>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2.5 rounded-lg text-center transition-colors"
        >
          Share on LinkedIn
        </a>
      </div>
    </div>
  )
}
