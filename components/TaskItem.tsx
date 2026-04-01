"use client";

import { useRef, useEffect, useState } from "react";
import type { Task, TaskList } from "@/lib/types";

interface TaskItemProps {
  task:          Task;
  isSelected:    boolean;
  isEditing:     boolean;
  canPromote?:   boolean;
  onSelect:      () => void;
  onComplete:    (id: string, method: "keyboard" | "mouse") => void;
  onDelete:      (id: string, method: "keyboard" | "mouse") => void;
  onStartEdit:   (id: string) => void;
  onSaveEdit:    (id: string, text: string) => void;
  onCancelEdit:  () => void;
  onPromote?:    (id: string, method: "keyboard" | "mouse") => void;
  onDemote?:     (id: string, method: "keyboard" | "mouse") => void;
}

const P_DOT:  Record<string, string> = { high: "bg-red-400", medium: "bg-yellow-400", low: "bg-green-400" };
const P_TEXT: Record<string, string> = { high: "text-red-400", medium: "text-yellow-500", low: "text-green-400" };

export function TaskItem({
  task, isSelected, isEditing, canPromote,
  onSelect, onComplete, onDelete, onStartEdit,
  onSaveEdit, onCancelEdit, onPromote, onDemote,
}: TaskItemProps) {
  const editRef   = useRef<HTMLInputElement>(null);
  const [editText, setEditText] = useState(task.text);

  useEffect(() => {
    if (isEditing) {
      setEditText(task.text);
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [isEditing, task.text]);

  const handleEditKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && editText.trim()) { onSaveEdit(task.id, editText); }
    else if (e.key === "Escape")              { onCancelEdit(); }
  };

  return (
    <div
      role="listitem"
      aria-selected={isSelected}
      onClick={onSelect}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none
        ${isSelected
          ? "bg-[#0f1f18] border border-emerald-500/50 shadow-[0_0_0_1px_#6ee7b722]"
          : "border border-transparent hover:bg-[#161616] hover:border-[#262626]"
        }`}
    >
      {/* Complete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(task.id, "mouse"); }}
        aria-label={`Complete: ${task.text}`}
        className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
          ${isSelected ? "border-emerald-400" : "border-gray-700 group-hover:border-gray-500"}
          hover:border-emerald-400 hover:bg-emerald-400/10`}
      />

      {/* Priority dot */}
      <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${P_DOT[task.priority]}`} />

      {/* Text */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={editRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKey}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-sm text-gray-100 outline-none border-b border-emerald-500/50"
            maxLength={200}
          />
        ) : (
          <span
            className="text-sm text-gray-200 truncate block leading-snug"
            onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(task.id); }}
          >
            {task.text}
          </span>
        )}
      </div>

      {/* Priority label (selected) */}
      {isSelected && (
        <span className={`text-[10px] ${P_TEXT[task.priority]} opacity-60 hidden sm:block`}>
          {task.priority}
        </span>
      )}

      {/* Actions */}
      <div className={`flex items-center gap-0.5 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`}>
        {/* Promote/demote */}
        {task.list === "backlog" && onPromote && (
          <button
            onClick={(e) => { e.stopPropagation(); onPromote(task.id, "mouse"); }}
            disabled={!canPromote}
            title={canPromote ? "Promote to Today (P)" : "Today is full (3/3)"}
            className="px-1.5 py-0.5 rounded text-xs text-gray-600 hover:text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ↑ Today
          </button>
        )}
        {task.list === "today" && onDemote && (
          <button
            onClick={(e) => { e.stopPropagation(); onDemote(task.id, "mouse"); }}
            title="Move to Backlog (B)"
            className="px-1.5 py-0.5 rounded text-xs text-gray-600 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
          >
            ↓ Back
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onStartEdit(task.id); }}
          title="Edit (E)"
          className="px-1.5 py-0.5 rounded text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5"
        >
          e
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id, "mouse"); }}
          title="Delete (D)"
          className="px-1.5 py-0.5 rounded text-xs text-gray-700 hover:text-red-400 hover:bg-red-400/10"
        >
          ×
        </button>
      </div>
    </div>
  );
}
