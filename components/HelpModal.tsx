"use client";

/**
 * HelpModal — keyboard shortcut cheat sheet + quick reference
 *
 * Redesign over original:
 * - Grouped by workflow context (not just technical context)
 * - Colour-coded sections
 * - Inline "try it" hints
 * - Core Loop visualisation at top
 * - Closes on Escape (handled by parent via onClose)
 */

import { HOTKEY_MAP } from "@/lib/types";

interface HelpModalProps { onClose: () => void; }

const K = ({ k }: { k: string }) => (
  <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[#1e1e1e] border border-[#333] text-gray-300 font-mono leading-none">
    {k === " " ? "Space" : k}
  </kbd>
);

const sections = [
  {
    title:  "Add & navigate",
    color:  "text-blue-400",
    border: "border-blue-500/20",
    bg:     "bg-blue-500/5",
    keys:   HOTKEY_MAP.filter((h) =>
      ["new_task", "switch_view", "navigate_up", "navigate_down", "escape"].includes(h.action)
    ),
  },
  {
    title:  "Task actions",
    color:  "text-emerald-400",
    border: "border-emerald-500/20",
    bg:     "bg-emerald-500/5",
    keys:   HOTKEY_MAP.filter((h) =>
      ["complete_task", "delete_task", "edit_task", "promote_task", "demote_task"].includes(h.action)
    ),
  },
  {
    title:  "Priority",
    color:  "text-yellow-500",
    border: "border-yellow-500/20",
    bg:     "bg-yellow-500/5",
    keys:   HOTKEY_MAP.filter((h) =>
      ["set_priority_1", "set_priority_2", "set_priority_3"].includes(h.action)
    ),
  },
  {
    title:  "Focus & view",
    color:  "text-purple-400",
    border: "border-purple-500/20",
    bg:     "bg-purple-500/5",
    keys:   HOTKEY_MAP.filter((h) =>
      ["toggle_focus", "toggle_help"].includes(h.action)
    ),
  },
];

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">Keyboard Shortcuts</h2>
            <p className="text-[11px] text-gray-600 mt-0.5">FocusDo is designed for keyboard-first use</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 text-lg transition-all"
            aria-label="Close shortcuts"
          >
            ×
          </button>
        </div>

        {/* Core loop */}
        <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Core loop</p>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <K k="N" /><span className="text-gray-700">add</span>
            </span>
            <span className="text-gray-800">→</span>
            <span className="flex items-center gap-1">
              <K k="j" /><K k="k" /><span className="text-gray-700">select</span>
            </span>
            <span className="text-gray-800">→</span>
            <span className="flex items-center gap-1">
              <K k="P" /><span className="text-gray-700">today</span>
            </span>
            <span className="text-gray-800">→</span>
            <span className="flex items-center gap-1 text-emerald-600">
              <K k="Space" /><span>done</span>
            </span>
          </div>
        </div>

        {/* Shortcut sections */}
        <div className="divide-y divide-[#1a1a1a] max-h-[60vh] overflow-y-auto">
          {sections.map(({ title, color, border, bg, keys }) => {
            if (keys.length === 0) return null;
            return (
              <div key={title} className={`px-5 py-3 ${bg}`}>
                <h3 className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${color}`}>
                  {title}
                </h3>
                <div className="space-y-2">
                  {keys.map((h) => (
                    <div key={h.action} className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">{h.description}</span>
                      <span className="flex gap-1 flex-shrink-0">
                        {h.keys.map((k, i) => (
                          <span key={k} className="flex items-center gap-1">
                            {i > 0 && <span className="text-gray-700 text-[10px]">/</span>}
                            <K k={k} />
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t border-[#1e1e1e] bg-[#0d0d0d] flex items-center justify-between`}>
          <p className="text-[10px] text-gray-700">
            Press <K k="?" /> or <K k="Esc" /> to close
          </p>
          <p className="text-[10px] text-gray-700">
            <span className="text-emerald-700">✦</span> Focus Mode: <K k="F" />
          </p>
        </div>
      </div>
    </div>
  );
}
