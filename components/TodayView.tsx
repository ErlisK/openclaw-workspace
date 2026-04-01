"use client";

import type { Task } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { TODAY_CAP } from "@/lib/types";

interface TodayViewProps {
  tasks:         Task[];
  selectedId:    string | null;
  editingId:     string | null;
  focusMode:     boolean;
  onSelect:      (id: string) => void;
  onComplete:    (id: string, m: "keyboard" | "mouse") => void;
  onDelete:      (id: string, m: "keyboard" | "mouse") => void;
  onStartEdit:   (id: string) => void;
  onSaveEdit:    (id: string, t: string) => void;
  onCancelEdit:  () => void;
  onDemote:      (id: string, m: "keyboard" | "mouse") => void;
  /** Backlog count for contextual empty-state hint */
  backlogCount?: number;
}

export function TodayView({
  tasks, selectedId, editingId, focusMode,
  onSelect, onComplete, onDelete, onStartEdit,
  onSaveEdit, onCancelEdit, onDemote,
  backlogCount = 0,
}: TodayViewProps) {
  const isFull      = tasks.length >= TODAY_CAP;
  const remaining   = TODAY_CAP - tasks.length;
  const allDone     = tasks.length > 0 && tasks.every((t) => t.status === "completed");

  return (
    <div className="flex flex-col h-full">

      {/* ── Section header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
          isFull ? "bg-emerald-400" : "bg-emerald-700"
        }`} />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">
          Today
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-mono transition-colors ${
          isFull
            ? "text-emerald-400 border-emerald-500/40 bg-emerald-400/10"
            : "text-gray-600 border-gray-800"
        }`}>
          {tasks.length}/{TODAY_CAP}
        </span>

        {focusMode && (
          <span className="ml-auto text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-medium tracking-wide">
            FOCUS
          </span>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {tasks.length === 0 ? (
        <EmptyToday backlogCount={backlogCount} />
      ) : (
        <>
          {/* Task list */}
          <div className="space-y-1" role="list" aria-label="Today's tasks">
            {tasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                isSelected={selectedId === t.id}
                isEditing={editingId === t.id}
                onSelect={() => onSelect(t.id)}
                onComplete={onComplete}
                onDelete={onDelete}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onDemote={onDemote}
              />
            ))}
          </div>

          {/* All-done celebration */}
          {allDone && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-center">
              <p className="text-xs text-emerald-500 font-medium">🎉 Today's tasks done!</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Promote more from Backlog with <kbd className="bg-emerald-950 border border-emerald-900 px-1 rounded">P</kbd>
              </p>
            </div>
          )}

          {/* Full indicator */}
          {isFull && !allDone && (
            <p className="text-[10px] text-emerald-700/70 text-center mt-3">
              Today is full · complete or <kbd className="bg-[#141414] border border-[#252525] px-1 rounded">B</kbd> demote to add more
            </p>
          )}

          {/* Capacity hint */}
          {!isFull && !allDone && remaining > 0 && (
            <p className="text-[10px] text-gray-700 text-center mt-3">
              {remaining} slot{remaining !== 1 ? "s" : ""} remaining
              {backlogCount > 0 && (
                <> · <kbd className="bg-[#141414] border border-[#252525] px-1 rounded text-gray-600">P</kbd> promote from backlog</>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyToday({ backlogCount }: { backlogCount: number }) {
  if (backlogCount > 0) {
    // Backlog exists — guide user to promote
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-4">
        <div className="w-10 h-10 rounded-xl border border-[#2a2a2a] bg-[#141414] flex items-center justify-center mb-3 opacity-60">
          <span className="text-base">☀️</span>
        </div>
        <p className="text-sm text-gray-500 font-medium mb-1">Pick today's focus</p>
        <p className="text-xs text-gray-700 leading-relaxed max-w-[180px]">
          Select a backlog task and press{" "}
          <kbd className="bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded text-[10px] text-gray-500 font-mono">P</kbd>{" "}
          to promote it here.
        </p>
        <div className="mt-4 text-[10px] text-gray-800 space-y-0.5">
          <p>Max <strong className="text-gray-700">{TODAY_CAP} tasks</strong> per day</p>
          <p>Focus on what matters most</p>
        </div>
      </div>
    );
  }

  // Completely fresh — first run hint
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-4">
      <div className="w-10 h-10 rounded-xl border border-[#2a2a2a] bg-[#141414] flex items-center justify-center mb-3 opacity-50">
        <span className="text-base">✦</span>
      </div>
      <p className="text-sm text-gray-500 font-medium mb-1">Nothing here yet</p>
      <p className="text-xs text-gray-700 leading-relaxed max-w-[200px]">
        Add tasks to your Backlog, then promote up to{" "}
        <strong className="text-gray-600">{TODAY_CAP}</strong> to Today.
      </p>
      <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-700">
        <kbd className="bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded font-mono text-gray-600">N</kbd>
        <span>add task</span>
        <span className="text-gray-800">·</span>
        <kbd className="bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded font-mono text-gray-600">?</kbd>
        <span>shortcuts</span>
      </div>
    </div>
  );
}
