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

const P_DOT:  Record<string, string> = {
  high:   "bg-red-400",
  medium: "bg-yellow-400",
  low:    "bg-green-400",
};
const P_LABEL: Record<string, string> = {
  high:   "text-red-400",
  medium: "text-yellow-500",
  low:    "text-green-400",
};

export function TaskItem({
  task, isSelected, isEditing, canPromote,
  onSelect, onComplete, onDelete,
  onStartEdit, onSaveEdit, onCancelEdit,
  onPromote, onDemote,
}: TaskItemProps) {
  const editRef   = useRef<HTMLInputElement>(null);
  const itemRef   = useRef<HTMLDivElement>(null);
  const [editText, setEditText] = useState(task.text);

  useEffect(() => {
    if (isEditing) {
      setEditText(task.text);
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [isEditing, task.text]);

  // Scroll selected item into view
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected]);

  const handleEditKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && editText.trim()) { onSaveEdit(task.id, editText); }
    else if (e.key === "Escape") { onCancelEdit(); }
  };

  return (
    <div
      ref={itemRef}
      role="listitem"
      aria-selected={isSelected}
      aria-label={task.text}
      onClick={onSelect}
      className={`group flex items-center gap-3 px-3 rounded-xl cursor-pointer
        transition-all select-none touch-manipulation
        min-h-[44px] py-2.5           /* 44px min touch target */
        ${isSelected
          ? "bg-[#0d1f17] border border-emerald-500/40 shadow-[0_0_0_1px_#6ee7b715]"
          : "border border-transparent hover:bg-[#141414] hover:border-[#222] active:bg-[#141414]"
        }`}
    >
      {/* Complete button (44×44 touch area via negative margins) */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(task.id, "mouse"); }}
        aria-label={`Complete: ${task.text}`}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
          transition-all touch-manipulation
          -mx-0.5                      /* expand touch area */
          ${isSelected
            ? "border-emerald-400 hover:bg-emerald-400/15"
            : "border-gray-700 group-hover:border-gray-500 hover:border-emerald-400 hover:bg-emerald-400/10"
          }`}
      />

      {/* Priority indicator dot */}
      <div
        className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${P_DOT[task.priority]}`}
        aria-label={`Priority: ${task.priority}`}
      />

      {/* Task text / edit field */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={editRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKey}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-sm text-gray-100 outline-none
              border-b border-emerald-500/50 pb-0.5 caret-emerald-400"
            maxLength={200}
            aria-label="Edit task text"
          />
        ) : (
          <span
            className="text-sm text-gray-200 block leading-snug"
            style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(task.id); }}
          >
            {task.text}
          </span>
        )}
      </div>

      {/* Priority label (selected, desktop) */}
      {isSelected && (
        <span className={`text-[10px] ${P_LABEL[task.priority]} opacity-50 hidden sm:block flex-shrink-0`}>
          {task.priority}
        </span>
      )}

      {/* Action buttons */}
      <div className={`flex items-center gap-0 transition-opacity flex-shrink-0
        ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`}>

        {/* Promote/demote */}
        {task.list === "backlog" && onPromote && (
          <button
            onClick={(e) => { e.stopPropagation(); onPromote(task.id, "mouse"); }}
            disabled={!canPromote}
            title={canPromote ? "Promote to Today (P)" : "Today is full (3/3)"}
            aria-label="Promote to Today"
            className="px-1.5 py-1 rounded text-[11px] text-gray-600 hover:text-emerald-400
              hover:bg-emerald-400/10 disabled:opacity-25 disabled:cursor-not-allowed
              transition-colors min-h-[32px] flex items-center touch-manipulation"
          >
            ↑
          </button>
        )}
        {task.list === "today" && onDemote && (
          <button
            onClick={(e) => { e.stopPropagation(); onDemote(task.id, "mouse"); }}
            title="Move to Backlog (B)"
            aria-label="Move to Backlog"
            className="px-1.5 py-1 rounded text-[11px] text-gray-600 hover:text-blue-400
              hover:bg-blue-400/10 transition-colors min-h-[32px] flex items-center
              touch-manipulation"
          >
            ↓
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onStartEdit(task.id); }}
          title="Edit (E)"
          aria-label="Edit task"
          className="px-1.5 py-1 rounded text-[11px] text-gray-600 hover:text-gray-300
            hover:bg-white/5 min-h-[32px] flex items-center touch-manipulation"
        >
          <span aria-hidden>✎</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id, "mouse"); }}
          title="Delete (D)"
          aria-label="Delete task"
          className="px-1.5 py-1 rounded text-[11px] text-gray-700 hover:text-red-400
            hover:bg-red-400/10 min-h-[32px] flex items-center touch-manipulation"
        >
          <span aria-hidden>×</span>
        </button>
      </div>
    </div>
  );
}
