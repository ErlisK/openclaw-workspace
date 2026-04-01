"use client";

/**
 * ExportModal — data portability UI
 *
 * Lets users download their tasks as:
 *   - CSV  (opens in spreadsheet apps)
 *   - JSON (full snapshot for portability / re-import)
 *
 * Privacy-first:
 *   - All data is local (localStorage)
 *   - No server upload
 *   - Copy-to-clipboard option for sharing single tasks
 */

import { useState } from "react";
import type { Task } from "@/lib/types";
import { downloadCSV, downloadJSON, tasksToCSV } from "@/lib/export";

interface ExportModalProps {
  tasks:   Task[];
  onClose: () => void;
}

type Format = "csv" | "json";

export function ExportModal({ tasks, onClose }: ExportModalProps) {
  const [done,     setDone]     = useState<Format | null>(null);
  const [copied,   setCopied]   = useState(false);
  const [preview,  setPreview]  = useState(false);

  const activeTasks    = tasks.filter((t) => t.status !== "deleted");
  const completedCount = activeTasks.filter((t) => t.status === "completed").length;
  const activeCount    = activeTasks.filter((t) => t.status === "active").length;

  const handleExport = (fmt: Format) => {
    if (fmt === "csv")  downloadCSV(activeTasks);
    if (fmt === "json") downloadJSON(activeTasks);
    setDone(fmt);
    setTimeout(() => setDone(null), 3000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tasksToCSV(activeTasks));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard permission denied */
    }
  };

  const csvPreview = tasksToCSV(activeTasks).split("\n").slice(0, 4).join("\n");

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export your data"
    >
      <div
        className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">Export Your Data</h2>
            <p className="text-[11px] text-gray-600 mt-0.5">
              {activeCount} active · {completedCount} completed
              {" "}· all stored locally
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 text-lg transition-all"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-5 py-3 bg-[#0d0d0d] border-b border-[#1a1a1a] flex gap-4">
          {[
            { label: "Total tasks",   value: activeTasks.length },
            { label: "Completed",     value: completedCount },
            { label: "Active",        value: activeCount },
          ].map(({ label, value }) => (
            <div key={label} className="text-center flex-1">
              <div className="text-base font-bold text-gray-200">{value}</div>
              <div className="text-[10px] text-gray-600">{label}</div>
            </div>
          ))}
        </div>

        {/* Format buttons */}
        <div className="p-5 space-y-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Choose format</p>

          {/* CSV */}
          <button
            onClick={() => handleExport("csv")}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#151515] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#333] transition-all text-left touch-manipulation min-h-[64px] group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-base">
              📊
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
                CSV spreadsheet
                {done === "csv" && (
                  <span className="text-[10px] text-emerald-400 font-normal">✓ Downloaded</span>
                )}
              </div>
              <div className="text-[11px] text-gray-600 truncate">
                Opens in Excel, Google Sheets, Numbers
              </div>
            </div>
            <span className="text-gray-700 group-hover:text-gray-400 text-xs transition-colors">↓</span>
          </button>

          {/* JSON */}
          <button
            onClick={() => handleExport("json")}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#151515] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#333] transition-all text-left touch-manipulation min-h-[64px] group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-base">
              🗃️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
                JSON snapshot
                {done === "json" && (
                  <span className="text-[10px] text-emerald-400 font-normal">✓ Downloaded</span>
                )}
              </div>
              <div className="text-[11px] text-gray-600 truncate">
                Full data + analytics · portable · re-importable
              </div>
            </div>
            <span className="text-gray-700 group-hover:text-gray-400 text-xs transition-colors">↓</span>
          </button>

          {/* Copy to clipboard */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0f0f0f] hover:bg-[#141414] border border-dashed border-[#222] hover:border-[#2a2a2a] transition-all text-left touch-manipulation min-h-[48px] group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 text-sm">
              {copied ? "✓" : "⎘"}
            </div>
            <span className={`text-xs transition-colors ${copied ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"}`}>
              {copied ? "Copied to clipboard!" : "Copy CSV to clipboard"}
            </span>
          </button>
        </div>

        {/* CSV preview */}
        <div className="px-5 pb-5">
          <button
            onClick={() => setPreview((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] text-gray-700 hover:text-gray-500 mb-2 transition-colors"
          >
            <span>{preview ? "▾" : "▸"}</span>
            Preview CSV
          </button>
          {preview && (
            <pre className="text-[10px] text-gray-600 bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre">
              {csvPreview}
              {activeTasks.length > 3 && `\n… ${activeTasks.length - 3} more rows`}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1a1a1a] bg-[#0d0d0d] flex items-center gap-2">
          <span className="text-[10px] text-gray-700">🔒</span>
          <p className="text-[10px] text-gray-700">
            Your data never leaves your device · no server upload ·{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer"
               className="text-gray-600 hover:text-gray-400 underline underline-offset-2">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
