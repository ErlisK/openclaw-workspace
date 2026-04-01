"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, Priority, TaskList, AppEvent, AppUser } from "@/lib/types";
import {
  loadTasks, saveTasks, createTask,
  completeTask, deleteTask, updateTaskText, updateTaskPriority,
  promoteTask, demoteTask, getTodayTasks, getBacklogTasks, canPromote,
} from "@/lib/tasks";
import { track } from "@/lib/analytics";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getIntegrationFlags, getFeatureFlags } from "@/lib/env";
import { injectSeedTasks } from "@/lib/seed";

// ── Supabase task sync helpers ────────────────────────────────────────────────

async function fetchSupabaseTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, text, status, priority, sort_order, created_at, completed_at")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id:           r.id,
    text:         r.text,
    status:       r.status as Task["status"],
    priority:     r.priority as Priority,
    list:         (r as Record<string, unknown>)["list"] as TaskList ?? "backlog",
    createdAt:    new Date(r.created_at).getTime(),
    completedAt:  r.completed_at ? new Date(r.completed_at).getTime() : undefined,
    order:        r.sort_order,
  }));
}

async function upsertSupabaseTask(task: Task, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("tasks") as any).upsert({
    id:           task.id,
    user_id:      userId,
    text:         task.text,
    status:       task.status,
    priority:     task.priority,
    sort_order:   task.order,
    created_at:   new Date(task.createdAt).toISOString(),
    completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
    deleted_at:   task.deletedAt   ? new Date(task.deletedAt).toISOString()   : null,
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTasks() {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [user,       setUser]       = useState<AppUser | null>(null);
  // ── Auth ─────────────────────────────────────────────────────────────────

  const [activeView, setActiveView] = useState<TaskList>("today");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState<string | null>(null);

  const flags        = getIntegrationFlags();
  const featureFlags = getFeatureFlags();

  // Initialise focusMode from feature flag (runs once, stable default)
  const [focusMode,  setFocusMode]  = useState(() => featureFlags.focusModeDefault);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser({ id: data.session.user.id, email: data.session.user.email ?? "" });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? "" });
        if (event === "SIGNED_IN") {
          track<Extract<AppEvent, { event: "auth_completed" }>>({
            event: "auth_completed", method: "magic_link",
          });
        }
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load tasks ────────────────────────────────────────────────────────────

  useEffect(() => {
    const local = loadTasks();
    // If seed flag is on and localStorage is empty, inject demo tasks
    const effective = (featureFlags.seedData && local.length === 0)
      ? injectSeedTasks()
      : local;
    setTasks(effective);
    track<Extract<AppEvent, { event: "session_started" }>>({
      event:        "session_started",
      active_tasks: effective.filter((t) => t.status === "active").length,
      has_supabase: flags.supabase,
      has_posthog:  flags.posthog,
      is_authed:    false,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSupabaseTasks(user.id).then((remote) => {
      if (remote.length > 0) {
        setTasks(remote);
        saveTasks(remote);
      }
    });
  }, [user]);

  // ── Persist ───────────────────────────────────────────────────────────────

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSync  = useRef<Task[]>([]);

  const scheduleSyncToSupabase = useCallback((next: Task[]) => {
    pendingSync.current = next;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      if (!user) return;
      for (const t of pendingSync.current) await upsertSupabaseTask(t, user.id);
    }, 800);
  }, [user]);

  const applyTasks = useCallback((next: Task[]) => {
    setTasks(next);
    saveTasks(next);
    if (user) scheduleSyncToSupabase(next);
  }, [user, scheduleSyncToSupabase]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const sendMagicLink = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return;
    setAuthLoading(true);
    setAuthError(null);
    track<Extract<AppEvent, { event: "auth_started" }>>({ event: "auth_started" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      track<Extract<AppEvent, { event: "auth_failed" }>>({
        event: "auth_failed", reason: error.message,
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // ── Task actions ──────────────────────────────────────────────────────────

  const addTask = useCallback((
    text:         string,
    priority:     Priority    = "medium",
    list?:        TaskList,
    inputMethod:  "keyboard" | "mouse" = "keyboard"
  ) => {
    if (!text.trim()) return;
    const targetList = list ?? activeView;
    if (targetList === "today" && !canPromote(tasks)) return;
    const todayCount = getTodayTasks(tasks).length;
    const order = targetList === "today" ? todayCount : getBacklogTasks(tasks).length;
    const task = createTask(text, priority, targetList, order);
    applyTasks([...tasks, task]);
    track<Extract<AppEvent, { event: "task_created" }>>({
      event: "task_created", task_id: task.id, input_method: inputMethod,
      text_length: text.trim().length, list: targetList, priority, in_focus_mode: focusMode,
    });
    setIsInputOpen(false);
  }, [tasks, activeView, focusMode, applyTasks]);

  const completeTaskById = useCallback((id: string, inputMethod: "keyboard" | "mouse" = "keyboard") => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status !== "active") return;
    applyTasks(completeTask(tasks, id));
    track<Extract<AppEvent, { event: "task_completed" }>>({
      event: "task_completed", task_id: id, input_method: inputMethod,
      time_to_complete_ms: Date.now() - task.createdAt,
      in_focus_mode: focusMode, list: task.list, priority: task.priority,
    });
    setSelectedId(null);
  }, [tasks, focusMode, applyTasks]);

  const deleteTaskById = useCallback((id: string, inputMethod: "keyboard" | "mouse" = "keyboard") => {
    applyTasks(deleteTask(tasks, id));
    track<Extract<AppEvent, { event: "task_deleted" }>>({
      event: "task_deleted", task_id: id, input_method: inputMethod,
    });
    setSelectedId((p) => (p === id ? null : p));
  }, [tasks, applyTasks]);

  const editTask = useCallback((id: string, text: string) => {
    if (!text.trim()) return;
    applyTasks(updateTaskText(tasks, id, text));
    track<Extract<AppEvent, { event: "task_edited" }>>({ event: "task_edited", task_id: id });
    setEditingId(null);
  }, [tasks, applyTasks]);

  const setPriority = useCallback((id: string, priority: Priority) => {
    applyTasks(updateTaskPriority(tasks, id, priority));
  }, [tasks, applyTasks]);

  const promoteTaskById = useCallback((id: string, inputMethod: "keyboard" | "mouse" = "keyboard") => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.list !== "backlog" || !canPromote(tasks)) return;
    const next = promoteTask(tasks, id);
    applyTasks(next);
    track<Extract<AppEvent, { event: "task_promoted" }>>({
      event: "task_promoted", task_id: id, input_method: inputMethod,
      today_count_after: getTodayTasks(next).length,
    });
    setActiveView("today");
  }, [tasks, applyTasks]);

  const demoteTaskById = useCallback((id: string, inputMethod: "keyboard" | "mouse" = "keyboard") => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.list !== "today") return;
    applyTasks(demoteTask(tasks, id));
    track<Extract<AppEvent, { event: "task_demoted" }>>({
      event: "task_demoted", task_id: id, input_method: inputMethod,
    });
  }, [tasks, applyTasks]);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      track<Extract<AppEvent, { event: "focus_mode_toggled" }>>({
        event: "focus_mode_toggled", enabled: next,
        today_count:   getTodayTasks(tasks).length,
        backlog_count: getBacklogTasks(tasks).length,
      });
      if (next) setActiveView("today");
      return next;
    });
  }, [tasks]);

  const switchView = useCallback((to: TaskList) => {
    track<Extract<AppEvent, { event: "view_switched" }>>({
      event: "view_switched",
      from_view: activeView,
      to_view:   to,
    });
    setActiveView(to);
    setSelectedId(null);
  }, [activeView]);

  const toggleView = useCallback(() => {
    switchView(activeView === "today" ? "backlog" : "today");
  }, [activeView, switchView]);

  return {
    tasks,
    user,
    focusMode,
    activeView,
    selectedId,
    isInputOpen,
    editingId,
    authLoading,
    authError,
    // selectors
    todayTasks:    getTodayTasks(tasks),
    backlogTasks:  getBacklogTasks(tasks),
    canPromote:    canPromote(tasks),
    // actions
    addTask,
    completeTaskById,
    deleteTaskById,
    editTask,
    setPriority,
    promoteTaskById,
    demoteTaskById,
    toggleFocusMode,
    switchView,
    toggleView,
    sendMagicLink,
    signOut,
    setSelectedId,
    setIsInputOpen,
    setEditingId,
  };
}
