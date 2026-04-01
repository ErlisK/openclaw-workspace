// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Priority = "high" | "medium" | "low";
export type TaskStatus = "active" | "completed" | "deleted";

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: number;       // epoch ms
  completedAt?: number;    // epoch ms — set when status → completed
  deletedAt?: number;      // epoch ms — soft delete
  focusSlot?: 1 | 2 | 3;  // pinned position in focus mode
  order: number;           // display order
}

export interface AppState {
  tasks: Task[];
  focusMode: boolean;
  selectedId: string | null;
}

// ─── Event Schema ─────────────────────────────────────────────────────────────

export type EventName =
  | "task_created"
  | "task_completed"
  | "task_deleted"
  | "task_restored"
  | "focus_mode_entered"
  | "focus_mode_exited"
  | "keyboard_shortcut_used"
  | "session_started"
  | "error_caught";

export interface BaseEvent {
  event: EventName;
  ts: number;          // epoch ms
  session_id: string;  // uuid v4 per page load
}

export interface TaskCreatedEvent extends BaseEvent {
  event: "task_created";
  task_id: string;
  input_method: "keyboard" | "mouse";
  text_length: number;
}

export interface TaskCompletedEvent extends BaseEvent {
  event: "task_completed";
  task_id: string;
  input_method: "keyboard" | "mouse";
  time_to_complete_ms: number;  // createdAt → completedAt
  in_focus_mode: boolean;
}

export interface TaskDeletedEvent extends BaseEvent {
  event: "task_deleted";
  task_id: string;
  input_method: "keyboard" | "mouse";
}

export interface FocusModeEnteredEvent extends BaseEvent {
  event: "focus_mode_entered";
  task_count: number;
}

export interface FocusModeExitedEvent extends BaseEvent {
  event: "focus_mode_exited";
  task_count: number;
}

export type FocusModeEvent = FocusModeEnteredEvent | FocusModeExitedEvent;

export interface KeyboardShortcutEvent extends BaseEvent {
  event: "keyboard_shortcut_used";
  key: string;
  action: string;
}

export interface SessionStartedEvent extends BaseEvent {
  event: "session_started";
  active_tasks: number;
}

export interface ErrorEvent extends BaseEvent {
  event: "error_caught";
  message: string;
  stack?: string;
}

export type AppEvent =
  | TaskCreatedEvent
  | TaskCompletedEvent
  | TaskDeletedEvent
  | FocusModeEvent
  | KeyboardShortcutEvent
  | SessionStartedEvent
  | ErrorEvent;

// ─── Hotkey Map ───────────────────────────────────────────────────────────────

export interface Hotkey {
  keys: string[];
  action: string;
  description: string;
  context: "global" | "selected" | "input";
}

export const HOTKEY_MAP: Hotkey[] = [
  { keys: ["n", "/"],         action: "new_task",         description: "New task",              context: "global" },
  { keys: ["f"],              action: "toggle_focus",     description: "Toggle Focus Mode",     context: "global" },
  { keys: ["?"],              action: "toggle_help",      description: "Show / hide help",      context: "global" },
  { keys: ["j", "ArrowDown"], action: "select_next",      description: "Select next task",      context: "global" },
  { keys: ["k", "ArrowUp"],   action: "select_prev",      description: "Select previous task",  context: "global" },
  { keys: [" ", "x"],         action: "complete_task",    description: "Complete selected task", context: "selected" },
  { keys: ["d", "Delete"],    action: "delete_task",      description: "Delete selected task",  context: "selected" },
  { keys: ["e"],              action: "edit_task",        description: "Edit selected task",    context: "selected" },
  { keys: ["Escape"],         action: "deselect",         description: "Deselect / cancel",     context: "selected" },
  { keys: ["1", "2", "3"],    action: "priority",         description: "Set priority (1=high)",  context: "selected" },
  { keys: ["Enter"],          action: "submit_task",      description: "Save new task",         context: "input" },
  { keys: ["Escape"],         action: "cancel_input",     description: "Cancel input",          context: "input" },
];
