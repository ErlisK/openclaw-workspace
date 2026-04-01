// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Priority    = "high" | "medium" | "low";
export type TaskStatus  = "active" | "completed" | "deleted";
export type TaskList    = "today" | "backlog";

export interface Task {
  id:            string;
  text:          string;
  status:        TaskStatus;
  priority:      Priority;
  list:          TaskList;    // "today" (≤3 cap) | "backlog" (unlimited)
  createdAt:     number;      // epoch ms
  completedAt?:  number;
  deletedAt?:    number;
  order:         number;      // sort index within list
}

export interface AppUser {
  id:    string;
  email: string;
}

// ─── Event Schema ─────────────────────────────────────────────────────────────

export type EventName =
  | "session_started"
  | "task_created"
  | "task_completed"
  | "task_deleted"
  | "task_promoted"
  | "task_demoted"
  | "task_edited"
  | "focus_mode_toggled"
  | "keyboard_shortcut_used"
  | "view_switched"
  | "auth_started"
  | "auth_completed"
  | "auth_failed"
  | "error_caught";

export interface BaseEvent {
  event:      EventName;
  ts:         number;
  session_id: string;
}

export interface TaskCreatedEvent extends BaseEvent {
  event:        "task_created";
  task_id:      string;
  input_method: "keyboard" | "mouse";
  text_length:  number;
  list:         TaskList;
  priority:     Priority;
  in_focus_mode: boolean;
}

export interface TaskCompletedEvent extends BaseEvent {
  event:                "task_completed";
  task_id:              string;
  input_method:         "keyboard" | "mouse";
  time_to_complete_ms:  number;
  in_focus_mode:        boolean;
  list:                 TaskList;
  priority:             Priority;
}

export interface TaskDeletedEvent extends BaseEvent {
  event:        "task_deleted";
  task_id:      string;
  input_method: "keyboard" | "mouse";
}

export interface TaskPromotedEvent extends BaseEvent {
  event:        "task_promoted";
  task_id:      string;
  input_method: "keyboard" | "mouse";
  today_count_after: number;
}

export interface TaskDemotedEvent extends BaseEvent {
  event:        "task_demoted";
  task_id:      string;
  input_method: "keyboard" | "mouse";
}

export interface TaskEditedEvent extends BaseEvent {
  event:    "task_edited";
  task_id:  string;
}

export interface FocusModeToggledEvent extends BaseEvent {
  event:         "focus_mode_toggled";
  enabled:       boolean;
  today_count:   number;
  backlog_count: number;
}

export interface KeyboardShortcutEvent extends BaseEvent {
  event:  "keyboard_shortcut_used";
  key:    string;
  action: string;
}

export interface ViewSwitchedEvent extends BaseEvent {
  event:    "view_switched";
  from_view: TaskList | "focus";
  to_view:   TaskList | "focus";
}

export interface AuthStartedEvent extends BaseEvent {
  event: "auth_started";
}

export interface AuthCompletedEvent extends BaseEvent {
  event:    "auth_completed";
  method:   "magic_link";
}

export interface AuthFailedEvent extends BaseEvent {
  event:   "auth_failed";
  reason:  string;
}

export interface SessionStartedEvent extends BaseEvent {
  event:         "session_started";
  active_tasks:  number;
  has_supabase:  boolean;
  has_posthog:   boolean;
  is_authed:     boolean;
}

export interface ErrorEvent extends BaseEvent {
  event:   "error_caught";
  message: string;
  stack?:  string;
  source:  "window_error" | "unhandled_rejection";
}

export type AppEvent =
  | TaskCreatedEvent
  | TaskCompletedEvent
  | TaskDeletedEvent
  | TaskPromotedEvent
  | TaskDemotedEvent
  | TaskEditedEvent
  | FocusModeToggledEvent
  | KeyboardShortcutEvent
  | ViewSwitchedEvent
  | AuthStartedEvent
  | AuthCompletedEvent
  | AuthFailedEvent
  | SessionStartedEvent
  | ErrorEvent;

// ─── Hotkey Map ───────────────────────────────────────────────────────────────

export interface Hotkey {
  keys:        string[];
  action:      string;
  description: string;
  context:     "global" | "selected" | "input";
}

export const TODAY_CAP = 3;

export const HOTKEY_MAP: Hotkey[] = [
  { keys: ["n", "/"],           action: "new_task",       description: "New task",                 context: "global"   },
  { keys: ["f"],                action: "toggle_focus",   description: "Toggle Focus Mode",         context: "global"   },
  { keys: ["Tab"],              action: "switch_view",    description: "Switch Today ↔ Backlog",   context: "global"   },
  { keys: ["?"],                action: "toggle_help",    description: "Show / hide help",          context: "global"   },
  { keys: ["j", "ArrowDown"],   action: "select_next",    description: "Select next task",          context: "global"   },
  { keys: ["k", "ArrowUp"],     action: "select_prev",    description: "Select previous task",      context: "global"   },
  { keys: [" ", "x"],           action: "complete_task",  description: "Complete selected task",    context: "selected" },
  { keys: ["p"],                action: "promote_task",   description: "Promote to Today",          context: "selected" },
  { keys: ["b"],                action: "demote_task",    description: "Demote to Backlog",         context: "selected" },
  { keys: ["e"],                action: "edit_task",      description: "Edit selected task",        context: "selected" },
  { keys: ["d", "Delete"],      action: "delete_task",    description: "Delete selected task",      context: "selected" },
  { keys: ["1"],                action: "priority_high",  description: "Priority → High",           context: "selected" },
  { keys: ["2"],                action: "priority_medium",description: "Priority → Medium",         context: "selected" },
  { keys: ["3"],                action: "priority_low",   description: "Priority → Low",            context: "selected" },
  { keys: ["Escape"],           action: "deselect",       description: "Deselect / cancel",         context: "selected" },
  { keys: ["Enter"],            action: "submit_task",    description: "Save task",                 context: "input"    },
  { keys: ["Escape"],           action: "cancel_input",   description: "Cancel input",              context: "input"    },
];
