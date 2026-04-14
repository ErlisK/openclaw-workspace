/**
 * lib/run-progress.ts
 *
 * Supabase Realtime progress broadcaster for DocsCI runs.
 *
 * Uses Supabase Realtime Broadcast channel (low-latency, ephemeral) to
 * push per-stage progress updates to connected clients.
 *
 * Channel naming: `run:{runId}` — clients subscribe to this channel.
 *
 * Event types:
 *   run:stage_started   — analyzer stage began (stage, file_count)
 *   run:stage_progress  — incremental progress within a stage (done, total, file_path)
 *   run:stage_complete  — analyzer stage finished (stage, findings_found, duration_ms)
 *   run:completed       — run finished (status, finding_count, duration_ms)
 *   run:failed          — run hit a fatal error (error)
 *   run:log             — free-form log line (level: info|warn|error, message)
 *
 * Server-side usage:
 *   const progress = new RunProgressBroadcaster(runId);
 *   await progress.stageStarted("snippets", 12);
 *   await progress.stageProgress("snippets", 3, 12, "docs/quickstart.md");
 *   await progress.stageComplete("snippets", 2, 5400);
 *   await progress.runCompleted("failed", 2, 5900);
 *
 * Client-side: see components/RunStatusStream.tsx
 */

import { createClient } from "@supabase/supabase-js";

export type RunStage = "snippets" | "a11y" | "drift" | "copy" | "openapi" | "setup" | "saving";

export type RunProgressEvent =
  | { type: "run:stage_started"; stage: RunStage; file_count: number }
  | { type: "run:stage_progress"; stage: RunStage; done: number; total: number; file_path?: string }
  | { type: "run:stage_complete"; stage: RunStage; findings_found: number; duration_ms: number }
  | { type: "run:completed"; status: "passed" | "failed"; finding_count: number; duration_ms: number }
  | { type: "run:failed"; error: string }
  | { type: "run:log"; level: "info" | "warn" | "error"; message: string };

export class RunProgressBroadcaster {
  private runId: string;
  private client: ReturnType<typeof createClient> | null;

  constructor(runId: string) {
    this.runId = runId;
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      this.client = createClient(url, key, {
        realtime: { params: { eventsPerSecond: 10 } },
      });
    } else {
      this.client = null;
    }
  }

  private channelName(): string {
    return `run:${this.runId}`;
  }

  async broadcast(event: RunProgressEvent): Promise<void> {
    if (!this.client) return;
    try {
      const channel = this.client.channel(this.channelName());
      await channel.send({
        type: "broadcast",
        event: event.type,
        payload: event,
      });
      // Don't leave lingering subscriptions — remove immediately after send
      await this.client.removeChannel(channel);
    } catch {
      // Realtime broadcast is best-effort — never throw
    }
  }

  async stageStarted(stage: RunStage, fileCount: number): Promise<void> {
    await this.broadcast({ type: "run:stage_started", stage, file_count: fileCount });
    await this.log("info", `Starting ${stage} analysis on ${fileCount} file(s)`);
  }

  async stageProgress(stage: RunStage, done: number, total: number, filePath?: string): Promise<void> {
    await this.broadcast({ type: "run:stage_progress", stage, done, total, file_path: filePath });
  }

  async stageComplete(stage: RunStage, findingsFound: number, durationMs: number): Promise<void> {
    await this.broadcast({ type: "run:stage_complete", stage, findings_found: findingsFound, duration_ms: durationMs });
    await this.log(findingsFound > 0 ? "warn" : "info",
      `${stage}: ${findingsFound} finding(s) in ${(durationMs / 1000).toFixed(1)}s`);
  }

  async runCompleted(status: "passed" | "failed", findingCount: number, durationMs: number): Promise<void> {
    await this.broadcast({ type: "run:completed", status, finding_count: findingCount, duration_ms: durationMs });
  }

  async runFailed(error: string): Promise<void> {
    await this.broadcast({ type: "run:failed", error });
  }

  async log(level: "info" | "warn" | "error", message: string): Promise<void> {
    await this.broadcast({ type: "run:log", level, message });
  }
}
