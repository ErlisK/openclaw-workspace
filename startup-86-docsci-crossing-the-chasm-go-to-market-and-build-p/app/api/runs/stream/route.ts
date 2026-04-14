/**
 * GET /api/runs/stream?run_id=<uuid>
 *
 * Server-Sent Events (SSE) endpoint for run progress streaming.
 * Alternative to Supabase Realtime WebSocket — works in all environments
 * (HTTP/1.1 clients, restricted firewalls, Vercel Edge).
 *
 * Polls docsci_runs every 2s and streams status+finding_count as SSE events.
 * Terminates when run reaches a terminal state (passed/failed/error).
 *
 * Client usage:
 *   const es = new EventSource(`/api/runs/stream?run_id=${runId}`);
 *   es.addEventListener("run:status", (e) => console.log(JSON.parse(e.data)));
 *   es.addEventListener("run:completed", () => es.close());
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function svc() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
  );
}

const TERMINAL_STATUSES = new Set(["passed", "failed", "error", "cancelled"]);
const POLL_INTERVAL_MS = 2000;
const MAX_DURATION_MS = 300_000; // 5 minutes max SSE stream

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("run_id");
  if (!runId) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let lastStatus = "";
  let lastFindingCount = -1;
  const startMs = Date.now();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(eventName: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      }

      // Initial heartbeat
      send("run:connected", { run_id: runId, ts: Date.now() });

      const poll = async () => {
        if (closed || Date.now() - startMs > MAX_DURATION_MS) {
          if (!closed) {
            send("run:timeout", { message: "Stream timeout — poll for final status" });
            controller.close();
            closed = true;
          }
          return;
        }

        try {
          const db = svc();
          const { data: run } = await db
            .from("docsci_runs")
            .select("id, status, snippets_total, snippets_passed, snippets_failed, drift_detected, duration_ms, finding_count_approx:id")
            .eq("id", runId)
            .single();

          if (!run) {
            send("run:error", { error: "Run not found" });
            controller.close();
            closed = true;
            return;
          }

          // Get finding count
          const { count: findingCount } = await db
            .from("docsci_findings")
            .select("id", { count: "exact", head: true })
            .eq("run_id", runId);

          const fc = findingCount ?? 0;
          const statusChanged = run.status !== lastStatus;
          const findingsChanged = fc !== lastFindingCount;

          if (statusChanged || findingsChanged) {
            send("run:status", {
              run_id: runId,
              status: run.status,
              finding_count: fc,
              snippets_total: run.snippets_total,
              snippets_passed: run.snippets_passed,
              snippets_failed: run.snippets_failed,
              drift_detected: run.drift_detected,
              duration_ms: run.duration_ms,
              ts: Date.now(),
            });
            lastStatus = run.status;
            lastFindingCount = fc;
          }

          if (TERMINAL_STATUSES.has(run.status)) {
            send("run:completed", {
              run_id: runId,
              status: run.status,
              finding_count: fc,
              duration_ms: run.duration_ms,
            });
            controller.close();
            closed = true;
            return;
          }
        } catch (err) {
          send("run:error", { error: String(err) });
          // Don't close — keep polling in case it's transient
        }

        setTimeout(poll, POLL_INTERVAL_MS);
      };

      setTimeout(poll, 500);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
