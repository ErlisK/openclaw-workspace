"use client";

import { useRef, useEffect, useState } from "react";
import type { Task } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  isEditing: boolean;
  focusMode?: boolean;
  onSelect: () => void;
  onComplete: (id: string, method: "keyboard" | "mouse") => void;
  onDelete: (id: string, method: "keyboard" | "mouse") => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, text: string) => void;
  onCancelEdit: () => void;
}

const priorityDot: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-yellow-400",
  low: "bg-green-400",
};

const priorityLabel: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-500",
  low: "text-green-500",
};

export function TaskItem({
  task,
  isSelected,
  isEditing,
  focusMode,
  onSelect,
  onComplete,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: TaskItemProps) {
  const editRef = useRef<HTMLInputElement>(null);
  const [editText, setEditText] = useState(task.text);

  useEffect(() => {
    if (isEditing) {
      setEditText(task.text);
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [isEditing, task.text]);

  const handleEditKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && editText.trim()) {
      onSaveEdit(task.id, editText);
    } else if (e.key === "Escape") {
      onCancelEdit();
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all select-none
        ${isSelected
          ? "bg-[#1e2e26] border border-emerald-500/50 shadow-[0_0_0_1px_#6ee7b733]"
          : "border border-transparent hover:bg-[#1a1a1a] hover:border-[#2e2e2e]"
        }
        ${focusMode ? "py-4" : ""}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete(task.id, "mouse");
        }}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
          ${isSelected ? "border-emerald-400" : "border-gray-600 group-hover:border-gray-400"}
          hover:border-emerald-400 hover:bg-emerald-400/10
        `}
        title="Complete (Space)"
        aria-label={`Complete: ${task.text}`}
      >
        {isSelected && (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-60" />
        )}
      </button>

      {/* Priority dot */}
      <div
        className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${priorityDot[task.priority]}`}
        title={`Priority: ${task.priority}`}
      />

      {/* Task text / edit */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={editRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKey}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-sm text-gray-100 outline-none border-b border-emerald-500/50 pb-0.5"
            maxLength={200}
          />
        ) : (
          <span
            className="text-sm text-gray-200 truncate block"
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartEdit(task.id);
            }}
          >
            {task.text}
          </span>
        )}
      </div>

      {/* Priority label — visible when selected */}
      {isSelected && (
        <span className={`text-xs ${priorityLabel[task.priority]} opacity-70 hidden sm:block`}>
          {task.priority}
        </span>
      )}

      {/* Action buttons — visible on hover/select */}
      <div
        className={`flex items-center gap-1 transition-opacity
          ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-70"}
        `}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(task.id);
          }}
          className="px-1.5 py-0.5 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5"
          title="Edit (E)"
        >
          e
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id, "mouse");
          }}
          className="px-1.5 py-0.5 rounded text-xs text-gray-600 hover:text-red-400 hover:bg-red-400/10"
          title="Delete (D)"
        >
          ×
        </button>
      </div>
    </div>
  );
}
