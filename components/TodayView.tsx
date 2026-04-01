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
}

export function TodayView({
  tasks, selectedId, editingId, focusMode,
  onSelect, onComplete, onDelete, onStartEdit,
  onSaveEdit, onCancelEdit, onDemote,
}: TodayViewProps) {
  const isFull = tasks.length >= TODAY_CAP;

  return (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-1.5 h-1.5 rounded-full ${isFull ? "bg-emerald-400" : "bg-emerald-600"}`} />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Today</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-mono ${
          isFull
            ? "text-emerald-400 border-emerald-500/40 bg-emerald-400/10"
            : "text-gray-600 border-gray-700"
        }`}>
          {tasks.length}/{TODAY_CAP}
        </span>
        {focusMode && (
          <span className="ml-auto text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">FOCUS</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3 opacity-20">⬆</div>
          <p className="text-sm text-gray-600">No tasks for today</p>
          <p className="text-xs text-gray-700 mt-1">
            Promote from Backlog with <kbd className="text-gray-500">P</kbd>
          </p>
        </div>
      ) : (
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
      )}

      {/* Cap indicator */}
      {isFull && (
        <p className="text-[10px] text-emerald-600/60 text-center mt-4">
          Today is full · complete or demote to add more
        </p>
      )}
    </div>
  );
}
