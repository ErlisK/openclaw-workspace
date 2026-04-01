"use client";

import { getStats } from "@/lib/analytics";
import { useEffect, useState } from "react";

interface DashboardProps { onClose: () => void; }

export function Dashboard({ onClose }: DashboardProps) {
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

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Hypothesis Dashboard</h2>
            <p className="text-xs text-gray-600 mt-0.5">Local buffer · {s.totalEvents} events</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 w-6 h-6 flex items-center justify-center rounded hover:bg-white/5">×</button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <M label="H1 Median time" value={sec(s.medianCompletionSec)} target="< 60s" pass={s.h1Pass ?? null} />
          <M label="H2 Keyboard %"  value={pct(s.kbCompletionPct)}     target="≥ 70%"  pass={s.h2Pass ?? null} />
          <M label="H3 Error rate"  value={`${s.errorRatePct}%`}       target="< 1%"   pass={s.h3Pass} />
        </div>

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
        <p className="mt-4 text-[10px] text-gray-700 text-center">
          Data stored locally · PostHog receives events when configured
        </p>
      </div>
    </div>
  );
}
