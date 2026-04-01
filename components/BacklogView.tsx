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
}

export function BacklogView({
  tasks, selectedId, editingId, canPromote,
  onSelect, onComplete, onDelete, onStartEdit,
  onSaveEdit, onCancelEdit, onPromote,
}: BacklogViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Backlog</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full border font-mono text-gray-600 border-gray-700 ml-0">
          {tasks.length}
        </span>
        {!canPromote && (
          <span className="ml-auto text-[10px] text-gray-700">Today full</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3 opacity-20">📋</div>
          <p className="text-sm text-gray-600">Backlog is empty</p>
          <p className="text-xs text-gray-700 mt-1">
            Press <kbd className="text-gray-500">N</kbd> to add a task
          </p>
        </div>
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
        </div>
      )}
    </div>
  );
}
