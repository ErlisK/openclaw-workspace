"use client";
/**
 * components/RunStatusStream.tsx
 *
 * Subscribes to Supabase Realtime broadcast for a run and shows live progress.
 *
 * Usage:
 *   <RunStatusStream runId="uuid" onComplete={(status) => ...} />
 *
 * Events consumed (from lib/run-progress.ts):
 *   run:stage_started   — shows stage as "running"
 *   run:stage_progress  — updates progress bar
 *   run:stage_complete  — marks stage done with finding count
 *   run:completed       — final status
 *   run:failed          — shows error state
 *   run:log             — appends to log stream
 *
 * Also polls docsci_runs for status changes as a fallback (Realtime may not
 * be available in all environments).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

type RunStage = "snippets" | "a11y" | "drift" | "copy" | "openapi" | "setup" | "saving";
type StageStatus = "pending" | "running" | "done" | "error";

type StageState = {
  stage: RunStage;
  label: string;
  status: StageStatus;
  findingsFound: number;
  durationMs?: number;
  progress?: { done: number; total: number; filePath?: string };
};

type LogEntry = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  time: number;
};

const STAGE_LABELS: Record<RunStage, string> = {
  setup: "Setup",
  snippets: "Snippet execution",
  a11y: "Accessibility",
  drift: "API drift",
  copy: "Copy lint",
  openapi: "OpenAPI validation",
  saving: "Saving results",
};

const STATUS_ICON: Record<StageStatus, string> = {
  pending: "○",
  running: "●",
  done: "✓",
  error: "✗",
};

const STATUS_COLOR: Record<StageStatus, string> = {
  pending: "text-gray-500",
  running: "text-blue-400",
  done: "text-green-400",
  error: "text-red-400",
};

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export interface RunStatusStreamProps {
  runId: string;
  initialStatus?: string;
  onComplete?: (status: "passed" | "failed") => void;
  compact?: boolean;
}

export function RunStatusStream({ runId, initialStatus = "queued", onComplete, compact = false }: RunStatusStreamProps) {
  const [overallStatus, setOverallStatus] = useState(initialStatus);
  const [stages, setStages] = useState<StageState[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [findingCount, setFindingCount] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof supabaseClient>["channel"]> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logIdRef = useRef(0);

  const addLog = useCallback((level: "info" | "warn" | "error", message: string) => {
    setLogs(prev => [...prev.slice(-49), { id: String(logIdRef.current++), level, message, time: Date.now() }]);
  }, []);

  const updateStage = useCallback((stage: RunStage, update: Partial<StageState>) => {
    setStages(prev => {
      const idx = prev.findIndex(s => s.stage === stage);
      if (idx >= 0) {
        return prev.map((s, i) => i === idx ? { ...s, ...update } : s);
      }
      return [...prev, {
        stage,
        label: STAGE_LABELS[stage] ?? stage,
        status: "running",
        findingsFound: 0,
        ...update,
      }];
    });
  }, []);

  // Fallback polling from Supabase DB
  const pollStatus = useCallback(async () => {
    try {
      const db = supabaseClient();
      const { data } = await db
        .from("docsci_runs")
        .select("status, finding_count_local:id")
        .eq("id", runId)
        .single();
      if (data?.status && ["passed", "failed", "error"].includes(data.status)) {
        setOverallStatus(data.status);
        if (data.status === "passed" || data.status === "failed") {
          onComplete?.(data.status as "passed" | "failed");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }
    } catch { /* */ }
  }, [runId, onComplete]);

  useEffect(() => {
    if (["passed", "failed", "error"].includes(overallStatus)) return;

    const db = supabaseClient();
    const channel = db.channel(`run:${runId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "run:stage_started" }, ({ payload }) => {
        updateStage(payload.stage, { status: "running", progress: { done: 0, total: payload.file_count } });
      })
      .on("broadcast", { event: "run:stage_progress" }, ({ payload }) => {
        updateStage(payload.stage, {
          status: "running",
          progress: { done: payload.done, total: payload.total, filePath: payload.file_path },
        });
      })
      .on("broadcast", { event: "run:stage_complete" }, ({ payload }) => {
        updateStage(payload.stage, {
          status: payload.findings_found > 0 ? "error" : "done",
          findingsFound: payload.findings_found,
          durationMs: payload.duration_ms,
          progress: undefined,
        });
      })
      .on("broadcast", { event: "run:completed" }, ({ payload }) => {
        setOverallStatus(payload.status);
        setFindingCount(payload.finding_count);
        setDurationMs(payload.duration_ms);
        onComplete?.(payload.status);
        if (pollRef.current) clearInterval(pollRef.current);
      })
      .on("broadcast", { event: "run:failed" }, ({ payload }) => {
        setOverallStatus("error");
        addLog("error", payload.error);
        if (pollRef.current) clearInterval(pollRef.current);
      })
      .on("broadcast", { event: "run:log" }, ({ payload }) => {
        addLog(payload.level, payload.message);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // Start DB polling as fallback
    pollRef.current = setInterval(pollStatus, 4000);

    return () => {
      db.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId, overallStatus, updateStage, addLog, pollStatus, onComplete]);

  const isComplete = ["passed", "failed", "error"].includes(overallStatus);
  const statusColor = overallStatus === "passed" ? "text-green-400"
    : overallStatus === "failed" ? "text-red-400"
    : overallStatus === "error" ? "text-red-400"
    : "text-blue-400";

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm" data-testid="run-status-stream-compact">
        <span className={`font-medium ${statusColor}`}>
          {isComplete ? (overallStatus === "passed" ? "✓ Passed" : "✗ Failed") : "● Running"}
        </span>
        {!isComplete && <span className="text-gray-500 text-xs">{connected ? "live" : "polling"}</span>}
        {isComplete && durationMs && <span className="text-gray-500 text-xs">{(durationMs / 1000).toFixed(1)}s</span>}
        {findingCount > 0 && <span className="text-yellow-400 text-xs">{findingCount} finding(s)</span>}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="run-status-stream">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${statusColor}`}>
            {isComplete
              ? overallStatus === "passed" ? "✓ Passed" : "✗ Failed"
              : "● Running"}
          </span>
          <span className="text-gray-600 text-xs font-mono">{runId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {!isComplete && (
            <span className={`flex items-center gap-1 ${connected ? "text-green-500" : "text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
              {connected ? "Live" : "Polling"}
            </span>
          )}
          {durationMs && <span>{(durationMs / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      {/* Stage list */}
      {stages.length > 0 && (
        <div className="space-y-1.5" data-testid="stage-list">
          {stages.map(s => (
            <div key={s.stage} className="flex items-center gap-2">
              <span className={`text-xs font-mono ${STATUS_COLOR[s.status]}`}>
                {STATUS_ICON[s.status]}
              </span>
              <span className="text-sm text-gray-300 flex-1">{s.label}</span>
              {s.progress && s.status === "running" && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-16 h-1 bg-gray-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded transition-all"
                      style={{ width: `${s.progress.total > 0 ? (s.progress.done / s.progress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span>{s.progress.done}/{s.progress.total}</span>
                </div>
              )}
              {s.status !== "running" && s.findingsFound > 0 && (
                <span className="text-xs text-yellow-400">{s.findingsFound} finding(s)</span>
              )}
              {s.durationMs && s.status !== "running" && (
                <span className="text-xs text-gray-600">{(s.durationMs / 1000).toFixed(1)}s</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {isComplete && (
        <div className={`p-3 rounded-lg text-sm ${
          overallStatus === "passed" ? "bg-green-950 border border-green-700 text-green-300"
          : "bg-red-950 border border-red-700 text-red-300"
        }`} data-testid="run-result-summary">
          {overallStatus === "passed"
            ? `✓ All checks passed${durationMs ? ` in ${(durationMs / 1000).toFixed(1)}s` : ""}`
            : `✗ ${findingCount} finding(s) found${durationMs ? ` — ${(durationMs / 1000).toFixed(1)}s` : ""}`}
        </div>
      )}

      {/* Log stream */}
      {logs.length > 0 && !compact && (
        <div className="bg-gray-950 rounded-lg border border-gray-800 p-3 max-h-40 overflow-y-auto" data-testid="run-log-stream">
          {logs.map(l => (
            <div key={l.id} className={`text-xs font-mono ${
              l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-yellow-400" : "text-gray-500"
            }`}>
              [{new Date(l.time).toISOString().slice(11, 19)}] {l.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
