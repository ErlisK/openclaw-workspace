"use client";

import { useState, useCallback, useEffect } from "react";
import { useTasks }      from "@/hooks/useTasks";
import { useKeyboard }   from "@/hooks/useKeyboard";
import { TodayView }     from "@/components/TodayView";
import { BacklogView }   from "@/components/BacklogView";
import { TaskInput }     from "@/components/TaskInput";
import { HelpModal }     from "@/components/HelpModal";
import { Dashboard }     from "@/components/Dashboard";
import { AuthModal }     from "@/components/AuthModal";
import { getCompletedTasks } from "@/lib/tasks";
import { isSupabaseConfigured } from "@/lib/supabase";
import { logEnvStatus } from "@/lib/env";

export default function Home() {
  const {
    tasks, user, focusMode, activeView,
    selectedId, isInputOpen, editingId,
    authLoading, authError,
    todayTasks, backlogTasks, canPromote,
    addTask, completeTaskById, deleteTaskById,
    editTask, setPriority, promoteTaskById, demoteTaskById,
    toggleFocusMode, switchView, toggleView,
    sendMagicLink, signOut,
    setSelectedId, setIsInputOpen, setEditingId,
  } = useTasks();

  const [showHelp,      setShowHelp]      = useState(false);
  const [showDash,      setShowDash]      = useState(false);
  const [showAuth,      setShowAuth]      = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [pwaInstall,    setPwaInstall]    = useState<Event | null>(null);

  // Log env status in dev
  useEffect(() => { logEnvStatus(); }, []);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPwaInstall(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const openInput  = useCallback(() => setIsInputOpen(true),  [setIsInputOpen]);
  const closeInput = useCallback(() => setIsInputOpen(false), [setIsInputOpen]);

  const handleEscape = useCallback(() => {
    if (showHelp) { setShowHelp(false); return; }
    if (showDash) { setShowDash(false); return; }
    if (showAuth) { setShowAuth(false); return; }
    if (isInputOpen) { closeInput(); return; }
    if (editingId)   { setEditingId(null); return; }
    setSelectedId(null);
  }, [showHelp, showDash, showAuth, isInputOpen, editingId,
      closeInput, setEditingId, setSelectedId]);

  useKeyboard({
    tasks, selectedId, setSelectedId, activeView,
    isInputOpen, editingId, focusMode, canPromote,
    onNewTask:     openInput,
    onComplete:    completeTaskById,
    onDelete:      deleteTaskById,
    onEdit:        setEditingId,
    onPromote:     promoteTaskById,
    onDemote:      demoteTaskById,
    onToggleFocus: toggleFocusMode,
    onToggleView:  toggleView,
    onToggleHelp:  () => setShowHelp((v) => !v),
    onSetPriority: setPriority,
    onEscape:      handleEscape,
  });

  const completedTasks = getCompletedTasks(tasks);

  const panelProps = {
    selectedId,
    editingId,
    onSelect:     setSelectedId,
    onComplete:   completeTaskById,
    onDelete:     deleteTaskById,
    onStartEdit:  setEditingId,
    onSaveEdit:   editTask,
    onCancelEdit: () => setEditingId(null),
  };

  const handleInstall = async () => {
    if (!pwaInstall) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (pwaInstall as any).prompt();
    if (result?.outcome === "accepted") setPwaInstall(null);
  };

  return (
    <div className="min-h-svh bg-[#0a0a0a] text-gray-100 flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-[#0a0a0a]/96 backdrop-blur-md border-b border-[#191919]">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-12 flex items-center gap-2 sm:gap-3">

          {/* Logo */}
          <span className="text-emerald-400 font-bold text-sm tracking-tight flex-shrink-0">
            FocusDo
          </span>

          {/* View tabs (hidden in focus mode) */}
          {!focusMode && (
            <nav className="flex items-center gap-0.5 bg-[#141414] rounded-lg p-0.5 border border-[#222]"
                 aria-label="Task views">
              {(["today", "backlog"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => switchView(v)}
                  aria-pressed={activeView === v}
                  className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-all min-h-[28px] ${
                    activeView === v
                      ? v === "today"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  {v === "today"
                    ? `Today ${todayTasks.length > 0 ? `${todayTasks.length}/3` : ""}`
                    : `Backlog ${backlogTasks.length > 0 ? backlogTasks.length : ""}`
                  }
                </button>
              ))}
            </nav>
          )}

          {focusMode && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-full font-medium">
              FOCUS
            </span>
          )}

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-0.5">
            {/* Install prompt */}
            {pwaInstall && (
              <button onClick={handleInstall}
                className="hidden sm:flex px-2 py-1 text-xs text-emerald-600 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-all items-center gap-1"
                title="Install app">
                ⬇ Install
              </button>
            )}

            <button onClick={() => setShowDash(true)}
              className="p-1.5 sm:px-2 sm:py-1 text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded transition-all"
              aria-label="Metrics dashboard"
              title="Hypothesis metrics">
              📊
            </button>

            <button onClick={toggleFocusMode}
              className={`px-2 py-1 text-xs rounded transition-all hidden sm:block ${
                focusMode
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-gray-600 hover:text-gray-300 hover:bg-white/5"
              }`}
              title={focusMode ? "Exit Focus (F)" : "Focus Mode (F)"}>
              {focusMode ? "Exit" : "Focus"}
            </button>

            <button onClick={() => setShowHelp(true)}
              className="p-1.5 sm:px-2 sm:py-1 text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded transition-all"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)">
              ?
            </button>

            {/* Auth indicator */}
            {user ? (
              <button onClick={signOut}
                className="hidden sm:flex px-2 py-1 text-xs text-gray-700 hover:text-gray-400 hover:bg-white/5 rounded transition-all items-center gap-1 max-w-[120px]"
                title="Sign out">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="truncate">{user.email.split("@")[0]}</span>
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="hidden sm:flex px-2 py-1 text-xs text-gray-600 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-all items-center gap-1"
                title="Sign in to sync across devices">
                Sync
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-4 py-4 pb-20">

        {/* New task input */}
        {isInputOpen ? (
          <div className="mb-4">
            <TaskInput
              defaultList={focusMode ? "today" : activeView}
              canAddToToday={canPromote || activeView === "today"}
              onSubmit={(text, priority, list) => addTask(text, priority, list, "keyboard")}
              onCancel={closeInput}
            />
          </div>
        ) : (
          <button
            onClick={openInput}
            className="w-full mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-[#222] text-gray-600 hover:border-[#333] hover:text-gray-400 active:bg-white/5 transition-all text-sm touch-manipulation min-h-[44px]"
            aria-label="Add new task"
          >
            <span className="text-emerald-500 text-lg leading-none">+</span>
            <span>Add a task…</span>
            <span className="ml-auto text-[10px] text-gray-700 hidden sm:block">
              <kbd className="bg-[#181818] border border-[#272727] px-1.5 py-0.5 rounded">N</kbd>
            </span>
          </button>
        )}

        {/* Focus mode: single-column Today */}
        {focusMode ? (
          <TodayView
            tasks={todayTasks.slice(0, 3)}
            {...panelProps}
            focusMode
            onDemote={demoteTaskById}
          />
        ) : (
          <>
            {/* Desktop: side-by-side split pane */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-6 md:items-start">
              <TodayView
                tasks={todayTasks}
                {...panelProps}
                focusMode={false}
                onDemote={demoteTaskById}
              />
              <BacklogView
                tasks={backlogTasks}
                {...panelProps}
                canPromote={canPromote}
                onPromote={promoteTaskById}
              />
            </div>

            {/* Mobile: active tab panel */}
            <div className="md:hidden">
              {activeView === "today" ? (
                <TodayView
                  tasks={todayTasks}
                  {...panelProps}
                  focusMode={false}
                  onDemote={demoteTaskById}
                />
              ) : (
                <BacklogView
                  tasks={backlogTasks}
                  {...panelProps}
                  canPromote={canPromote}
                  onPromote={promoteTaskById}
                />
              )}
            </div>
          </>
        )}

        {/* Completed section */}
        {completedTasks.length > 0 && (
          <section className="mt-8" aria-label="Completed tasks">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-2 mb-2 text-[11px] text-gray-700 hover:text-gray-500 uppercase tracking-widest transition-colors min-h-[32px] w-full text-left"
            >
              <span aria-hidden>{showCompleted ? "▾" : "▸"}</span>
              <span>Completed</span>
              <span className="text-gray-800">{completedTasks.length}</span>
            </button>
            {showCompleted && (
              <div className="space-y-0.5" role="list">
                {completedTasks.slice(0, 20).map((t) => (
                  <div key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-30"
                    role="listitem">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-700 flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    </div>
                    <span className="text-xs text-gray-500 line-through flex-1 min-w-0 truncate">{t.text}</span>
                    <span className="text-[10px] text-gray-700 flex-shrink-0">
                      {t.completedAt ? new Date(t.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-[#080808]/95 backdrop-blur-sm border-t border-[#191919] z-10"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-8 flex items-center gap-2 text-[11px] text-gray-700">
          <span className={todayTasks.length === 3 ? "text-emerald-600" : "text-gray-700"}>
            {todayTasks.length}/3 today
          </span>
          <span className="text-[#222]">·</span>
          <span>{backlogTasks.length} backlog</span>

          {selectedId && (
            <>
              <span className="text-[#222]">·</span>
              <span className="text-gray-600 hidden sm:block">
                <kbd className="text-gray-500 text-[10px]">Space</kbd> done ·{" "}
                <kbd className="text-gray-500 text-[10px]">P</kbd> today ·{" "}
                <kbd className="text-gray-500 text-[10px]">B</kbd> back ·{" "}
                <kbd className="text-gray-500 text-[10px]">E</kbd> edit ·{" "}
                <kbd className="text-gray-500 text-[10px]">D</kbd> del
              </span>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Mobile: auth + focus toggle */}
            <button onClick={() => setShowAuth(true)}
              className="sm:hidden text-[11px] text-gray-700 hover:text-emerald-500 transition-colors min-h-[32px] px-1">
              {user ? "●" : "Sync"}
            </button>
            <button onClick={toggleFocusMode}
              className={`sm:hidden text-[11px] transition-colors min-h-[32px] px-1 ${
                focusMode ? "text-emerald-500" : "text-gray-700 hover:text-gray-400"
              }`}>
              Focus
            </button>
            <span className="hidden sm:block">
              <kbd className="text-gray-600 text-[10px]">Tab</kbd> switch ·{" "}
              <kbd className="text-gray-600 text-[10px]">?</kbd> help
            </span>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showDash && <Dashboard onClose={() => setShowDash(false)} />}
      {showAuth && (
        <AuthModal
          onSendLink={sendMagicLink}
          onClose={() => setShowAuth(false)}
          isLoading={authLoading}
          error={authError}
          isConfigured={isSupabaseConfigured}
        />
      )}
    </div>
  );
}
