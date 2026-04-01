"use client";

import type { Task } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { getFocusTasks } from "@/lib/tasks";

interface FocusModeProps {
  tasks: Task[];
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onComplete: (id: string, method: "keyboard" | "mouse") => void;
  onDelete: (id: string, method: "keyboard" | "mouse") => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, text: string) => void;
  onCancelEdit: () => void;
}

export function FocusMode({
  tasks,
  selectedId,
  editingId,
  onSelect,
  onComplete,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: FocusModeProps) {
  const focusTasks = getFocusTasks(tasks);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium uppercase tracking-widest">
            Focus Mode
          </span>
          <span className="text-xs text-gray-600 ml-auto">
            Showing {focusTasks.length} of {tasks.filter(t => t.status === "active").length} tasks
          </span>
        </div>

        {focusTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-gray-400 text-sm">All clear. Add a task to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {focusTasks.map((task, i) => (
              <div key={task.id} className="relative">
                {/* Slot indicator */}
                <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs text-gray-700 font-mono">
                  {i + 1}
                </span>
                <TaskItem
                  task={task}
                  isSelected={selectedId === task.id}
                  isEditing={editingId === task.id}
                  focusMode={true}
                  onSelect={() => onSelect(task.id)}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onStartEdit={onStartEdit}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                />
              </div>
            ))}
          </div>
        )}

        {/* Focus hint */}
        <p className="text-xs text-gray-700 text-center mt-6">
          Top 3 by priority · Press <kbd className="text-gray-500">f</kbd> to exit focus mode
        </p>
      </div>
    </div>
  );
}
