"use client";

import { getStats } from "@/lib/analytics";
import { useEffect, useState } from "react";

interface DashboardProps {
  onClose: () => void;
}

interface Stats {
  medianCompletionSec: number | null;
  h1Pass: boolean;
  kbCompletionPct: number | null;
  h2Pass: boolean | null;
  errorRatePct: number;
  h3Pass: boolean;
  totalCreations: number;
  totalCompletions: number;
  keyboardShortcutUses: number;
}

export function Dashboard({ onClose }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setStats(getStats() as Stats);
  }, []);

  if (!stats) return null;

  const Metric = ({
    label,
    value,
    target,
    pass,
    unit = "",
  }: {
    label: string;
    value: string | number | null;
    target: string;
    pass: boolean | null;
    unit?: string;
  }) => (
    <div className="p-4 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e]">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        {pass === null ? (
          <span className="text-xs text-gray-600">no data</span>
        ) : pass ? (
          <span className="text-xs text-emerald-400 font-medium">✓ PASS</span>
        ) : (
          <span className="text-xs text-red-400 font-medium">✗ FAIL</span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-100 mb-1">
        {value === null ? "—" : `${value}${unit}`}
      </div>
      <div className="text-xs text-gray-600">Target: {target}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-[#2e2e2e] rounded-xl p-6 w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">MVP Hypothesis Dashboard</h2>
            <p className="text-xs text-gray-600 mt-0.5">Live metrics · localStorage buffer</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg">×</button>
        </div>

        {/* H1, H2, H3 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Metric
            label="H1 · Median capture→done"
            value={stats.medianCompletionSec !== null ? stats.medianCompletionSec.toFixed(1) : null}
            target="< 60s"
            pass={stats.h1Pass ?? null}
            unit="s"
          />
          <Metric
            label="H2 · Keyboard completions"
            value={stats.kbCompletionPct !== null ? stats.kbCompletionPct.toFixed(0) : null}
            target="≥ 70%"
            pass={stats.h2Pass ?? null}
            unit="%"
          />
          <Metric
            label="H3 · Error rate (48h)"
            value={stats.errorRatePct.toFixed(2)}
            target="< 1%"
            pass={stats.h3Pass}
            unit="%"
          />
        </div>

        {/* Supporting stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Tasks created", value: stats.totalCreations },
            { label: "Tasks completed", value: stats.totalCompletions },
            { label: "Shortcut uses", value: stats.keyboardShortcutUses },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e]">
              <div className="text-xs text-gray-600 mb-1">{s.label}</div>
              <div className="text-xl font-bold text-gray-200">{s.value}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-600 text-center">
          Data is stored locally · Phase 2 will flush to a real backend
        </p>
      </div>
    </div>
  );
}
