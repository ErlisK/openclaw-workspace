"use client";

import { useEffect, useCallback } from "react";
import type { Task, AppEvent } from "@/lib/types";
import { track } from "@/lib/analytics";
import { getActiveTasks } from "@/lib/tasks";

interface UseKeyboardOptions {
  tasks: Task[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isInputOpen: boolean;
  editingId: string | null;
  focusMode: boolean;
  onNewTask: () => void;
  onComplete: (id: string, method: "keyboard") => void;
  onDelete: (id: string, method: "keyboard") => void;
  onEdit: (id: string) => void;
  onToggleFocus: () => void;
  onToggleHelp: () => void;
  onSetPriority: (id: string, p: "high" | "medium" | "low") => void;
  onEscape: () => void;
}

export function useKeyboard({
  tasks,
  selectedId,
  setSelectedId,
  isInputOpen,
  editingId,
  focusMode,
  onNewTask,
  onComplete,
  onDelete,
  onEdit,
  onToggleFocus,
  onToggleHelp,
  onSetPriority,
  onEscape,
}: UseKeyboardOptions) {
  const recordShortcut = useCallback((key: string, action: string) => {
    track<Extract<AppEvent, { event: "keyboard_shortcut_used" }>>({
      event: "keyboard_shortcut_used",
      key,
      action,
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditing = tag === "input" || tag === "textarea" || editingId;

      if (isInputOpen || isEditing) {
        // Only handle Escape in input mode
        if (e.key === "Escape") {
          e.preventDefault();
          onEscape();
        }
        return;
      }

      const active = getActiveTasks(tasks);
      const currentIdx = active.findIndex((t) => t.id === selectedId);

      switch (e.key) {
        case "n":
        case "/":
          e.preventDefault();
          recordShortcut(e.key, "new_task");
          onNewTask();
          break;

        case "f":
          e.preventDefault();
          recordShortcut("f", "toggle_focus");
          onToggleFocus();
          break;

        case "?":
          e.preventDefault();
          recordShortcut("?", "toggle_help");
          onToggleHelp();
          break;

        case "j":
        case "ArrowDown": {
          e.preventDefault();
          if (!active.length) break;
          recordShortcut(e.key, "select_next");
          const next = currentIdx < active.length - 1 ? currentIdx + 1 : 0;
          setSelectedId(active[next].id);
          break;
        }

        case "k":
        case "ArrowUp": {
          e.preventDefault();
          if (!active.length) break;
          recordShortcut(e.key, "select_prev");
          const prev = currentIdx > 0 ? currentIdx - 1 : active.length - 1;
          setSelectedId(active[prev].id);
          break;
        }

        case " ":
        case "x":
          if (selectedId) {
            e.preventDefault();
            recordShortcut(e.key, "complete_task");
            onComplete(selectedId, "keyboard");
          }
          break;

        case "d":
        case "Delete":
          if (selectedId) {
            e.preventDefault();
            recordShortcut(e.key, "delete_task");
            onDelete(selectedId, "keyboard");
          }
          break;

        case "e":
          if (selectedId) {
            e.preventDefault();
            recordShortcut("e", "edit_task");
            onEdit(selectedId);
          }
          break;

        case "1":
          if (selectedId) {
            e.preventDefault();
            recordShortcut("1", "priority_high");
            onSetPriority(selectedId, "high");
          }
          break;
        case "2":
          if (selectedId) {
            e.preventDefault();
            recordShortcut("2", "priority_medium");
            onSetPriority(selectedId, "medium");
          }
          break;
        case "3":
          if (selectedId) {
            e.preventDefault();
            recordShortcut("3", "priority_low");
            onSetPriority(selectedId, "low");
          }
          break;

        case "Escape":
          e.preventDefault();
          onEscape();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    tasks,
    selectedId,
    isInputOpen,
    editingId,
    focusMode,
    setSelectedId,
    recordShortcut,
    onNewTask,
    onComplete,
    onDelete,
    onEdit,
    onToggleFocus,
    onToggleHelp,
    onSetPriority,
    onEscape,
  ]);
}
