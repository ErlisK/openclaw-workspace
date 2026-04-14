"use client";
/**
 * /dashboard/analytics — Analytics goals dashboard
 *
 * Shows goal progress for 5 core events:
 *   project_created, run_completed, patch_downloaded, user_signup, template_viewed
 *
 * Data sourced from /api/analytics/goals (Supabase docsci_events table).
 * Auto-refreshes every 30 seconds.
 */
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Goal = {
  id: string;
  label: string;
  description: string;
  icon: string;
  event_names: string[];
  target_30d: number;
  count_all_time: number;
  count_30d: number;
  count_7d: number;
  count_today: number;
  pct_of_target: number;
  trend_pct: number | null;
};

type Funnel = {
  signups: number;
  projects_created: number;
  runs_completed: number;
  patches_downloaded: number;
};

type GoalsData = {
  goals: Goal[];
  funnel: Funnel;
  recent_events: Array<{
    id: string;
    event_name: string;
    distinct_id: string;
    org_id?: string;
    project_id?: string;
    created_at: string;
  }>;
  last_updated: string;
};

function ProgressBar({ pct, color = "indigo" }: { pct: number; color?: "indigo" | "green" | "yellow" | "red" }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };
  const c = pct >= 80 ? "green" : pct >= 40 ? "indigo" : pct >= 20 ? "yellow" : "red";
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div
        className={`${colors[c]} h-1.5 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${up ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400"}`}>
      {up ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <div
      className="p-5 bg-gray-900 border border-gray-700 rounded-xl"
      data-testid={`goal-card-${goal.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{goal.icon}</span>
          <div>
            <p className="text-white font-semibold text-sm">{goal.label}</p>
            <p className="text-gray-500 text-xs">{goal.description}</p>
          </div>
        </div>
        <TrendBadge pct={goal.trend_pct} />
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        <div>
          <p className="text-white font-bold text-lg">{goal.count_today}</p>
          <p className="text-gray-500 text-xs">Today</p>
        </div>
        <div>
          <p className="text-white font-bold text-lg">{goal.count_7d}</p>
          <p className="text-gray-500 text-xs">7 days</p>
        </div>
        <div>
          <p className="text-indigo-300 font-bold text-lg">{goal.count_30d}</p>
          <p className="text-gray-500 text-xs">30 days</p>
        </div>
        <div>
          <p className="text-gray-400 font-bold text-lg">{goal.count_all_time}</p>
          <p className="text-gray-500 text-xs">All time</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Goal: {goal.target_30d}/30d</span>
          <span className="text-indigo-400 font-medium">{goal.pct_of_target}%</span>
        </div>
        <ProgressBar pct={goal.pct_of_target} />
      </div>

      <div className="mt-2 text-xs text-gray-600">
        Events: {goal.event_names.join(", ")}
      </div>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  max,
  isFirst,
}: {
  label: string;
  value: number;
  max: number;
  isFirst: boolean;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 text-center">
      <div className="relative">
        {!isFirst && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-700 -z-10" />
        )}
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-900 border border-gray-600 rounded-xl text-white font-bold text-sm mx-auto mb-2">
          {value}
        </div>
      </div>
      <p className="text-white text-xs font-medium">{label}</p>
      {!isFirst && <p className="text-gray-500 text-xs">{pct}% cvr</p>}
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<GoalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/goals");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(fetchGoals, 30_000);
    return () => clearInterval(interval);
  }, [fetchGoals]);

  const funnel = data?.funnel;
  const maxFunnel = funnel ? Math.max(funnel.signups, 1) : 1;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="analytics-dashboard">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-white">← Dashboard</Link>
          <span className="text-gray-700">/</span>
          <span className="text-white font-semibold">Analytics Goals</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {lastRefresh && <span>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button
            onClick={fetchGoals}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 transition-colors"
            data-testid="refresh-btn"
          >
            ↻ Refresh
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1" data-testid="page-h1">Analytics Goals</h1>
          <p className="text-gray-400 text-sm">
            Tracking 5 core product conversion events. 30-day window against targets.
          </p>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-500" data-testid="loading-state">
            Loading analytics…
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950 border border-red-700 rounded-xl text-red-300 mb-6" data-testid="error-state">
            Error: {error}
          </div>
        )}

        {data && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="summary-bar">
              {[
                { label: "Total events today", value: data.goals.reduce((s, g) => s + g.count_today, 0) },
                { label: "Total events (30d)", value: data.goals.reduce((s, g) => s + g.count_30d, 0) },
                { label: "Goals on track (≥40%)", value: data.goals.filter(g => g.pct_of_target >= 40).length },
                { label: "Goals hitting target (≥100%)", value: data.goals.filter(g => g.pct_of_target >= 100).length },
              ].map(s => (
                <div key={s.label} className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-center">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Goal cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8" data-testid="goals-grid">
              {data.goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
            </div>

            {/* Funnel */}
            <div className="p-6 bg-gray-900 border border-gray-700 rounded-xl mb-8" data-testid="funnel-section">
              <h2 className="text-white font-semibold mb-6">Activation funnel (30 days)</h2>
              <div className="flex items-center gap-2">
                <FunnelStep label="Signups" value={funnel!.signups} max={maxFunnel} isFirst />
                <FunnelStep label="Projects" value={funnel!.projects_created} max={Math.max(funnel!.signups, 1)} isFirst={false} />
                <FunnelStep label="Runs" value={funnel!.runs_completed} max={Math.max(funnel!.projects_created, 1)} isFirst={false} />
                <FunnelStep label="Patches" value={funnel!.patches_downloaded} max={Math.max(funnel!.runs_completed, 1)} isFirst={false} />
              </div>
            </div>

            {/* Recent events */}
            <div className="p-6 bg-gray-900 border border-gray-700 rounded-xl" data-testid="recent-events">
              <h2 className="text-white font-semibold mb-4">Recent events (last 20)</h2>
              {data.recent_events.length === 0 ? (
                <p className="text-gray-500 text-sm">No events yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.recent_events.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-400 font-mono text-xs px-2 py-0.5 bg-indigo-950 border border-indigo-800 rounded">
                          {ev.event_name}
                        </span>
                        <span className="text-gray-500 text-xs">{ev.distinct_id || "anonymous"}</span>
                      </div>
                      <span className="text-gray-600 text-xs">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Goals reference */}
        <div className="mt-8 p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="goals-reference">
          <h2 className="text-white font-semibold mb-3 text-sm">Goal targets (30-day window)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-2 pr-4 font-medium">Goal</th>
                  <th className="text-left text-gray-400 py-2 pr-4 font-medium">Event name(s)</th>
                  <th className="text-right text-gray-400 py-2 font-medium">30d Target</th>
                </tr>
              </thead>
              <tbody className="text-gray-300 text-xs">
                {[
                  { name: "Projects Created", events: "project.created", target: 50, rationale: "Activated orgs proxy" },
                  { name: "Runs Completed", events: "run.completed", target: 500, rationale: "Core engagement" },
                  { name: "Patches Downloaded", events: "patch.downloaded, patch_downloaded", target: 100, rationale: "AI value delivery" },
                  { name: "User Signups", events: "user.signup", target: 30, rationale: "Top of funnel" },
                  { name: "Templates Viewed", events: "template.viewed", target: 200, rationale: "SEO + activation intent" },
                ].map(r => (
                  <tr key={r.name} className="border-b border-gray-800">
                    <td className="py-2 pr-4 text-white">{r.name}</td>
                    <td className="py-2 pr-4 font-mono text-green-300">{r.events}</td>
                    <td className="py-2 text-right font-semibold">{r.target}<span className="text-gray-500 font-normal ml-1">— {r.rationale}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
