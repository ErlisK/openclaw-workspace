'use client';

import { useState, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface DailyPoint { date: string; count: number; }
interface EventRow { name: string; count: number; }

interface FunnelStep {
  step: number;
  name: string;
  event: string;
  count: number;
  rate: number | null;    // conversion from prev step (%)
  drop_off: number | null;
}

interface FunnelData {
  steps: FunnelStep[];
  overall_conversion: number | null;
  bottleneck_step: number | null;
}

interface LegacyFunnel {
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
  funnel: LegacyFunnel;
  daily: DailyPoint[];
  byEvent: EventRow[];
  topCourses: Array<{ id: string; title: string; slug: string; count: number }>;
  courses: Array<{ id: string; title: string; slug: string }>;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function BarChart({ data, label }: { data: DailyPoint[]; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const BAR_W = Math.max(4, Math.floor(560 / data.length) - 2);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="overflow-x-auto">
        <svg width={Math.max(560, data.length * (BAR_W + 2))} height={120} className="block">
          {data.map((d, i) => {
            const barH = Math.max(2, Math.round((d.count / max) * 90));
            const x = i * (BAR_W + 2);
            const y = 100 - barH;
            return (
              <g key={d.date}>
                <rect x={x} y={y} width={BAR_W} height={barH} rx={2}
                  className="fill-violet-500 hover:fill-violet-600 transition-colors">
                  <title>{d.date}: {d.count} events</title>
                </rect>
                {i % 7 === 0 && (
                  <text x={x + BAR_W / 2} y={115} textAnchor="middle" fontSize="9" fill="#9ca3af">
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

function MetricCard({ label, value, sub, highlight }: { label: string; value: number | string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? 'border-violet-200 bg-violet-50' : 'border-gray-100 bg-white'}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? 'text-violet-700' : 'text-gray-900'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function CreatorFunnelChart({ data }: { data: FunnelData }) {
  const maxCount = Math.max(...data.steps.map((s) => s.count), 1);

  const STEP_COLORS = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-green-500',
  ];

  return (
    <div className="space-y-1">
      {data.steps.map((step, i) => {
        const pct = maxCount === 0 ? 0 : Math.round((step.count / maxCount) * 100);
        const isBottleneck = step.step === data.bottleneck_step;
        return (
          <div key={step.event}>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-400">{step.step}</span>
              <span className="w-36 shrink-0 text-sm text-gray-700 font-medium truncate">{step.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${STEP_COLORS[i] ?? 'bg-gray-400'}`}
                  style={{ width: `${Math.max(pct, step.count > 0 ? 2 : 0)}%` }}
                />
              </div>
              <span className="w-14 text-right text-sm font-bold text-gray-900">{step.count.toLocaleString()}</span>
              {step.rate !== null && (
                <span className={`w-14 text-right text-xs font-semibold ${
                  isBottleneck ? 'text-red-600' : step.rate >= 50 ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {step.rate}%{isBottleneck ? ' ⚠' : ''}
                </span>
              )}
              {step.rate === null && <span className="w-14" />}
            </div>
            {step.drop_off !== null && step.drop_off > 0 && (
              <div className="ml-[1.25rem] pl-[calc(1.25rem+0.75rem+9rem)] flex items-center gap-1 pb-1">
                <span className="text-xs text-red-400">↓ {step.drop_off.toLocaleString()} dropped</span>
              </div>
            )}
          </div>
        );
      })}
      {data.overall_conversion !== null && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">Overall funnel conversion</span>
          <span className={`text-sm font-bold ${
            data.overall_conversion >= 10 ? 'text-green-600' :
            data.overall_conversion >= 3 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {data.overall_conversion}%
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function AnalyticsDashboardClient({
  days,
  totalEvents,
  funnel,
  daily,
  byEvent,
  topCourses,
  courses,
}: AnalyticsDashboardProps) {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Fetch the 6-step creator funnel from the dedicated endpoint
  useEffect(() => {
    setFunnelLoading(true);
    setFunnelError(null);
    const url = `/api/admin/funnel?days=${days}${selectedCourse ? `&courseId=${selectedCourse}` : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setFunnelError(data.error);
        else setFunnelData(data);
      })
      .catch((e) => setFunnelError(e.message))
      .finally(() => setFunnelLoading(false));
  }, [days, selectedCourse]);

  const handleSeed = async (scenario: string) => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/seed-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, count: 20 }),
      });
      const data = await res.json();
      if (data.error) setSeedResult(`Error: ${data.error}`);
      else if (data.cleared) setSeedResult('Cleared synthetic events.');
      else {
        const summary = Object.entries(data.seeded as Record<string, number>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ');
        setSeedResult(`Seeded ${data.total} events — ${summary}`);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) {
      setSeedResult(`Network error: ${(e as Error).message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Last {days} days · {totalEvents.toLocaleString()} events</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Day picker */}
          {[7, 14, 30, 90].map((d) => (
            <a key={d} href={`?days=${d}${selectedCourse ? `&courseId=${selectedCourse}` : ''}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                d === days ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {d}d
            </a>
          ))}
          {/* Course filter */}
          {courses.length > 0 && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-violet-500"
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── 6-Step Creator Funnel ────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Creator Conversion Funnel
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              signup → import_started → import_completed → course_published → checkout_started → checkout_completed
            </p>
          </div>
          {funnelData?.bottleneck_step && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700">
              Bottleneck: Step {funnelData.bottleneck_step}
            </div>
          )}
        </div>

        {funnelLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            Loading funnel...
          </div>
        )}
        {funnelError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {funnelError}
          </div>
        )}
        {!funnelLoading && !funnelError && funnelData && (
          <CreatorFunnelChart data={funnelData} />
        )}

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Bar width = relative to step 1 count</span>
          <span>% = conversion from previous step</span>
          <span className="text-red-500">⚠ = bottleneck step</span>
        </div>
      </div>

      {/* ── Key Metric Cards ──────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Signups" value={funnel.signups} />
        <MetricCard label="Lesson Views" value={funnel.lesson_views} />
        <MetricCard label="Checkout Starts" value={funnel.checkout_starts} />
        <MetricCard label="Purchases" value={funnel.checkout_completions}
          highlight={funnel.checkout_completions > 0} />
        <MetricCard label="Quiz Submits" value={funnel.quiz_submissions} />
        <MetricCard label="Sandbox Views" value={funnel.sandbox_views} />
      </div>

      {/* ── Daily Events Chart ────────────────────────────────────────────── */}
      <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Daily Events</h2>
        <BarChart data={daily} label="Total events per day" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event breakdown */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Events Breakdown</h2>
          {byEvent.length === 0 ? (
            <p className="text-sm text-gray-500">No events yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {byEvent.map((e) => (
                <div key={e.name} className="flex items-center justify-between gap-2">
                  <span className={`font-mono text-xs rounded px-2 py-0.5 ${
                    ['signup_completed','repo_import_started','repo_import_completed',
                     'course_published','checkout_started','checkout_completed'].includes(e.name)
                      ? 'bg-violet-50 text-violet-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}>{e.name}</span>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{e.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top courses */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Top Courses</h2>
          {topCourses.length === 0 ? (
            <p className="text-sm text-gray-500">No course activity yet.</p>
          ) : (
            <div className="space-y-2">
              {topCourses.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs text-gray-400">{i + 1}</span>
                  <a href={`/courses/${c.slug}`}
                    className="flex-1 truncate text-sm font-medium text-gray-800 hover:text-violet-600">
                    {c.title}
                  </a>
                  <span className="text-sm font-semibold text-gray-900">{c.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Dev Tools: Seed events ────────────────────────────────────────── */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Dev: Seed synthetic events</h2>
          <p className="mb-4 text-xs text-gray-500">
            Inserts synthetic funnel events for testing queries. Seeded events have{' '}
            <code className="bg-gray-100 px-1 rounded">seeded:true</code> in properties.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {['full_funnel', 'partial', 'no_publish', 'no_checkout'].map((s) => (
              <button key={s} onClick={() => handleSeed(s)} disabled={seeding}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-violet-300 disabled:opacity-50">
                {s}
              </button>
            ))}
            <button onClick={() => handleSeed('clear')} disabled={seeding}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:border-red-400 disabled:opacity-50">
              clear seeded
            </button>
          </div>
          {seeding && <p className="text-xs text-gray-400">Seeding...</p>}
          {seedResult && <p className="text-xs text-gray-600 font-mono">{seedResult}</p>}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        First-party analytics · No third-party trackers · {totalEvents.toLocaleString()} events in last {days} days
      </p>
    </div>
  );
}
