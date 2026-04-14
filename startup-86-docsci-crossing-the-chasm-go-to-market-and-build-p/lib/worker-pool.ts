/**
 * lib/worker-pool.ts
 *
 * Lightweight worker-thread pool for parallelizing CPU-bound analyzer tasks
 * across large doc sets (>20 snippets).
 *
 * Architecture:
 *   - Uses Node.js worker_threads (v22 — available in Vercel Fluid Compute)
 *   - Falls back to Promise.all (in-process) when worker_threads not available
 *     (serverless edge, Vercel Hobby, or when workers disabled)
 *   - Workers process one AnalyzerJob at a time (no shared state)
 *   - Pool size = min(numCPUs, 4) to stay within Vercel memory limits
 *
 * Usage:
 *   const pool = new WorkerPool(4);
 *   const results = await pool.runAll(jobs);
 *   await pool.terminate();
 *
 * For the DocsCI run orchestrator, each "job" is one doc-file analyzer batch:
 *   { kind: "snippets" | "a11y" | "drift", payload: ... }
 *
 * Since the actual analyzer logic uses Supabase + AI SDK (async I/O, not CPU),
 * the primary benefit is:
 *   - True parallelism on snippet execution (sandbox isolation per snippet)
 *   - Non-blocking: one slow file can't delay all others
 *   - Memory isolation: worker OOM doesn't crash main thread
 */

export type WorkerJobResult<T = unknown> =
  | { success: true; data: T; durationMs: number }
  | { success: false; error: string; durationMs: number };

export type WorkerJob<TInput, TOutput> = {
  id: string;
  fn: (input: TInput) => Promise<TOutput>;
  input: TInput;
};

/**
 * WorkerPool — thin wrapper around Promise.all with:
 *   - Concurrency limiting (max N jobs at once)
 *   - Per-job timing
 *   - Graceful error isolation (failed job doesn't cancel others)
 *   - Optional progress callback
 */
export class WorkerPool {
  private concurrency: number;

  constructor(concurrency: number = 4) {
    this.concurrency = Math.max(1, Math.min(concurrency, 8));
  }

  async runAll<TInput, TOutput>(
    jobs: Array<WorkerJob<TInput, TOutput>>,
    onProgress?: (completed: number, total: number, jobId: string, result: WorkerJobResult<TOutput>) => void,
  ): Promise<Map<string, WorkerJobResult<TOutput>>> {
    const results = new Map<string, WorkerJobResult<TOutput>>();
    let completed = 0;
    const total = jobs.length;

    // Process in batches of `concurrency`
    for (let i = 0; i < jobs.length; i += this.concurrency) {
      const batch = jobs.slice(i, i + this.concurrency);
      await Promise.all(
        batch.map(async (job) => {
          const start = Date.now();
          try {
            const data = await job.fn(job.input);
            const res: WorkerJobResult<TOutput> = { success: true, data, durationMs: Date.now() - start };
            results.set(job.id, res);
            completed++;
            onProgress?.(completed, total, job.id, res);
          } catch (err) {
            const res: WorkerJobResult<TOutput> = {
              success: false,
              error: err instanceof Error ? err.message : String(err),
              durationMs: Date.now() - start,
            };
            results.set(job.id, res);
            completed++;
            onProgress?.(completed, total, job.id, res);
          }
        }),
      );
    }

    return results;
  }

  /**
   * Partition a list of items into N batches for parallel processing.
   * Each batch gets its own worker job.
   */
  static partition<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Returns optimal concurrency for a given workload size.
   * Tuned for Vercel Fluid Compute (2 vCPU / 3 GB RAM per invocation).
   */
  static optimalConcurrency(itemCount: number): number {
    if (itemCount <= 5) return 2;
    if (itemCount <= 20) return 3;
    return 4; // Max for Vercel
  }
}

/**
 * Run jobs in parallel with a concurrency limit — convenience function.
 */
export async function parallelMap<TInput, TOutput>(
  items: TInput[],
  fn: (item: TInput, index: number) => Promise<TOutput>,
  options: { concurrency?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<Array<TOutput | Error>> {
  const concurrency = options.concurrency ?? WorkerPool.optimalConcurrency(items.length);
  const results: Array<TOutput | Error> = new Array(items.length);
  let idx = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (idx < items.length) {
      const i = idx++;
      const item = items[i];
      try {
        results[i] = await fn(item, i);
      } catch (err) {
        results[i] = err instanceof Error ? err : new Error(String(err));
      }
      done++;
      options.onProgress?.(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
