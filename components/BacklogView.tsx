"use client";

import type { Task } from "@/lib/types";
import { TaskItem } from "./TaskItem";

interface BacklogViewProps {
  tasks:         Task[];
  selectedId:    string | null;
  editingId:     string | null;
  canPromote:    boolean;
  onSelect:      (id: string) => void;
  onComplete:    (id: string, m: "keyboard" | "mouse") => void;
  onDelete:      (id: string, m: "keyboard" | "mouse") => void;
  onStartEdit:   (id: string) => void;
  onSaveEdit:    (id: string, t: string) => void;
  onCancelEdit:  () => void;
  onPromote:     (id: string, m: "keyboard" | "mouse") => void;
  /** Trigger new-task input from empty state CTA */
  onAddTask?:    () => void;
}

export function BacklogView({
  tasks, selectedId, editingId, canPromote,
  onSelect, onComplete, onDelete, onStartEdit,
  onSaveEdit, onCancelEdit, onPromote, onAddTask,
}: BacklogViewProps) {
  return (
    <div className="flex flex-col h-full">

      {/* ── Section header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-700" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">
          Backlog
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded-full border font-mono text-gray-600 border-gray-800">
          {tasks.length}
        </span>

        {!canPromote && tasks.length > 0 && (
          <span className="ml-auto text-[10px] text-gray-700 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-700 inline-block" />
            Today full
          </span>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {tasks.length === 0 ? (
        <EmptyBacklog onAddTask={onAddTask} />
      ) : (
        <div className="space-y-1 overflow-y-auto" role="list" aria-label="Backlog tasks">
          {tasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              isSelected={selectedId === t.id}
              isEditing={editingId === t.id}
              canPromote={canPromote}
              onSelect={() => onSelect(t.id)}
              onComplete={onComplete}
              onDelete={onDelete}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onPromote={onPromote}
            />
          ))}
          {/* Bottom hint */}
          {tasks.length > 3 && (
            <p className="text-[10px] text-gray-800 text-center py-2">
              {tasks.length} tasks · <kbd className="bg-[#141414] border border-[#252525] px-1 rounded text-gray-700">j</kbd>/<kbd className="bg-[#141414] border border-[#252525] px-1 rounded text-gray-700">k</kbd> to navigate
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyBacklog({ onAddTask }: { onAddTask?: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-4">
      <div className="w-10 h-10 rounded-xl border border-[#2a2a2a] bg-[#141414] flex items-center justify-center mb-3 opacity-50">
        <span className="text-base">📋</span>
      </div>
      <p className="text-sm text-gray-500 font-medium mb-1">Backlog is empty</p>
      <p className="text-xs text-gray-700 leading-relaxed max-w-[200px] mb-4">
        Capture everything here. Promote the most important ones to Today when you're ready.
      </p>

      {onAddTask && (
        <button
          onClick={onAddTask}
          className="px-4 py-2 bg-[#141414] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#333] rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-all touch-manipulation min-h-[36px] flex items-center gap-2"
        >
          <span className="text-emerald-600">+</span>
          Add a task
          <kbd className="bg-[#101010] border border-[#252525] px-1 rounded text-[10px] text-gray-700 font-mono">N</kbd>
        </button>
      )}

      <div className="mt-4 text-[10px] text-gray-800 space-y-0.5">
        <p>Tasks live in Backlog by default</p>
        <p>Promote to Today with <kbd className="bg-[#141414] border border-[#252525] px-1 rounded text-gray-700">P</kbd></p>
      </div>
    </div>
  );
}
