"use client";

/**
 * OnboardingPrompt — first-run experience for empty state
 *
 * Shows when:
 *   - localStorage has no tasks
 *   - User has never added a task (checked via analytics ring buffer)
 *
 * Design: minimal, keyboard-first. Three suggested tasks, inline
 * quick-add, dismiss to continue with blank state.
 *
 * Auto-dismissed once the user adds their first task.
 */

import { useState, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import type { Priority } from "@/lib/types";

interface OnboardingPromptProps {
  onAddTask: (text: string, priority: Priority, list: "backlog") => void;
  onDismiss: () => void;
}

const SUGGESTIONS = [
  "Review today's priorities",
  "Reply to urgent messages",
  "Clear one thing that's been waiting",
];

export function OnboardingPrompt({ onAddTask, onDismiss }: OnboardingPromptProps) {
  const [step, setStep]             = useState<"welcome" | "add">("welcome");
  const [input, setInput]           = useState("");
  const [addedCount, setAddedCount] = useState(0);
  const [dismissed, setDismissed]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "add") inputRef.current?.focus();
  }, [step]);

  // Auto-dismiss once 3 tasks added
  useEffect(() => {
    if (addedCount >= 3) {
      void track({ event: "session_started" } as never); // re-use session event to avoid custom type
      setTimeout(() => {
        setDismissed(true);
        onDismiss();
      }, 600);
    }
  }, [addedCount, onDismiss]);

  if (dismissed) return null;

  const handleAdd = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddTask(trimmed, "medium", "backlog");
    setAddedCount((c) => c + 1);
    setInput("");
    inputRef.current?.focus();
  };

  const handleSuggestion = (s: string) => {
    onAddTask(s, "medium", "backlog");
    setAddedCount((c) => c + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) { handleAdd(input); }
    if (e.key === "Escape") { onDismiss(); }
  };

  if (step === "welcome") {
    return (
      <div
        className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 to-[#0f0f0f] p-6 mb-6"
        role="region"
        aria-label="Onboarding"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-emerald-400 text-base">F</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-100 mb-1">
              Welcome to FocusDo
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Cap your day at <strong className="text-gray-400">3 tasks</strong>.
              Promote the most important ones to&nbsp;Today.
              Complete them. Done.
            </p>
          </div>
        </div>

        {/* The core loop, visualised */}
        <div className="flex items-center gap-1.5 mb-5 text-[11px] text-gray-600">
          <span className="bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-1 rounded-lg">Add to Backlog</span>
          <span>→</span>
          <span className="bg-emerald-950/60 border border-emerald-500/25 px-2 py-1 rounded-lg text-emerald-600">Promote 3 to Today</span>
          <span>→</span>
          <span className="bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-1 rounded-lg">Complete ✓</span>
        </div>

        {/* CTA */}
        <div className="flex gap-2">
          <button
            onClick={() => setStep("add")}
            className="flex-1 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-xs font-medium text-emerald-400 transition-all touch-manipulation min-h-[44px]"
            autoFocus
          >
            Add your first tasks
            <span className="ml-2 text-emerald-600/60 text-[10px]">
              <kbd className="bg-emerald-950 border border-emerald-900 px-1 rounded">Enter</kbd>
            </span>
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-2.5 text-xs text-gray-700 hover:text-gray-500 hover:bg-white/5 rounded-xl transition-all touch-manipulation"
            aria-label="Skip onboarding"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // step === "add"
  return (
    <div
      className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/30 to-[#0f0f0f] p-5 mb-6"
      role="region"
      aria-label="Add first tasks"
    >
      {/* Progress */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-6 h-1.5 rounded-full transition-all ${
                i < addedCount ? "bg-emerald-400" : "bg-[#2a2a2a]"
              }`}
              aria-hidden
            />
          ))}
        </div>
        <span className="text-[11px] text-gray-600">
          {addedCount === 0 && "Add your first 3 tasks"}
          {addedCount === 1 && "Nice! Add 2 more"}
          {addedCount === 2 && "One more…"}
          {addedCount >= 3 && "✓ All set!"}
        </span>
        <button
          onClick={onDismiss}
          className="ml-auto text-gray-700 hover:text-gray-500 text-xs transition-colors"
          aria-label="Done"
        >
          Done
        </button>
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          maxLength={200}
          className="flex-1 bg-[#141414] border border-[#2a2a2a] focus:border-emerald-500/50 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-700 outline-none transition-colors min-h-[44px]"
          aria-label="Task text"
        />
        <button
          onClick={() => handleAdd(input)}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-xs font-medium text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation min-h-[44px]"
        >
          Add
        </button>
      </div>

      {/* Suggestions (show only if < 3 added) */}
      {addedCount < 3 && (
        <div>
          <p className="text-[10px] text-gray-700 mb-1.5 uppercase tracking-wider">Suggestions</p>
          <div className="flex flex-col gap-1">
            {SUGGESTIONS.slice(addedCount).map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-left text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 px-2.5 py-2 rounded-lg transition-all touch-manipulation min-h-[36px] flex items-center gap-2"
              >
                <span className="text-gray-700">+</span>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
