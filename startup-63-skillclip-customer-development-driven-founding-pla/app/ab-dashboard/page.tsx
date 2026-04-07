"use client";

import { useEffect, useState } from "react";

interface VariantStat {
  variant_key: string;
  counts: Record<string, number>;
  ctr: string;
  formStartRate: string;
  conversionRate: string;
  formCompletionRate: string;
  roleCounts: Record<string, number>;
}

interface DashboardData {
  stats: VariantStat[];
  waitlistByVariant: Record<string, number>;
  totalWaitlist: number;
  generatedAt: string;
}

const VARIANT_META: Record<string, { name: string; color: string; desc: string }> = {
  control: { name: "Code-Tagged Micro-Badges", color: "#facc15", desc: "Jurisdiction compliance & badge credentialing" },
  mentor:  { name: "Live Mentor Verification",  color: "#3b82f6", desc: "Human verification & trust" },
  speed:   { name: "90-Second Proof",           color: "#22c55e", desc: "Speed & friction elimination" },
};

function pct(n: string) {
  return `${n}%`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function ABDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ab/stats");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading A/B test data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  const winner = data?.stats.reduce((best, curr) => {
    return parseFloat(curr.conversionRate) > parseFloat(best?.conversionRate || "0") ? curr : best;
  }, data?.stats[0]);

  return (
    <main className="min-h-screen bg-[#0f1117] text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <a href="/" className="text-2xl font-black mb-1 block">
              Cert<span className="text-yellow-400">Clip</span>
            </a>
            <h1 className="text-3xl font-black">A/B Test Dashboard</h1>
            <p className="text-gray-400 mt-1 text-sm">
              Value-prop smoke test · 3 variants · Real-time funnel tracking
            </p>
          </div>
          <div className="text-right">
            <button
              onClick={fetchData}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              ↻ Refresh
            </button>
            <div className="text-xs text-gray-600 mt-2">
              Updated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : "—"}
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Total Impressions"
            value={data?.stats.reduce((s, v) => s + v.counts.impression, 0) || 0}
          />
          <StatCard
            label="Total CTA Clicks"
            value={data?.stats.reduce((s, v) => s + v.counts.cta_click, 0) || 0}
          />
          <StatCard
            label="Total Conversions"
            value={data?.stats.reduce((s, v) => s + v.counts.form_complete, 0) || 0}
          />
          <StatCard
            label="Waitlist Signups"
            value={data?.totalWaitlist || 0}
            sub="All sources"
          />
        </div>

        {/* Winner banner */}
        {winner && parseFloat(winner.conversionRate) > 0 && (
          <div className="mb-8 bg-green-500/10 border border-green-500/30 rounded-xl px-6 py-4 flex items-center gap-4">
            <div className="text-2xl">🏆</div>
            <div>
              <div className="font-bold text-green-400 text-sm">Current Leader</div>
              <div className="font-black text-lg">
                {VARIANT_META[winner.variant_key]?.name}{" "}
                <span className="text-green-400">({pct(winner.conversionRate)} conversion)</span>
              </div>
              <div className="text-xs text-gray-500">{VARIANT_META[winner.variant_key]?.desc}</div>
            </div>
          </div>
        )}

        {/* Variant Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {data?.stats.map((v) => {
            const meta = VARIANT_META[v.variant_key];
            const isLeader = winner?.variant_key === v.variant_key && parseFloat(v.conversionRate) > 0;

            return (
              <div
                key={v.variant_key}
                className={`bg-white/5 rounded-2xl border p-6 ${isLeader ? "border-green-500/40" : "border-white/10"}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{ color: meta.color }}
                    >
                      {v.variant_key}
                    </div>
                    <div className="font-black text-base">{meta.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{meta.desc}</div>
                  </div>
                  {isLeader && (
                    <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">
                      Leader
                    </span>
                  )}
                </div>

                {/* Funnel */}
                <div className="space-y-3 mb-5">
                  {[
                    { label: "Impressions", count: v.counts.impression, pctVal: "100%" },
                    { label: "CTA Clicks", count: v.counts.cta_click, pctVal: pct(v.ctr) },
                    { label: "Form Started", count: v.counts.form_start, pctVal: pct(v.formStartRate) },
                    { label: "Form Completed", count: v.counts.form_complete, pctVal: pct(v.conversionRate) },
                  ].map((step) => (
                    <div key={step.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{step.label}</span>
                        <span className="font-mono text-white">
                          {step.count} <span className="text-gray-500">({step.pctVal})</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: step.pctVal,
                            background: meta.color,
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="font-black text-xl" style={{ color: meta.color }}>
                      {pct(v.ctr)}
                    </div>
                    <div className="text-xs text-gray-500">CTR</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="font-black text-xl" style={{ color: meta.color }}>
                      {pct(v.conversionRate)}
                    </div>
                    <div className="text-xs text-gray-500">Conversion</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="font-black text-xl text-white">
                      {pct(v.formCompletionRate)}
                    </div>
                    <div className="text-xs text-gray-500">Form Completion</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="font-black text-xl text-white">
                      {data?.waitlistByVariant[v.variant_key] || 0}
                    </div>
                    <div className="text-xs text-gray-500">Waitlist Adds</div>
                  </div>
                </div>

                {/* Role breakdown */}
                {Object.keys(v.roleCounts).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-gray-500 mb-2">Conversions by role</div>
                    <div className="space-y-1">
                      {Object.entries(v.roleCounts).map(([role, count]) => (
                        <div key={role} className="flex justify-between text-xs">
                          <span className="text-gray-400 capitalize">{role}</span>
                          <span className="font-mono text-white">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Variant copy comparison */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10">
          <h2 className="font-black text-lg mb-5">Variant Copy Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 font-medium pb-3 pr-4">Variant</th>
                  <th className="text-left text-gray-400 font-medium pb-3 pr-4">Headline</th>
                  <th className="text-left text-gray-400 font-medium pb-3 pr-4">CTA</th>
                  <th className="text-left text-gray-400 font-medium pb-3">CTR</th>
                </tr>
              </thead>
              <tbody>
                {data?.stats.map((v) => {
                  const meta = VARIANT_META[v.variant_key];
                  const headlines: Record<string, string> = {
                    control: "Your skills are real. Now prove it in 90 seconds.",
                    mentor: "Get verified by a real journeyman. In 30 minutes.",
                    speed: "Hired faster. One short video does the work of weeks of paperwork.",
                  };
                  const ctas: Record<string, string> = {
                    control: "Get Your Free Badge →",
                    mentor: "Book a Free Verification →",
                    speed: "Upload Your First Clip →",
                  };
                  return (
                    <tr key={v.variant_key} className="border-b border-white/5">
                      <td className="py-3 pr-4">
                        <span className="font-bold text-xs" style={{ color: meta.color }}>
                          {v.variant_key}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-300 max-w-xs">{headlines[v.variant_key]}</td>
                      <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{ctas[v.variant_key]}</td>
                      <td className="py-3">
                        <span className="font-mono font-bold" style={{ color: meta.color }}>
                          {pct(v.ctr)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Decision framework */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="font-black text-lg mb-4">Statistical Decision Framework</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {[
              {
                title: "Minimum Sample for Significance",
                body: "Need ≥100 impressions per variant for directional signal. Need ≥30 conversions per variant for 90% statistical significance (p<0.1).",
              },
              {
                title: "Primary Metric",
                body: "Form completion rate (impressions → form_complete). This is the north star — someone who signs up has real intent.",
              },
              {
                title: "Declare Winner When",
                body: "One variant leads by ≥20% relative lift with ≥100 impressions each. Run for minimum 7 days to account for day-of-week variance.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 rounded-xl p-4">
                <div className="font-bold text-xs text-gray-300 mb-2">{item.title}</div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-8 text-xs text-gray-600">
          CertClip A/B Test Dashboard · certclip.com · Auto-refreshes every 30s
        </div>
      </div>
    </main>
  );
}
