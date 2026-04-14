"use client";
/**
 * /analytics-walkthrough — Public seeded analytics demo
 *
 * Seeds all 5 required events and shows the event log.
 * No auth required — used for validation and demos.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

const EVENTS = [
  { event: "user.signup", label: "User Signup", icon: "👤", desc: "New user registered" },
  { event: "project.created", label: "Project Created", icon: "📁", desc: "New DocsCI project created" },
  { event: "run.completed", label: "Run Completed", icon: "✅", desc: "CI run finished (pass)" },
  { event: "patch_downloaded", label: "Patch Downloaded", icon: "🔧", desc: "AI-generated patch downloaded" },
  { event: "template.viewed", label: "Template Viewed", icon: "📄", desc: "CI YAML template page visited" },
];

type EventResult = {
  event: string;
  label: string;
  icon: string;
  desc: string;
  status: "pending" | "firing" | "done" | "error";
  error?: string;
};

export default function AnalyticsWalkthroughPage() {
  const [results, setResults] = useState<EventResult[]>(
    EVENTS.map(e => ({ ...e, status: "pending" }))
  );
  const [done, setDone] = useState(false);
  const [goalsData, setGoalsData] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runWalkthrough() {
      const distinct_id = `walkthrough-${Date.now()}`;
      for (let i = 0; i < EVENTS.length; i++) {
        if (cancelled) break;
        const ev = EVENTS[i];
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "firing" } : r));
        await new Promise(r => setTimeout(r, 400));
        try {
          const res = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: ev.event,
              distinct_id,
              properties: { source: "analytics-walkthrough", step: i + 1 },
            }),
          });
          const ok = res.ok;
          setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: ok ? "done" : "error" } : r));
        } catch (e) {
          setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: String(e) } : r));
        }
        await new Promise(r => setTimeout(r, 200));
      }
      if (!cancelled) setDone(true);

      // Fetch goals summary after seeding
      try {
        const res = await fetch("/api/analytics/goals");
        const json = await res.json();
        if (json.goals) {
          const summary: Record<string, number> = {};
          for (const g of json.goals) summary[g.id] = g.count_30d;
          setGoalsData(summary);
        }
      } catch {}
    }

    runWalkthrough();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="analytics-walkthrough-page">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 text-sm">
        <Link href="/" className="text-white font-bold">DocsCI</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Analytics Walkthrough</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2" data-testid="page-h1">
          Analytics Walkthrough
        </h1>
        <p className="text-gray-400 mb-10">
          Firing all 5 core product analytics events and verifying they are captured.
          Each event is stored in Supabase (<code className="bg-gray-800 px-1 rounded">docsci_events</code>)
          and forwarded to PostHog if configured.
        </p>

        <div className="space-y-3 mb-10" data-testid="events-list">
          {results.map(r => (
            <div
              key={r.event}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                r.status === "done" ? "bg-green-950 border-green-700" :
                r.status === "error" ? "bg-red-950 border-red-700" :
                r.status === "firing" ? "bg-indigo-950 border-indigo-700 animate-pulse" :
                "bg-gray-900 border-gray-700"
              }`}
              data-testid={`event-row-${r.event.replace(/\./g, "-")}`}
            >
              <span className="text-2xl">{r.icon}</span>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{r.label}</p>
                <p className="text-gray-400 text-xs">{r.desc}</p>
                <code className="text-green-300 text-xs">{r.event}</code>
              </div>
              <div className="text-right">
                {r.status === "pending" && <span className="text-gray-500 text-xs">waiting…</span>}
                {r.status === "firing" && <span className="text-indigo-300 text-xs">firing…</span>}
                {r.status === "done" && <span className="text-green-400 font-bold">✓</span>}
                {r.status === "error" && <span className="text-red-400 font-bold">✗</span>}
              </div>
            </div>
          ))}
        </div>

        {done && (
          <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl mb-8" data-testid="completion-message">
            <h2 className="text-white font-semibold mb-2">
              {results.every(r => r.status === "done") ? "✅ All 5 events captured" : "⚠️ Some events failed"}
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Events are stored in Supabase and visible in the analytics dashboard.
            </p>
            {goalsData && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {Object.entries(goalsData).slice(0, 6).map(([id, count]) => (
                  <div key={id} className="text-center p-2 bg-gray-800 rounded-lg">
                    <p className="text-white font-bold text-lg">{count}</p>
                    <p className="text-gray-500 text-xs">{id.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/analytics"
              className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
            >
              View analytics dashboard →
            </Link>
          </div>
        )}

        <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="event-schema">
          <h2 className="text-white font-semibold mb-3 text-sm">Event schema</h2>
          <pre className="text-xs text-green-300 overflow-x-auto">{`// POST /api/events
{
  "event": "project.created",    // required — see allowlist
  "distinct_id": "user-uuid",    // optional
  "org_id": "org-uuid",          // optional
  "project_id": "project-uuid",  // optional
  "run_id": "run-uuid",          // optional
  "properties": {                // optional — arbitrary JSON
    "plan": "pro",
    "language": "python"
  }
}`}</pre>
        </div>
      </div>
    </div>
  );
}
