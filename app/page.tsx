"use client";

import { useState, useCallback } from "react";
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

export default function Home() {
  const {
    tasks, user, focusMode, activeView, selectedId, isInputOpen,
    editingId, authLoading, authError,
    todayTasks, backlogTasks, canPromote,
    addTask, completeTaskById, deleteTaskById, editTask, setPriority,
    promoteTaskById, demoteTaskById, toggleFocusMode,
    switchView, toggleView, sendMagicLink, signOut,
    setSelectedId, setIsInputOpen, setEditingId,
  } = useTasks();

  const [showHelp,      setShowHelp]      = useState(false);
  const [showDash,      setShowDash]      = useState(false);
  const [showAuth,      setShowAuth]      = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const openInput  = useCallback(() => setIsInputOpen(true),  [setIsInputOpen]);
  const closeInput = useCallback(() => setIsInputOpen(false), [setIsInputOpen]);

  const handleEscape = useCallback(() => {
    if (showHelp) { setShowHelp(false); return; }
    if (showDash) { setShowDash(false); return; }
    if (showAuth) { setShowAuth(false); return; }
    if (isInputOpen) { closeInput(); return; }
    if (editingId)   { setEditingId(null); return; }
    setSelectedId(null);
  }, [showHelp, showDash, showAuth, isInputOpen, editingId, closeInput, setEditingId, setSelectedId]);

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
  const displayTasks   = focusMode ? todayTasks.slice(0, 3) : (activeView === "today" ? todayTasks : backlogTasks);

  // ── Common task-panel props ───────────────────────────────────────────────
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#191919]">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-3">
          {/* Logo */}
          <span className="text-emerald-400 font-bold text-sm tracking-tight mr-1">FocusDo</span>

          {/* View tabs (hidden in focus mode) */}
          {!focusMode && (
            <div className="flex items-center gap-0.5 bg-[#141414] rounded-lg p-0.5 border border-[#222]">
              {(["today", "backlog"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => switchView(v)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeView === v
                      ? v === "today"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  {v === "today"
                    ? `Today ${todayTasks.length > 0 ? `(${todayTasks.length}/3)` : ""}`
                    : `Backlog ${backlogTasks.length > 0 ? `(${backlogTasks.length})` : ""}`
                  }
                </button>
              ))}
            </div>
          )}

          {focusMode && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium animate-pulse">
              FOCUS
            </span>
          )}

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setShowDash(true)}  title="Hypothesis metrics"
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded transition-all">📊</button>
            <button onClick={toggleFocusMode}
              className={`px-2 py-1 text-xs rounded transition-all ${
                focusMode ? "text-emerald-400 bg-emerald-400/10" : "text-gray-600 hover:text-gray-300 hover:bg-white/5"
              }`}
              title={focusMode ? "Exit focus (F)" : "Focus Mode (F)"}>
              {focusMode ? "Exit Focus" : "Focus"}
            </button>
            <button onClick={() => setShowHelp(true)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded transition-all"
              title="Keyboard shortcuts (?)">?</button>

            {/* Auth */}
            {user ? (
              <button onClick={signOut} title="Sign out"
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded transition-all">
                {user.email.split("@")[0]}↗
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} title="Sign in to sync"
                className="px-2 py-1 text-xs text-gray-600 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-all">
                Sync ↗
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-5 pb-16">

        {/* New-task input */}
        {isInputOpen && (
          <div className="mb-4">
            <TaskInput
              defaultList={focusMode ? "today" : activeView}
              canAddToToday={canPromote || activeView === "today"}
              onSubmit={(text, priority, list) => addTask(text, priority, list, "keyboard")}
              onCancel={closeInput}
            />
          </div>
        )}

        {!isInputOpen && (
          <button
            onClick={openInput}
            className="w-full mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#222] text-gray-600 hover:border-[#333] hover:text-gray-400 transition-all text-sm"
          >
            <span className="text-emerald-500 text-base leading-none">+</span>
            <span>New task</span>
            <span className="ml-auto flex items-center gap-1.5">
              <kbd className="text-xs bg-[#181818] border border-[#272727] px-1.5 py-0.5 rounded text-gray-600">N</kbd>
            </span>
          </button>
        )}

        {/* Focus mode: single column, today only */}
        {focusMode ? (
          <TodayView tasks={todayTasks.slice(0, 3)} {...panelProps} focusMode onDemote={demoteTaskById} />
        ) : (
          <>
            {/* Split view: Today | Backlog on md+, tabs on mobile */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-5">
              <TodayView   tasks={todayTasks}  {...panelProps} focusMode={false} onDemote={demoteTaskById} />
              <BacklogView tasks={backlogTasks} {...panelProps} canPromote={canPromote} onPromote={promoteTaskById} />
            </div>

            {/* Mobile: active tab only */}
            <div className="md:hidden">
              {activeView === "today"
                ? <TodayView   tasks={todayTasks}  {...panelProps} focusMode={false} onDemote={demoteTaskById} />
                : <BacklogView tasks={backlogTasks} {...panelProps} canPromote={canPromote} onPromote={promoteTaskById} />
              }
            </div>
          </>
        )}

        {/* Completed section */}
        {completedTasks.length > 0 && (
          <section className="mt-8">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-2 mb-2 text-[10px] text-gray-700 hover:text-gray-500 uppercase tracking-widest transition-colors"
            >
              <span>{showCompleted ? "▾" : "▸"}</span>
              Completed <span className="text-gray-800">{completedTasks.length}</span>
            </button>
            {showCompleted && (
              <div className="space-y-1">
                {completedTasks.slice(0, 20).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded opacity-35">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-700 flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    </div>
                    <span className="text-xs text-gray-500 line-through">{t.text}</span>
                    <span className="text-[10px] text-gray-700 ml-auto">{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#080808]/90 backdrop-blur border-t border-[#191919] z-10">
        <div className="max-w-3xl mx-auto px-4 h-8 flex items-center gap-3 text-[11px] text-gray-700">
          <span className="text-emerald-700">{todayTasks.length}/3</span>
          <span className="text-[#282828]">·</span>
          <span>{backlogTasks.length} backlog</span>
          {selectedId && (
            <>
              <span className="text-[#282828]">·</span>
              <span className="text-gray-600">
                <kbd className="text-gray-500">Space</kbd> done ·{" "}
                <kbd className="text-gray-500">P</kbd> today ·{" "}
                <kbd className="text-gray-500">B</kbd> backlog ·{" "}
                <kbd className="text-gray-500">E</kbd> edit ·{" "}
                <kbd className="text-gray-500">D</kbd> del
              </span>
            </>
          )}
          <span className="ml-auto">
            <kbd className="text-gray-600">Tab</kbd> switch ·{" "}
            <kbd className="text-gray-600">?</kbd> help
          </span>
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
