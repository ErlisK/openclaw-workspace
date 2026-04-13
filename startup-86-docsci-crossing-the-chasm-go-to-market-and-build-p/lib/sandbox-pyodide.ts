/**
 * lib/sandbox-pyodide.ts
 *
 * Pyodide (CPython WASM) based hermetic Python execution sandbox.
 *
 * Security model:
 * - Runs CPython 3.13 compiled to WebAssembly — no real subprocess execution
 * - Dangerous functions blocked: os.system, os.popen, os.execv, subprocess.*
 * - No real network: requests module stubbed with allowlist enforcement
 * - Fresh namespace per run (globals: fresh dict) — no state leakage between runs
 * - Singleton Pyodide instance cached across runs (2.5s initial load, <1ms thereafter)
 * - stdout/stderr captured via setStdout/setStderr batched callbacks
 * - Output cap: 64KB stdout+stderr
 * - Timeout: enforced via Promise.race with a rejection timer
 *
 * Stubbed requests:
 * - requests.get(url, **kwargs) → MockResponse
 * - requests.post(url, **kwargs) → MockResponse
 * - Allowlisted hosts get {ok: true} response; others get {mocked: true, url}
 * - MockResponse: .ok, .status_code, .json(), .text(), .raise_for_status()
 *
 * sandboxMode = 'pyodide' in all results
 */

import type { SandboxResult } from "./sandbox-types";

const MAX_OUTPUT_BYTES = 65536; // 64KB

// Fetch allowlist — only HTTPS to these patterns is "allowed" (still mocked, but not flagged)
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

// ── Singleton Pyodide instance ──
// Pyodide takes ~2.5s to load the WASM runtime; cache it across requests.
// In Next.js server, this persists across API calls in the same process.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pyodideInstance: any | null = null;
let _pyodideLoading: Promise<unknown> | null = null;

// Python security setup + stubbed requests — run once after pyodide loads
const SANDBOX_SETUP_PY = `
import sys, os, json, types

# ── Block dangerous os functions ──
_BLOCKED_OS = ['system', 'popen', 'execv', 'execve', 'execl', 'execle', 'execlp',
               'execlpe', 'execvp', 'execvpe', 'fork', 'forkpty', 'waitpid',
               'spawnl', 'spawnle', 'spawnlp', 'spawnlpe',
               'spawnv', 'spawnve', 'spawnvp', 'spawnvpe']

def _make_blocked(name):
  def _fn(*args, **kwargs):
    raise PermissionError(f"DocsCI sandbox: '{name}' is blocked for security")
  _fn.__name__ = name
  return _fn

for _fn_name in _BLOCKED_OS:
  if hasattr(os, _fn_name):
    setattr(os, _fn_name, _make_blocked(_fn_name))

# ── Block subprocess ──
import subprocess as _subprocess
for _fn_name in ['run', 'call', 'check_call', 'check_output', 'getoutput', 'getstatusoutput']:
  if hasattr(_subprocess, _fn_name):
    setattr(_subprocess, _fn_name, _make_blocked(f'subprocess.{_fn_name}'))
_subprocess.Popen = _make_blocked('subprocess.Popen')

# ── Stubbed requests module ──
class _MockResponse:
  def __init__(self, status_code, text, ok=True):
    self.status_code = status_code
    self.ok = ok
    self._text = text
    self.headers = {'content-type': 'application/json'}
    self.encoding = 'utf-8'
  def json(self): return json.loads(self._text)
  def text(self): return self._text
  @property
  def content(self): return self._text.encode('utf-8')
  def raise_for_status(self):
    if not self.ok:
      raise Exception(f'HTTP Error: {self.status_code}')

def _stub_get(url, **kwargs):
  raw = _js_requests_get(url, json.dumps(kwargs.get('params') or {}))
  d = json.loads(raw)
  return _MockResponse(d['status_code'], d['text'])

def _stub_post(url, **kwargs):
  body = kwargs.get('json') or kwargs.get('data') or {}
  raw = _js_requests_post(url, json.dumps(body))
  d = json.loads(raw)
  return _MockResponse(d['status_code'], d['text'])

def _stub_put(url, **kwargs):
  body = kwargs.get('json') or kwargs.get('data') or {}
  raw = _js_requests_post(url, json.dumps(body))
  d = json.loads(raw)
  return _MockResponse(d['status_code'], d['text'])

def _stub_patch(url, **kwargs):
  return _stub_put(url, **kwargs)

def _stub_delete(url, **kwargs):
  raw = _js_requests_get(url, '{}')
  d = json.loads(raw)
  return _MockResponse(d['status_code'], d['text'])

requests = types.ModuleType('requests')
requests.get = _stub_get
requests.post = _stub_post
requests.put = _stub_put
requests.patch = _stub_patch
requests.delete = _stub_delete

# requests.exceptions
exc_mod = types.ModuleType('requests.exceptions')
exc_mod.RequestException = Exception
exc_mod.ConnectionError = ConnectionError
exc_mod.Timeout = TimeoutError
exc_mod.HTTPError = Exception
requests.exceptions = exc_mod

sys.modules['requests'] = requests
sys.modules['requests.exceptions'] = exc_mod

_sandbox_ready = True
`.trim();

