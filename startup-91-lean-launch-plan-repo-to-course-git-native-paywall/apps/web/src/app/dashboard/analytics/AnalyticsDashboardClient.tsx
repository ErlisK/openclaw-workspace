'use client';

interface DailyPoint { date: string; count: number; }
interface EventRow { name: string; count: number; }
interface FunnelData {
  signups: number;
  lesson_views: number;
  checkout_starts: number;
  checkout_completions: number;
  quiz_submissions: number;
  sandbox_views: number;
}

interface AnalyticsDashboardProps {
  days: number;
  totalEvents: number;
  funnel: FunnelData;
  daily: DailyPoint[];
  byEvent: EventRow[];
  topCourses: Array<{ id: string; title: string; slug: string; count: number }>;
  courses: Array<{ id: string; title: string; slug: string }>;
}

// Simple inline SVG bar chart — no npm deps needed
function BarChart({ data, label }: { data: DailyPoint[]; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const BAR_W = Math.max(4, Math.floor(560 / data.length) - 2);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="overflow-x-auto">
        <svg
          width={Math.max(560, data.length * (BAR_W + 2))}
          height={120}
          className="block"
        >
          {data.map((d, i) => {
            const barH = Math.max(2, Math.round((d.count / max) * 90));
            const x = i * (BAR_W + 2);
            const y = 100 - barH;
            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={barH}
                  rx={2}
                  className="fill-violet-500 hover:fill-violet-600 transition-colors"
                >
                  <title>{d.date}: {d.count} events</title>
                </rect>
                {/* Show date label every 7 bars */}
                {i % 7 === 0 && (
                  <text
                    x={x + BAR_W / 2}
                    y={115}
                    textAnchor="middle"
                    fontSize="9"
                    className="fill-gray-400"
                  >
                    {d.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 text-sm text-gray-600 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-gray-700">{value.toLocaleString()}</span>
    </div>
  );
}

export default function AnalyticsDashboardClient({
  days,
  totalEvents,
  funnel,
  daily,
  byEvent,
  topCourses,
}: AnalyticsDashboardProps) {
  const funnelMax = Math.max(
    funnel.signups, funnel.lesson_views, funnel.checkout_starts,
    funnel.checkout_completions, funnel.quiz_submissions, funnel.sandbox_views, 1,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Last {days} days · {totalEvents.toLocaleString()} events</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <a
              key={d}
              href={`?days=${d}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                d === days
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      {/* Funnel metrics */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Signups" value={funnel.signups} />
        <MetricCard label="Lesson Views" value={funnel.lesson_views} />
        <MetricCard label="Checkout Starts" value={funnel.checkout_starts} />
        <MetricCard label="Purchases" value={funnel.checkout_completions} />
        <MetricCard label="Quiz Submits" value={funnel.quiz_submissions} />
        <MetricCard label="Sandbox Views" value={funnel.sandbox_views} />
      </div>

      {/* Daily event chart */}
      <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Daily Events
        </h2>
        <BarChart data={daily} label="Total events per day" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversion funnel */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Conversion Funnel
          </h2>
          <div className="space-y-3">
            <FunnelBar label="Signups" value={funnel.signups} max={funnelMax} />
            <FunnelBar label="Lesson Views" value={funnel.lesson_views} max={funnelMax} />
            <FunnelBar label="Checkout Starts" value={funnel.checkout_starts} max={funnelMax} />
            <FunnelBar label="Purchases" value={funnel.checkout_completions} max={funnelMax} />
            <FunnelBar label="Quiz Submissions" value={funnel.quiz_submissions} max={funnelMax} />
            <FunnelBar label="Sandbox Views" value={funnel.sandbox_views} max={funnelMax} />
          </div>
        </div>

        {/* Event breakdown */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Events Breakdown
          </h2>
          {byEvent.length === 0 ? (
            <p className="text-sm text-gray-500">No events yet. They will appear here once your courses are live.</p>
          ) : (
            <div className="space-y-2">
              {byEvent.map((e) => (
                <div key={e.name} className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-700 bg-gray-50 rounded px-2 py-0.5">{e.name}</span>
                  <span className="text-sm font-semibold text-gray-900">{e.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top courses */}
      {topCourses.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Top Courses by Activity
          </h2>
          <div className="space-y-2">
            {topCourses.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs text-gray-400">{i + 1}</span>
                <a
                  href={`/courses/${c.slug}`}
                  className="flex-1 truncate text-sm font-medium text-gray-800 hover:text-violet-600"
                >
                  {c.title}
                </a>
                <span className="text-sm font-semibold text-gray-900">{c.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        Events are first-party analytics tracked via TeachRepo — no third-party trackers.
      </p>
    </div>
  );
}
