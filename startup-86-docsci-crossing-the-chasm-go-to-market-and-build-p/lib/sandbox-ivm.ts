/**
 * lib/sandbox-ivm.ts
 *
 * Isolated-VM based hermetic JS/TS execution sandbox.
 *
 * Security model:
 * - Runs in a V8 Isolate with no access to host fs, net, process, require, or global
 * - Memory limit: 64MB per isolate
 * - CPU time limit: configurable (default 10s wall clock + script timeout)
 * - Stubbed fetch: enforces HTTPS allowlist, returns mocked responses for unknown hosts
 * - Stubbed console: captures stdout/stderr; no real I/O
 * - No require/import: module system unavailable inside isolate
 * - TypeScript: stripped to plain JS via Node 22 --experimental-strip-types before execution
 * - Output cap: 64KB stdout+stderr
 *
 * Execution metadata returned with every result:
 *   success, stdout, stderr, durationMs, timedOut, outputBytes, sandboxMode, exitCode
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { SandboxResult } from "./sandbox-types";

const execFileAsync = promisify(execFile);

const MAX_OUTPUT_BYTES = 65536; // 64KB
const MEMORY_LIMIT_MB = 64;
const DEFAULT_TIMEOUT_MS = 10_000;

// Fetch allowlist: only these host patterns are allowed inside the isolate
const FETCH_ALLOWLIST: RegExp[] = [
  /^api\.stripe\.com$/,
  /^api\.github\.com$/,
  /^hooks\.slack\.com$/,
  /^api\.sendgrid\.com$/,
  /^httpbin\.org$/,
  /^jsonplaceholder\.typicode\.com$/,
  /^.*\.supabase\.co$/,
  /^.*\.vercel\.app$/,
  /^snippetci\.com$/,
];

function isAllowlisted(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return FETCH_ALLOWLIST.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

function cap(s: string): string {
  if (s.length > MAX_OUTPUT_BYTES) {
    return s.slice(0, MAX_OUTPUT_BYTES) + "\n[output truncated]";
  }
  return s;
}

/**
 * Strip TypeScript type annotations using Node 22 --experimental-strip-types.
 * Returns the stripped JS source or throws on syntax error.
 */
async function stripTypes(tsCode: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "docsci-strip-"));
  const inPath = join(dir, "input.ts");
  // Wrap in a way that lets Node strip types and print the result
  // We use a loader approach: write the file, run node with --print-stripped flag isn't available
  // Instead run via a tiny Node script that uses module.compile path
  // Simplest: just write + run with node --experimental-strip-types, capture transpiled via eval trick

  // Actually: Node 22 --experimental-strip-types runs .ts files directly.
  // To EXTRACT the stripped code, we need to use the strip-types transform.
  // Use: node --input-type=module-typescript --experimental-strip-types with stdin
  await writeFile(inPath, tsCode, "utf8");
  try {
    // Run node with the .ts file but wrap in a way that outputs stripped source
    // The cleanest approach: use a helper script that reads the .ts file
    const helperPath = join(dir, "strip-helper.cjs");
    await writeFile(helperPath, `
// Use Node 22 built-in module._compile with type stripping
// We use a simple approach: just validate by running and capturing AST
// Actually, we use the undocumented stripTypeScriptTypes from node:module
const { stripTypeScriptTypes } = require('node:module');
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const stripped = stripTypeScriptTypes(src, { mode: 'strip' });
process.stdout.write(stripped);
`, "utf8");
    const { stdout } = await execFileAsync(
      "node",
      ["--no-warnings", helperPath, inPath],
      { timeout: 5000, cwd: dir, maxBuffer: MAX_OUTPUT_BYTES * 2 }
    );
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}

/**
 * Execute JS/TS code inside a V8 Isolate via isolated-vm.
 */
