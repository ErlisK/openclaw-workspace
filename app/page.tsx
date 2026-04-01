"use client";

import { useState, useCallback } from "react";
import { useTodos } from "@/hooks/useTodos";
import { useKeyboard } from "@/hooks/useKeyboard";
import { TaskItem } from "@/components/TaskItem";
import { TaskInput } from "@/components/TaskInput";
import { FocusMode } from "@/components/FocusMode";
import { HelpModal } from "@/components/HelpModal";
import { Dashboard } from "@/components/Dashboard";
import { getActiveTasks, getCompletedTasks } from "@/lib/tasks";

export default function Home() {
  const {
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
  } = useTodos();

  const [showHelp, setShowHelp] = useState(false);
  const [showDash, setShowDash] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const toggleHelp = useCallback(() => setShowHelp((v) => !v), []);

  const handleEscape = useCallback(() => {
    if (showHelp) { setShowHelp(false); return; }
    if (showDash) { setShowDash(false); return; }
    if (isInputOpen) { closeInput(); return; }
    if (editingId) { cancelEdit(); return; }
    setSelectedId(null);
  }, [showHelp, showDash, isInputOpen, editingId, closeInput, cancelEdit, setSelectedId]);

  useKeyboard({
    tasks,
    selectedId,
    setSelectedId,
    isInputOpen,
    editingId,
    focusMode,
    onNewTask: openInput,
    onComplete: completeTaskById,
    onDelete: deleteTaskById,
    onEdit: startEdit,
    onToggleFocus: toggleFocusMode,
    onToggleHelp: toggleHelp,
    onSetPriority: setPriority,
    onEscape: handleEscape,
  });

  const activeTasks = getActiveTasks(tasks);
  const completedTasks = getCompletedTasks(tasks);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/90 backdrop-blur border-b border-[#1e1e1e]">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-sm tracking-tight">FocusDo</span>
            {focusMode && (
              <span className="text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5 rounded-full font-medium">
                FOCUS
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDash(true)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded transition-all"
              title="Open metrics dashboard"
            >
              📊
            </button>
            <button
              onClick={toggleFocusMode}
              className={`px-2 py-1 text-xs rounded transition-all ${
                focusMode
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-gray-600 hover:text-gray-300 hover:bg-white/5"
              }`}
              title="Toggle Focus Mode (F)"
            >
              Focus
            </button>
            <button
              onClick={toggleHelp}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded transition-all"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-6">

        {focusMode ? (
          <FocusMode
            tasks={tasks}
            selectedId={selectedId}
            editingId={editingId}
            onSelect={setSelectedId}
            onComplete={completeTaskById}
            onDelete={deleteTaskById}
            onStartEdit={startEdit}
            onSaveEdit={editTask}
            onCancelEdit={cancelEdit}
          />
        ) : (
          <>
            {/* ── New task input ─────────────────────────────────────────────── */}
            {isInputOpen ? (
              <div className="mb-4">
                <TaskInput
                  onSubmit={(text, priority) => addTask(text, priority, "keyboard")}
                  onCancel={closeInput}
                />
              </div>
            ) : (
              <button
                onClick={() => { openInput(); }}
                className="w-full mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-[#2e2e2e] text-gray-600 hover:border-[#3e3e3e] hover:text-gray-400 transition-all text-sm"
              >
                <span className="text-emerald-500">+</span>
                <span>New task</span>
                <kbd className="ml-auto text-xs bg-[#1e1e1e] border border-[#2e2e2e] px-1.5 py-0.5 rounded text-gray-600">N</kbd>
              </button>
            )}

            {/* ── Active tasks ───────────────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xs text-gray-600 uppercase tracking-widest">
                  Tasks
                </h2>
                <span className="text-xs text-gray-700">
                  {activeTasks.length}
                </span>
              </div>

              {activeTasks.length === 0 && !isInputOpen && (
                <div className="text-center py-16 text-gray-600">
                  <p className="text-3xl mb-2">✓</p>
                  <p className="text-sm">Nothing to do. Press <kbd className="text-gray-500">N</kbd> to add a task.</p>
                </div>
              )}

              <div className="space-y-1">
                {activeTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isSelected={selectedId === task.id}
                    isEditing={editingId === task.id}
                    onSelect={() => setSelectedId(task.id)}
                    onComplete={completeTaskById}
                    onDelete={deleteTaskById}
                    onStartEdit={startEdit}
                    onSaveEdit={editTask}
                    onCancelEdit={cancelEdit}
                  />
                ))}
              </div>
            </section>

            {/* ── Completed tasks ────────────────────────────────────────────── */}
            {completedTasks.length > 0 && (
              <section className="mt-8">
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="flex items-center gap-2 mb-2 text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors"
                >
                  <span>{showCompleted ? "▾" : "▸"}</span>
                  <span>Completed</span>
                  <span className="text-gray-700">{completedTasks.length}</span>
                </button>

                {showCompleted && (
                  <div className="space-y-1">
                    {completedTasks.slice(0, 20).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg opacity-40"
                      >
                        <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-gray-500" />
                        </div>
                        <span className="text-sm text-gray-500 line-through">{task.text}</span>
                        {task.completedAt && (
                          <span className="text-xs text-gray-700 ml-auto">
                            {new Date(task.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ── Status bar ──────────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur border-t border-[#1e1e1e]">
          <div className="max-w-2xl mx-auto px-4 h-8 flex items-center gap-4 text-xs text-gray-700">
            <span>{activeTasks.length} active</span>
            <span>·</span>
            <span>{completedTasks.length} done</span>
            {selectedId && (
              <>
                <span>·</span>
                <span className="text-gray-600">
                  <kbd className="text-gray-500">Space</kbd> complete ·{" "}
                  <kbd className="text-gray-500">E</kbd> edit ·{" "}
                  <kbd className="text-gray-500">D</kbd> delete ·{" "}
                  <kbd className="text-gray-500">1/2/3</kbd> priority
                </span>
              </>
            )}
            <span className="ml-auto">
              <kbd className="text-gray-600">?</kbd> help
            </span>
          </div>
        </div>
      </main>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showDash && <Dashboard onClose={() => setShowDash(false)} />}
    </div>
  );
}
