import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Earnings Heatmap Guide — GigAnalytics Docs',
  description: 'How to read and act on the GigAnalytics earnings heatmap — the day/hour grid showing when your income per hour is highest across all streams.',
}

export default function HeatmapGuidePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-4">
          <Link href="/docs" className="text-sm text-blue-600 hover:underline">← Documentation</Link>
        </div>

        <div className="mb-10">
          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">ADVANCED</span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Earnings Heatmap Guide</h1>
          <p className="text-xl text-gray-600">
            The heatmap answers: "On which day and hour do I earn the most per hour of work?" Here's how it's built, how to read it, and how to act on it.
          </p>
        </div>

        {/* What the heatmap shows */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What the heatmap shows</h2>
          <p className="text-gray-600 mb-4">
            Each cell in the 7×18 grid (7 days × 18 hours, 6am–11pm) shows the <strong>average net earnings per hour of work</strong> for that day/time combination, aggregated across all your income streams.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { color: 'bg-blue-700', label: 'Dark blue', desc: 'Top 15% — your peak earning hours' },
              { color: 'bg-blue-500', label: 'Medium blue', desc: '65–85% range' },
              { color: 'bg-blue-300', label: 'Light blue', desc: '45–65% range' },
              { color: 'bg-gray-100', label: 'Gray', desc: 'No data or bottom 25%' },
            ].map(({ color, label, desc }) => (
              <div key={label} className="text-center">
                <div className={`${color} h-10 w-full rounded-lg mb-2`}></div>
                <div className="text-xs font-semibold text-gray-800">{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <strong>Important:</strong> The heatmap shows <em>earnings per hour of work</em>, not total earnings. A Sunday morning with 1 hour of high-rate consulting will outrank a Monday with 8 hours of low-rate gig work.
          </div>
        </section>

        {/* How it's calculated */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How cells are calculated</h2>
          <div className="bg-gray-900 text-green-400 font-mono text-sm px-5 py-4 rounded-xl mb-4 overflow-x-auto">
            {`cell[day][hour] =`}<br />
            {`  SUM(net_amount for transactions in window)`}<br />
            {`  ÷ SUM(hours_worked for timer entries in window)`}<br />
            {`  (weighted average across all matching entries)`}
          </div>
          <p className="text-gray-600 mb-4">
            The "window" for a cell is all timer entries and transactions where the timer <strong>started</strong> in that day+hour bucket over the selected date range (default: 90 days).
          </p>
          <h3 className="font-semibold text-gray-900 mb-2">What counts as "work in this window"</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 mb-4">
            <li><strong>Timer entries:</strong> The start time determines which cell the hour falls into. A 2-hour timer started at 9am contributes to the 9am cell (the full 2 hours).</li>
            <li><strong>Calendar imports:</strong> ICS events are bucketed by their start time.</li>
            <li><strong>Transactions without time:</strong> Excluded from heatmap calculations. To include a stream, you need time data for it.</li>
          </ul>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <strong>No time data?</strong> Streams without any timer or calendar entries show a flat gray row in the heatmap. Add at least 5 timer entries to see meaningful patterns.
          </div>
        </section>

        {/* Filtering */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Filtering the heatmap</h2>
          <div className="space-y-4">
            {[
              { filter: 'Date range', desc: 'Default 90 days. Shorter ranges (30 days) show recent patterns; longer ranges (180 days) show seasonal trends. Minimum 14 days for meaningful data.' },
              { filter: 'Income stream', desc: 'Filter to a single stream to see when that specific client type or platform performs best — useful if streams have very different rate structures.' },
              { filter: 'Stream comparison mode', desc: 'Side-by-side heatmaps for two streams. Useful for deciding which stream to prioritize when you have scheduling choices.' },
              { filter: 'Minimum entry threshold', desc: 'Cells with fewer than 3 data points are grayed out by default to avoid misleading you with single-data-point outliers. Adjust in Settings → Heatmap.' },
            ].map(({ filter, desc }) => (
              <div key={filter} className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{filter}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Acting on the heatmap */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acting on what you see</h2>
          <p className="text-gray-600 mb-4">The heatmap is diagnostic. Here's how to turn it into decisions:</p>
          <div className="space-y-4">
            {[
              {
                action: '🔵 Dark blue cells = protect these',
                detail: 'Block your peak hours for high-value work. Decline low-rate requests during these windows. If you have a gig platform that lets you set availability, mark these hours as prime time.',
              },
              {
                action: '⚪ Gray cells = explore or eliminate',
                detail: 'If you consistently have gray evenings, maybe don\'t accept evening gigs at all — or only accept them at a premium rate. Use the rate threshold in Pricing Experiments to test a "off-peak surcharge."',
              },
              {
                action: '📈 Look for weekday vs. weekend patterns',
                detail: 'Many freelancers assume weekday morning is peak. The heatmap often reveals weekend morning consulting rates are significantly higher because there\'s less competition for clients\' attention.',
              },
              {
                action: '🔀 Cross-stream conflicts',
                detail: 'If Stream A and Stream B both peak on Tuesday mornings, the heatmap reveals the opportunity cost of taking Stream B gigs. Use this to negotiate minimum rates for Stream B during those hours.',
              },
            ].map(({ action, detail }) => (
              <div key={action} className="border-l-4 border-blue-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-1">{action}</h3>
                <p className="text-gray-600 text-sm">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitations to be aware of</h2>
          <ul className="space-y-3">
            {[
              'The heatmap shows correlation, not causation. High earnings at 9am may mean that\'s when you do your best work — or it may mean your best clients happen to request morning work. Experiment before restructuring your schedule.',
              'Async work (writing, design) often has decoupled start/pay times. A design project started Monday may pay out Friday. GigAnalytics uses timer start time, which may underrepresent async income patterns.',
              'Very new accounts (< 30 days of data) will have sparse heatmaps. Add historical data via CSV import to fill in the grid.',
              'Timezone: all times are displayed in your account\'s configured timezone (Settings → Preferences). If you work across timezones with clients, you may want to review the raw data.',
            ].map((note, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="border-t border-gray-200 pt-8 flex gap-4 text-sm">
          <Link href="/docs" className="text-blue-600 hover:underline">← All Docs</Link>
          <Link href="/docs/benchmark-data" className="text-blue-600 hover:underline">Benchmark Data →</Link>
        </div>
      </div>
    </main>
  )
}