export async function executeInIsolate(
  code: string,
  isTS: boolean,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<SandboxResult> {
  // Dynamic import to avoid breaking Vercel build (native module)
  let ivm: typeof import("isolated-vm");
  try {
    ivm = await import("isolated-vm");
  } catch {
    // Fallback: isolated-vm not available (e.g. Vercel serverless)
    return {
      success: false,
      stdout: "",
      stderr: "isolated-vm not available in this environment",
      error: "isolated-vm not available",
      exitCode: 1,
      durationMs: 0,
      timedOut: false,
      outputBytes: 0,
      language: isTS ? "typescript" : "javascript",
      sandboxMode: "subprocess",
    };
  }

  const t0 = Date.now();
  let jsCode = code;

  // Strip TypeScript types
  if (isTS) {
    try {
      jsCode = await stripTypes(code);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        success: false,
        stdout: "",
        stderr: `TypeScript syntax error: ${msg}`,
        error: `TypeScript syntax error: ${msg}`,
        exitCode: 1,
        durationMs: Date.now() - t0,
        timedOut: false,
        outputBytes: 0,
        language: "typescript",
        sandboxMode: "ivm",
      };
    }
  }

  // Wrap code in an async IIFE
  const wrappedCode = `(async () => {\n${jsCode}\n})()`;

  const isolate = new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB });
  let stdout = "";
  let stderr = "";
  let timedOut = false;

  try {
    const context = await isolate.createContext();
    const jail = context.global;

    // Set global = globalThis reference
    await jail.set("global", jail.derefInto());

    // ── Stubbed console ──
    const consoleMethods = {
      log: new ivm.Reference((...args: unknown[]) => {
        const line = args.map((a) =>
          typeof a === "object" ? JSON.stringify(a) : String(a ?? "")
        ).join(" ");
        stdout += line + "\n";
      }),
      error: new ivm.Reference((...args: unknown[]) => {
        const line = args.map((a) =>
          typeof a === "object" ? JSON.stringify(a) : String(a ?? "")
        ).join(" ");
        stderr += line + "\n";
      }),
      warn: new ivm.Reference((...args: unknown[]) => {
        const line = args.map((a) =>
          typeof a === "object" ? JSON.stringify(a) : String(a ?? "")
        ).join(" ");
        stderr += "[warn] " + line + "\n";
      }),
    };
    // Inject console via bootstrap script
    await jail.set("__consoleLog", consoleMethods.log);
    await jail.set("__consoleError", consoleMethods.error);
    await jail.set("__consoleWarn", consoleMethods.warn);

    // ── Stubbed fetch (allowlist-enforced, synchronous host call) ──
    // Uses applySync so that await fetch() resolves correctly inside the isolate
    const fetchStub = new ivm.Reference((url: string, _opts: unknown) => {
      const allowed = isAllowlisted(url);
      const mockBody = allowed
        ? JSON.stringify({ ok: true })
        : JSON.stringify({ mocked: true, url });
      return {
        ok: true,
        status: 200,
        statusText: allowed ? "OK" : "OK (mocked)",
        body: mockBody,
        bodyParsed: JSON.parse(mockBody),
      };
    });
    await jail.set("__fetchStub", fetchStub);

    // Bootstrap: set up globals inside isolate
    const bootstrap = await isolate.compileScript(`
      const console = {
        log: (...args) => __consoleLog.applyIgnored(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a ?? '')), { arguments: { copy: true } }),
        error: (...args) => __consoleError.applyIgnored(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a ?? '')), { arguments: { copy: true } }),
        warn: (...args) => __consoleWarn.applyIgnored(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a ?? '')), { arguments: { copy: true } }),
        info: (...args) => __consoleLog.applyIgnored(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a ?? '')), { arguments: { copy: true } }),
        debug: (...args) => __consoleLog.applyIgnored(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a ?? '')), { arguments: { copy: true } }),
      };
      const fetch = async (url, opts) => {
        const raw = __fetchStub.applySync(undefined, [url, opts ?? {}], { arguments: { copy: true }, result: { copy: true } });
        return {
          ok: raw.ok,
          status: raw.status,
          statusText: raw.statusText,
          json: async () => raw.bodyParsed,
          text: async () => raw.body,
        };
      };
      // Block dangerous globals
      const require = undefined;
      const process = undefined;
      const __dirname = undefined;
      const __filename = undefined;
      const module = undefined;
      const exports = undefined;
    `);
    await bootstrap.run(context);

    // Compile and run user code
    const script = await isolate.compileScript(wrappedCode);
    const wallClockTimeout = Math.min(timeoutMs, 30_000);

    try {
      await script.run(context, { promise: true, timeout: wallClockTimeout });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Script execution timed out") || msg.includes("timeout")) {
        timedOut = true;
        stderr += `\nExecution timed out after ${wallClockTimeout}ms`;
      } else {
        stderr += msg;
      }
      const durationMs = Date.now() - t0;
      return {
        success: false,
        stdout: cap(stdout),
        stderr: cap(stderr),
        error: msg,
        exitCode: 1,
        durationMs,
        timedOut,
        outputBytes: stdout.length + stderr.length,
        language: isTS ? "typescript" : "javascript",
        sandboxMode: "ivm",
      };
    }

    const durationMs = Date.now() - t0;
    return {
      success: true,
      stdout: cap(stdout),
      stderr: cap(stderr),
      exitCode: 0,
      durationMs,
      timedOut: false,
      outputBytes: stdout.length + stderr.length,
      language: isTS ? "typescript" : "javascript",
      sandboxMode: "ivm",
    };
  } finally {
    isolate.dispose();
  }
}
