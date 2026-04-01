"use client";

import { useRef, useEffect, useState } from "react";
import type { Priority } from "@/lib/types";

interface TaskInputProps {
  onSubmit: (text: string, priority: Priority) => void;
  onCancel: () => void;
}

export function TaskInput({ onSubmit, onCancel }: TaskInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && text.trim()) {
      onSubmit(text, priority);
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const priorityColors: Record<Priority, string> = {
    high: "text-red-400 border-red-500",
    medium: "text-yellow-400 border-yellow-500",
    low: "text-green-400 border-green-500",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/40 bg-[#1a2a22]">
      <div className="flex gap-1">
        {(["high", "medium", "low"] as Priority[]).map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={`px-2 py-0.5 rounded text-xs border transition-all ${
              priority === p
                ? priorityColors[p] + " bg-white/5"
                : "text-gray-500 border-gray-700 hover:border-gray-500"
            }`}
            title={`Priority: ${p}`}
          >
            {p[0].toUpperCase()}
          </button>
        ))}
      </div>
      <input
        ref={ref}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="What needs doing? (Enter to save, Esc to cancel)"
        className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none"
        maxLength={200}
      />
      <span className="text-xs text-gray-600">{text.length}/200</span>
    </div>
  );
}