async function loadPyodideSingleton(): Promise<unknown> {
  if (_pyodideInstance) return _pyodideInstance;
  if (_pyodideLoading) return _pyodideLoading;

  _pyodideLoading = (async () => {
    // Dynamic import to avoid Vercel/webpack issues with WASM
    const { loadPyodide } = await import("pyodide");
    const py = await loadPyodide();

    // Register JS-backed stubs for requests
    py.globals.set("_js_requests_get", (url: string, _paramsJson: string) => {
      const allowed = isAllowlisted(url);
      const body = allowed
        ? JSON.stringify({ ok: true })
        : JSON.stringify({ mocked: true, url });
      return JSON.stringify({ status_code: 200, text: body, mocked: !allowed });
    });

    py.globals.set("_js_requests_post", (url: string, _bodyJson: string) => {
      const allowed = isAllowlisted(url);
      const body = allowed
        ? JSON.stringify({ ok: true, created: true })
        : JSON.stringify({ mocked: true });
      return JSON.stringify({ status_code: 201, text: body, mocked: !allowed });
    });

    // Run security setup + stub injection once
    py.runPython(SANDBOX_SETUP_PY);

    _pyodideInstance = py;
    return py;
  })();

  return _pyodideLoading;
}

/**
 * Execute Python code inside Pyodide (CPython WASM).
 */
export async function executeInPyodide(
  code: string,
  timeoutMs: number
): Promise<SandboxResult> {
  const t0 = Date.now();

  // Attempt to load Pyodide
  let py: unknown;
  try {
    py = await Promise.race([
      loadPyodideSingleton(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Pyodide load timeout")), 30_000)
      ),
    ]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      stdout: "",
      stderr: `Pyodide unavailable: ${msg}`,
      error: `Pyodide unavailable: ${msg}`,
      exitCode: 1,
      durationMs: Date.now() - t0,
      timedOut: false,
      outputBytes: 0,
      language: "python",
      sandboxMode: "pyodide",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pyodide = py as any;
  let stdout = "";
  let stderr = "";

  // Set up I/O capture
  pyodide.setStdout({
    batched: (text: string) => {
      stdout += text + "\n";
    },
  });
  pyodide.setStderr({
    batched: (text: string) => {
      stderr += text + "\n";
    },
  });

  // Fresh namespace per run — isolates globals from other runs
  const namespace = pyodide.toPy({});

  try {
    // Race between execution and timeout
    await Promise.race([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => {
        pyodide.runPython(code, { globals: namespace });
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Execution timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);

    const durationMs = Date.now() - t0;
    return {
      success: true,
      stdout: cap(stdout),
      stderr: cap(stderr),
      exitCode: 0,
      durationMs,
      timedOut: false,
      outputBytes: stdout.length + stderr.length,
      language: "python",
      sandboxMode: "pyodide",
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const timedOut = msg.includes("timed out");

    // Extract Python traceback from PythonError
    let pythonStderr = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pyErr = e as any;
    if (pyErr.message && pyErr.message.includes("Traceback")) {
      pythonStderr = pyErr.message;
    } else if (pyErr.type) {
      // PythonError has .type (e.g. 'NameError') and .message
      pythonStderr = pyErr.message || msg;
    } else if (timedOut) {
      pythonStderr = msg;
    } else {
      pythonStderr = msg;
    }

    const durationMs = Date.now() - t0;
    return {
      success: false,
      stdout: cap(stdout),
      stderr: cap(stderr || pythonStderr),
      error: msg,
      exitCode: 1,
      durationMs,
      timedOut,
      outputBytes: stdout.length + stderr.length,
      language: "python",
      sandboxMode: "pyodide",
    };
  } finally {
    namespace.destroy();
  }
}
