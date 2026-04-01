"use client";

import { useEffect, useCallback } from "react";
import type { Task, AppEvent } from "@/lib/types";
import { track } from "@/lib/analytics";
import { getTodayTasks, getBacklogTasks } from "@/lib/tasks";

type TaskList = "today" | "backlog";

interface UseKeyboardOptions {
  tasks:         Task[];
  selectedId:    string | null;
  setSelectedId: (id: string | null) => void;
  activeView:    TaskList;
  isInputOpen:   boolean;
  editingId:     string | null;
  focusMode:     boolean;
  canPromote:    boolean;
  onNewTask:     () => void;
  onComplete:    (id: string, method: "keyboard") => void;
  onDelete:      (id: string, method: "keyboard") => void;
  onEdit:        (id: string) => void;
  onPromote:     (id: string, method: "keyboard") => void;
  onDemote:      (id: string, method: "keyboard") => void;
  onToggleFocus: () => void;
  onToggleView:  () => void;
  onToggleHelp:  () => void;
  onSetPriority: (id: string, p: "high" | "medium" | "low") => void;
  onEscape:      () => void;
}

export function useKeyboard({
  tasks, selectedId, setSelectedId, activeView,
  isInputOpen, editingId, focusMode, canPromote,
  onNewTask, onComplete, onDelete, onEdit,
  onPromote, onDemote, onToggleFocus, onToggleView,
  onToggleHelp, onSetPriority, onEscape,
}: UseKeyboardOptions) {

  const kb = useCallback((key: string, action: string) => {
    track<Extract<AppEvent, { event: "keyboard_shortcut_used" }>>({
      event: "keyboard_shortcut_used", key, action,
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag     = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const typing  = tag === "input" || tag === "textarea" || !!editingId;

      // ── Input mode: only Escape ─────────────────────────────────────────
      if (isInputOpen || typing) {
        if (e.key === "Escape") { e.preventDefault(); onEscape(); }
        return;
      }

      const viewTasks = activeView === "today"
        ? getTodayTasks(tasks)
        : getBacklogTasks(tasks);
      const idx = viewTasks.findIndex((t) => t.id === selectedId);

      switch (e.key) {
        case "n": case "/":
          e.preventDefault(); kb(e.key, "new_task"); onNewTask(); break;

        case "f":
          e.preventDefault(); kb("f", "toggle_focus"); onToggleFocus(); break;

        case "Tab":
          e.preventDefault(); kb("Tab", "switch_view"); onToggleView(); break;

        case "?":
          e.preventDefault(); kb("?", "toggle_help"); onToggleHelp(); break;

        case "j": case "ArrowDown": {
          e.preventDefault();
          if (!viewTasks.length) break;
          kb(e.key, "select_next");
          const next = idx < viewTasks.length - 1 ? idx + 1 : 0;
          setSelectedId(viewTasks[next].id);
          break;
        }
        case "k": case "ArrowUp": {
          e.preventDefault();
          if (!viewTasks.length) break;
          kb(e.key, "select_prev");
          const prev = idx > 0 ? idx - 1 : viewTasks.length - 1;
          setSelectedId(viewTasks[prev].id);
          break;
        }

        case " ": case "x":
          if (selectedId) { e.preventDefault(); kb(e.key, "complete_task"); onComplete(selectedId, "keyboard"); }
          break;

        case "p":
          if (selectedId && canPromote) {
            e.preventDefault(); kb("p", "promote_task"); onPromote(selectedId, "keyboard");
          }
          break;

        case "b":
          if (selectedId) { e.preventDefault(); kb("b", "demote_task"); onDemote(selectedId, "keyboard"); }
          break;

        case "e":
          if (selectedId) { e.preventDefault(); kb("e", "edit_task"); onEdit(selectedId); }
          break;

        case "d": case "Delete":
          if (selectedId) { e.preventDefault(); kb(e.key, "delete_task"); onDelete(selectedId, "keyboard"); }
          break;

        case "1": if (selectedId) { e.preventDefault(); kb("1", "priority_high");   onSetPriority(selectedId, "high");   } break;
        case "2": if (selectedId) { e.preventDefault(); kb("2", "priority_medium"); onSetPriority(selectedId, "medium"); } break;
        case "3": if (selectedId) { e.preventDefault(); kb("3", "priority_low");    onSetPriority(selectedId, "low");    } break;

        case "Escape": e.preventDefault(); onEscape(); break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    tasks, selectedId, activeView, isInputOpen, editingId,
    focusMode, canPromote, setSelectedId, kb,
    onNewTask, onComplete, onDelete, onEdit,
    onPromote, onDemote, onToggleFocus, onToggleView,
    onToggleHelp, onSetPriority, onEscape,
  ]);
}
