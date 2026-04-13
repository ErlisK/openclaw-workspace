/**
 * Shared types for the DocsCI sandbox system.
 * Imported by both sandbox.ts (main) and sandbox-ivm.ts (ivm backend).
 */

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
  outputBytes: number;
  language: string;
  sandboxMode: "subprocess" | "simulated" | "ivm" | "pyodide";
}
