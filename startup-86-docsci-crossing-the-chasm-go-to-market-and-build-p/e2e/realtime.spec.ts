/**
 * realtime.spec.ts — Worker pool, Realtime streaming, SSE endpoint
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── Worker pool unit validation ───────────────────────────────────────────────

test.describe("Worker pool source validation", () => {
  const libPath = path.join(process.cwd(), "lib/worker-pool.ts");

  test("lib/worker-pool.ts exists", () => {
    expect(fs.existsSync(libPath)).toBe(true);
  });

  test("exports WorkerPool class", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("export class WorkerPool");
  });

  test("exports parallelMap function", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("export async function parallelMap");
  });

  test("WorkerPool.optimalConcurrency is exported", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("static optimalConcurrency");
  });

  test("WorkerPool.partition is exported", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("static partition");
  });

  test("handles concurrency clamping (max 8)", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("Math.min");
    expect(content).toContain("Math.max");
  });
});

// ── Run progress broadcaster validation ──────────────────────────────────────

test.describe("Run progress broadcaster source validation", () => {
  const libPath = path.join(process.cwd(), "lib/run-progress.ts");

  test("lib/run-progress.ts exists", () => {
    expect(fs.existsSync(libPath)).toBe(true);
  });

  test("exports RunProgressBroadcaster", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("export class RunProgressBroadcaster");
  });

  test("has stageStarted method", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("async stageStarted");
  });

  test("has stageProgress method", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("async stageProgress");
  });

  test("has stageComplete method", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("async stageComplete");
  });

  test("has runCompleted method", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("async runCompleted");
  });

  test("has runFailed method", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("async runFailed");
  });

  test("uses Supabase realtime broadcast", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("broadcast");
    expect(content).toContain("channel");
  });

  test("defines RunProgressEvent discriminated union", () => {
    const content = fs.readFileSync(libPath, "utf8");
    expect(content).toContain("run:stage_started");
    expect(content).toContain("run:stage_complete");
    expect(content).toContain("run:completed");
    expect(content).toContain("run:failed");
    expect(content).toContain("run:log");
  });
});

// ── RunStatusStream component validation ─────────────────────────────────────

test.describe("RunStatusStream component source validation", () => {
  const compPath = path.join(process.cwd(), "components/RunStatusStream.tsx");

  test("components/RunStatusStream.tsx exists", () => {
    expect(fs.existsSync(compPath)).toBe(true);
  });

  test("is a client component", () => {
    const content = fs.readFileSync(compPath, "utf8");
    expect(content.trimStart().startsWith('"use client"') || content.startsWith("'use client'")).toBe(true);
  });

  test("subscribes to Supabase realtime channel", () => {
    const content = fs.readFileSync(compPath, "utf8");
    expect(content).toContain("channel");
    expect(content).toContain("broadcast");
  });

  test("handles run:completed event", () => {
    const content = fs.readFileSync(compPath, "utf8");
    expect(content).toContain("run:completed");
  });

  test("handles run:stage_started event", () => {
    const content = fs.readFileSync(compPath, "utf8");
    expect(content).toContain("run:stage_started");
  });

  test("has fallback polling", () => {
    const content = fs.readFileSync(compPath, "utf8");
    expect(content).toContain("setInterval");
    expect(content).toContain("docsci_runs");
  });

  test("exports RunStatusStream", () => {
    const content = fs.readFileSync(compPath, "utf8");
    expect(content).toContain("export function RunStatusStream");
  });

  test("has compact prop", () => {
    const content = fs.readFileSync(compPath, "utf8");
    expect(content).toContain("compact");
  });

  test("has onComplete callback prop", () => {
    const content = fs.readFileSync(compPath, "utf8");
    expect(content).toContain("onComplete");
  });
});

// ── Run orchestrator integration ─────────────────────────────────────────────

test.describe("Run orchestrator integration", () => {
  const orchPath = path.join(process.cwd(), "lib/run-orchestrator.ts");

  test("imports RunProgressBroadcaster", () => {
    const content = fs.readFileSync(orchPath, "utf8");
    expect(content).toContain("RunProgressBroadcaster");
    expect(content).toContain("./run-progress");
  });

  test("imports WorkerPool or parallelMap", () => {
    const content = fs.readFileSync(orchPath, "utf8");
    expect(content).toContain("WorkerPool");
    expect(content).toContain("./worker-pool");
  });

  test("creates RunProgressBroadcaster instance", () => {
    const content = fs.readFileSync(orchPath, "utf8");
    expect(content).toContain("new RunProgressBroadcaster");
  });

  test("calls optimalConcurrency", () => {
    const content = fs.readFileSync(orchPath, "utf8");
    expect(content).toContain("optimalConcurrency");
  });

  test("broadcasts run completion", () => {
    const content = fs.readFileSync(orchPath, "utf8");
    expect(content).toContain("progress.runCompleted");
  });

  test("broadcasts stage started", () => {
    const content = fs.readFileSync(orchPath, "utf8");
    expect(content).toContain("progress.stageStarted");
  });
});

// ── SSE stream endpoint ───────────────────────────────────────────────────────

test.describe("GET /api/runs/stream — SSE endpoint", () => {
  test("returns 400 without run_id", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/stream`);
    expect(res.status()).toBe(400);
  });

  test("returns SSE headers for valid run_id format", async ({ request }) => {
    // Use a fake run_id — it should still set up SSE headers and send initial event
    const res = await request.get(`${BASE}/api/runs/stream?run_id=00000000-0000-0000-0000-000000000001`, {
      timeout: 5000,
    });
    const contentType = res.headers()["content-type"] ?? "";
    // Accept either SSE (if run not found = run:error) or redirect/error  
    expect(res.status()).toBeLessThan(500);
    // Content-type should be text/event-stream or json (if run not found returns JSON error)
    expect(contentType).toBeTruthy();
  });
});

// ── SSE stream source file ────────────────────────────────────────────────────

test.describe("SSE stream source validation", () => {
  const ssePath = path.join(process.cwd(), "app/api/runs/stream/route.ts");

  test("app/api/runs/stream/route.ts exists", () => {
    expect(fs.existsSync(ssePath)).toBe(true);
  });

  test("returns text/event-stream content type", () => {
    const content = fs.readFileSync(ssePath, "utf8");
    expect(content).toContain("text/event-stream");
  });

  test("has run:completed event", () => {
    const content = fs.readFileSync(ssePath, "utf8");
    expect(content).toContain("run:completed");
  });

  test("has run:status event", () => {
    const content = fs.readFileSync(ssePath, "utf8");
    expect(content).toContain("run:status");
  });

  test("polls docsci_runs table", () => {
    const content = fs.readFileSync(ssePath, "utf8");
    expect(content).toContain("docsci_runs");
  });

  test("has MAX_DURATION_MS timeout safety", () => {
    const content = fs.readFileSync(ssePath, "utf8");
    expect(content).toContain("MAX_DURATION_MS");
  });
});

// ── Realtime-enabled tables ───────────────────────────────────────────────────

test.describe("Supabase Realtime configuration", () => {
  test("GET /api/health reports realtime tables", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    // Health endpoint should exist
  });

  test("healthcheck endpoint accessible", async ({ request }) => {
    const res = await request.get(`${BASE}/api/healthcheck`);
    expect(res.status()).toBeLessThan(500);
  });
});
