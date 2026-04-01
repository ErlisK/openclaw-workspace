"use client";

import { getStats } from "@/lib/analytics";
import { useEffect, useState } from "react";
import type { Task } from "@/lib/types";

interface DashboardProps {
  tasks:   Task[];
  onClose: () => void;
  onExport: () => void;
}

export function Dashboard({ tasks, onClose, onExport }: DashboardProps) {
  const [s, setS] = useState<ReturnType<typeof getStats> | null>(null);
  useEffect(() => { setS(getStats()); }, []);
  if (!s) return null;

  const pct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}%`);
  const sec = (n: number | null) => (n == null ? "—" : `${n}s`);

  const M = ({ label, value, target, pass }: {
    label: string; value: string; target: string; pass: boolean | null;
  }) => (
    <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider leading-tight">{label}</span>
        {pass === null
          ? <span className="text-[10px] text-gray-700">no data</span>
          : pass
            ? <span className="text-[10px] text-emerald-400 font-semibold">PASS</span>
            : <span className="text-[10px] text-red-400 font-semibold">FAIL</span>
        }
      </div>
      <div className="text-xl font-bold text-gray-100 mb-0.5">{value}</div>
      <div className="text-[10px] text-gray-700">Target: {target}</div>
    </div>
  );

  const activeTasks = tasks.filter((t) => t.status !== "deleted");

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Hypothesis dashboard"
    >
      <div
        className="bg-[#141414] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Hypothesis Dashboard</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Local buffer · {s.totalEvents} events · {activeTasks.length} tasks
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-300 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-lg transition-all"
            aria-label="Close dashboard"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Hypothesis metrics */}
          <div className="grid grid-cols-3 gap-2">
            <M label="H1 Median time" value={sec(s.medianCompletionSec)} target="< 60s"  pass={s.h1Pass ?? null} />
            <M label="H2 Keyboard %"  value={pct(s.kbCompletionPct)}     target="≥ 70%"  pass={s.h2Pass ?? null} />
            <M label="H3 Error rate"  value={`${s.errorRatePct}%`}       target="< 1%"   pass={s.h3Pass} />
          </div>

          {/* Activity counters */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Created",   v: s.totalCreations },
              { label: "Completed", v: s.totalCompletions },
              { label: "Shortcuts", v: s.keyboardShortcutUses },
            ].map(({ label, v }) => (
              <div key={label} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                <div className="text-[10px] text-gray-600 mb-1">{label}</div>
                <div className="text-xl font-bold text-gray-200">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer: export + info */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <p className="text-[10px] text-gray-700 flex-1">
            Data stored locally · PostHog receives events when configured
          </p>
          <button
            onClick={() => { onClose(); onExport(); }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#333] rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-all touch-manipulation min-h-[36px]"
            aria-label="Export tasks"
          >
            <span>↓</span>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
