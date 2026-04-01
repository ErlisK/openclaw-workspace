"use client";

import { HOTKEY_MAP } from "@/lib/types";

interface HelpModalProps { onClose: () => void; }

export function HelpModal({ onClose }: HelpModalProps) {
  const sections = [
    { title: "Global",       keys: HOTKEY_MAP.filter((h) => h.context === "global")   },
    { title: "Task selected",keys: HOTKEY_MAP.filter((h) => h.context === "selected") },
    { title: "Input mode",   keys: HOTKEY_MAP.filter((h) => h.context === "input")    },
  ];

  const K = ({ k }: { k: string }) => (
    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[#252525] border border-[#353535] text-gray-300 font-mono">
      {k === " " ? "Space" : k}
    </kbd>
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-200">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 w-6 h-6 flex items-center justify-center rounded hover:bg-white/5">×</button>
        </div>
        <div className="space-y-4">
          {sections.map(({ title, keys }) => (
            <div key={title}>
              <h3 className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{title}</h3>
              <div className="space-y-1.5">
                {keys.map((h) => (
                  <div key={h.action} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-400">{h.description}</span>
                    <span className="flex gap-1 flex-shrink-0">
                      {h.keys.map((k) => <K key={k} k={k} />)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#222] mt-3" />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-700 text-center mt-2">
          Press <K k="?" /> to close
        </p>
      </div>
    </div>
  );
}
