"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task, Priority, AppEvent } from "@/lib/types";
import {
  loadTasks,
  saveTasks,
  createTask,
  completeTask,
  deleteTask,
  updateTaskText,
  updateTaskPriority,
  getActiveTasks,
} from "@/lib/tasks";
import { track } from "@/lib/analytics";

type TrackPayload<E extends AppEvent> = Omit<E, "ts" | "session_id">;

export function useTodos() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = loadTasks();
    setTasks(stored);
    track<Extract<AppEvent, { event: "session_started" }>>({
      event: "session_started",
      active_tasks: getActiveTasks(stored).length,
    });
  }, []);

  // Persist on change
  useEffect(() => {
    if (tasks.length > 0 || localStorage.getItem("focusdo:tasks")) {
      saveTasks(tasks);
    }
  }, [tasks]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const addTask = useCallback(
    (text: string, priority: Priority = "medium", inputMethod: "keyboard" | "mouse" = "keyboard") => {
      if (!text.trim()) return;
      const task = createTask(text, priority, tasks.filter((t) => t.status === "active").length);
      setTasks((prev) => [...prev, task]);
      track<Extract<AppEvent, { event: "task_created" }>>({
        event: "task_created",
        task_id: task.id,
        input_method: inputMethod,
        text_length: text.trim().length,
      });
      setIsInputOpen(false);
    },
    [tasks]
  );

  const completeTaskById = useCallback(
    (id: string, inputMethod: "keyboard" | "mouse" = "keyboard") => {
      const task = tasks.find((t) => t.id === id);
      if (!task || task.status !== "active") return;

      setTasks((prev) => completeTask(prev, id));
      track<Extract<AppEvent, { event: "task_completed" }>>({
        event: "task_completed",
        task_id: id,
        input_method: inputMethod,
        time_to_complete_ms: Date.now() - task.createdAt,
        in_focus_mode: focusMode,
      });

      // Move selection to next active task
      setSelectedId(() => {
        const active = getActiveTasks(tasks).filter((t) => t.id !== id);
        if (!active.length) return null;
        const idx = getActiveTasks(tasks).findIndex((t) => t.id === id);
        return active[Math.min(idx, active.length - 1)]?.id ?? null;
      });
    },
    [tasks, focusMode]
  );

  const deleteTaskById = useCallback(
    (id: string, inputMethod: "keyboard" | "mouse" = "keyboard") => {
      setTasks((prev) => deleteTask(prev, id));
      track<Extract<AppEvent, { event: "task_deleted" }>>({
        event: "task_deleted",
        task_id: id,
        input_method: inputMethod,
      });
      setSelectedId((prev) => (prev === id ? null : prev));
    },
    []
  );

  const editTask = useCallback(
    (id: string, newText: string) => {
      setTasks((prev) => updateTaskText(prev, id, newText));
      setEditingId(null);
    },
    []
  );

  const setPriority = useCallback(
    (id: string, priority: Priority) => {
      setTasks((prev) => updateTaskPriority(prev, id, priority));
    },
    []
  );

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      const activeCnt = getActiveTasks(tasks).length;
      if (next) {
        track<Extract<AppEvent, { event: "focus_mode_entered" }>>({
          event: "focus_mode_entered",
          task_count: activeCnt,
        });
      } else {
        track<Extract<AppEvent, { event: "focus_mode_exited" }>>({
          event: "focus_mode_exited",
          task_count: activeCnt,
        });
      }
      return next;
    });
  }, [tasks]);

  const openInput = useCallback(() => setIsInputOpen(true), []);
  const closeInput = useCallback(() => setIsInputOpen(false), []);
  const startEdit = useCallback((id: string) => setEditingId(id), []);
  const cancelEdit = useCallback(() => setEditingId(null), []);

  return {
    tasks,
    focusMode,
    selectedId,
    setSelectedId,
    isInputOpen,
    editingId,
    addTask,
    completeTaskById,
    deleteTaskById,
    editTask,
    setPriority,
    toggleFocusMode,
    openInput,
    closeInput,
    startEdit,
    cancelEdit,
  };
}
