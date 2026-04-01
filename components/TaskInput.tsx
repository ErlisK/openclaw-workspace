"use client";

import { useRef, useEffect, useState } from "react";
import type { Priority, TaskList } from "@/lib/types";

interface TaskInputProps {
  defaultList:    TaskList;
  canAddToToday:  boolean;
  onSubmit:       (text: string, priority: Priority, list: TaskList) => void;
  onCancel:       () => void;
}

const PRIORITY_STYLE: Record<Priority, string> = {
  high:   "text-red-400    border-red-500",
  medium: "text-yellow-400 border-yellow-500",
  low:    "text-green-400  border-green-500",
};

export function TaskInput({ defaultList, canAddToToday, onSubmit, onCancel }: TaskInputProps) {
  const ref       = useRef<HTMLInputElement>(null);
  const [text,     setText]     = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [list,     setList]     = useState<TaskList>(defaultList);

  useEffect(() => { ref.current?.focus(); }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && text.trim()) { onSubmit(text, priority, list); }
    else if (e.key === "Escape")          { onCancel(); }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-emerald-500/40 bg-[#0f1f18]">
      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* List selector */}
        <div className="flex gap-1">
          {(["today", "backlog"] as TaskList[]).map((l) => (
            <button
              key={l}
              onClick={() => setList(l)}
              disabled={l === "today" && !canAddToToday && defaultList !== "today"}
              title={l === "today" && !canAddToToday ? "Today is full (3/3)" : undefined}
              className={`px-2 py-0.5 rounded text-xs border transition-all ${
                list === l
                  ? l === "today"
                    ? "text-emerald-400 border-emerald-500 bg-emerald-400/10"
                    : "text-blue-400 border-blue-500 bg-blue-400/10"
                  : "text-gray-600 border-gray-700 hover:border-gray-500"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {l === "today" ? "Today" : "Backlog"}
            </button>
          ))}
        </div>

        {/* Priority selector */}
        <div className="flex gap-1 ml-auto">
          {(["high", "medium", "low"] as Priority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`px-1.5 py-0.5 rounded text-xs border transition-all ${
                priority === p
                  ? PRIORITY_STYLE[p] + " bg-white/5"
                  : "text-gray-600 border-gray-700 hover:border-gray-500"
              }`}
              title={`Priority: ${p}`}
            >
              {p[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="What needs to be done? (Enter to save)"
          className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none"
          maxLength={200}
        />
        <span className="text-xs text-gray-700">{text.length}/200</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-700">
        <kbd className="px-1 py-0.5 bg-[#1e1e1e] border border-[#2e2e2e] rounded text-[10px]">Enter</kbd>
        <span>save</span>
        <kbd className="px-1 py-0.5 bg-[#1e1e1e] border border-[#2e2e2e] rounded text-[10px]">Esc</kbd>
        <span>cancel</span>
      </div>
    </div>
  );
}
