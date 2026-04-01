"use client";

import { HOTKEY_MAP } from "@/lib/types";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const globalKeys = HOTKEY_MAP.filter((h) => h.context === "global");
  const selectedKeys = HOTKEY_MAP.filter((h) => h.context === "selected");
  const inputKeys = HOTKEY_MAP.filter((h) => h.context === "input");

  const KeyBadge = ({ keys }: { keys: string[] }) => (
    <span className="flex gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="px-1.5 py-0.5 rounded text-xs bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 font-mono"
        >
          {k === " " ? "Space" : k}
        </kbd>
      ))}
    </span>
  );

  const Section = ({
    title,
    hotkeys,
  }: {
    title: string;
    hotkeys: typeof HOTKEY_MAP;
  }) => (
    <div>
      <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">{title}</h3>
      <div className="space-y-1.5">
        {hotkeys.map((h) => (
          <div key={h.action} className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-300">{h.description}</span>
            <KeyBadge keys={h.keys} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-200">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-300 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          <Section title="Global" hotkeys={globalKeys} />
          <div className="border-t border-[#2e2e2e]" />
          <Section title="Task selected" hotkeys={selectedKeys} />
          <div className="border-t border-[#2e2e2e]" />
          <Section title="Input mode" hotkeys={inputKeys} />
        </div>

        <p className="mt-5 text-xs text-gray-600 text-center">
          Press <kbd className="px-1 py-0.5 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-[10px] font-mono">?</kbd> to close
        </p>
      </div>
    </div>
  );
}
