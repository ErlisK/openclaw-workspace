/**
 * sandbox-pyodide.spec.ts — Pyodide WASM Python execution E2E tests
 *
 * Tests the /api/execute endpoint using the pyodide backend:
 * - Security isolation: no os.system, subprocess; no access to host fs
 * - Stubbed requests with allowlist enforcement
 * - Fresh namespace per run (state isolation)
 * - Correct sandboxMode = "pyodide" reported
 * - Error propagation: NameError, SyntaxError, ImportError
 * - requests.get / requests.post with allowlist
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// Skip all pyodide tests when running against Vercel (simulated mode there)
const isLocal = !BASE.includes("vercel.app") && !BASE.includes("snippetci.com");

test.describe("Pyodide Sandbox — security isolation", () => {
  test.skip(!isLocal, "Pyodide tests only run against local server");

  test("Python: sandboxMode is pyodide", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "print('ok')", language: "python", timeout_ms: 30000 },
      headers: { "Content-Type": "application/json" },
      timeout: 35000,
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sandboxMode).toBe("pyodide");
  });

  test("Python: os.system is blocked (PermissionError)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "import os\nos.system('ls')",
        language: "python",
        timeout_ms: 10000,
      },
      headers: { "Content-Type": "application/json" },
    });
    // Pre-execution filter returns 400, or sandbox returns 422 with PermissionError
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.error).toMatch(/blocked|security/i);
    } else {
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body.success).toBe(false);
      const combined = (body.error || "") + (body.stderr || "");
      expect(combined).toMatch(/blocked|PermissionError|security/i);
    }
  });

  test("Python: subprocess.run is pre-filtered (400)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "import subprocess\nsubprocess.run(['ls'])",
        language: "python",
        timeout_ms: 10000,
      },
      headers: { "Content-Type": "application/json" },
    });
    // Pre-execution pattern block returns 400
    expect(res.status()).toBe(400);
  });

  test("Python: eval is pre-filtered (400)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "result = eval('print(1)')",
        language: "python",
        timeout_ms: 10000,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("Python: no access to real filesystem (no open to /etc)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "try:\n  f = open('/etc/passwd')\n  print('got file')\nexcept Exception as e:\n  print('blocked:', type(e).__name__)",
        language: "python",
        timeout_ms: 10000,
      },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    // Should either fail or print 'blocked'
    const out = body.stdout + body.stderr;
    expect(out).not.toContain("got file");
  });
});

test.describe("Pyodide Sandbox — Python execution", () => {
  test.skip(!isLocal, "Pyodide tests only run against local server");

  test("Python: simple JSON output", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "import json\nprint(json.dumps({'ok': True, 'value': 42}))",
        language: "python",
        timeout_ms: 30000,
      },
      headers: { "Content-Type": "application/json" },
      timeout: 35000,
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout).toContain('"ok"');
    expect(body.durationMs).toBeGreaterThan(0);
  });

  test("Python: second run is fast (cached Pyodide)", async ({ request }) => {
    // Ensure Pyodide is warmed up
    await request.post(`${BASE}/api/execute`, {
      data: { code: "print(1)", language: "python", timeout_ms: 30000 },
      headers: { "Content-Type": "application/json" },
    });

    const t0 = Date.now();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "print(2+2)", language: "python", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    const elapsed = Date.now() - t0;
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toBe("4");
    // Second run should complete in <1000ms (no re-load of WASM)
    expect(elapsed).toBeLessThan(1000);
  });

  test("Python: list comprehension and stdlib", async ({ request }) => {
    const code = `
def paginate(items, page_size=10):
    return [items[i:i + page_size] for i in range(0, len(items), page_size)]

import json
pages = paginate(list(range(25)))
print(json.dumps({'pages': len(pages), 'first_page': pages[0]}))
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    expect(result.pages).toBe(3);
    expect(result.first_page).toHaveLength(10);
  });

  test("Python: NameError fails correctly", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "result = AcmeClient(api_key='sk_test')",
        language: "python",
        timeout_ms: 10000,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.stderr || body.error).toMatch(/NameError/i);
  });

  test("Python: SyntaxError fails correctly", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "def broken(\n    print('oops')\n",
        language: "python",
        timeout_ms: 10000,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.stderr || body.error).toMatch(/SyntaxError/i);
  });

  test("Python: missing import fails (ImportError/ModuleNotFound)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "from acme_sdk import AcmeClient\nclient = AcmeClient()",
        language: "python",
        timeout_ms: 10000,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.stderr || body.error).toMatch(/ImportError|ModuleNotFound/i);
  });

  test("Python: consecutive runs are isolated (no shared state)", async ({ request }) => {
    // Run 1: set a variable in global scope
    await request.post(`${BASE}/api/execute`, {
      data: { code: "SECRET_GLOBAL = 'leaked'", language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });

    // Run 2: try to read it — should not exist
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "print('not_found' if 'SECRET_GLOBAL' not in dir() else 'leaked')",
        language: "python",
        timeout_ms: 10000,
      },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toBe("not_found");
  });
});

test.describe("Pyodide Sandbox — stubbed requests", () => {
  test.skip(!isLocal, "Pyodide tests only run against local server");

  test("Python: requests.get allowlisted host (github.com)", async ({ request }) => {
    const code = `
import requests, json
r = requests.get('https://api.github.com/repos/nodejs/node')
print(json.dumps({'ok': r.ok, 'status': r.status_code, 'has_data': bool(r.json())}))
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.has_data).toBe(true);
  });

  test("Python: requests.get blocked host returns mocked", async ({ request }) => {
    const code = `
import requests, json
r = requests.get('https://evil.com/steal')
d = r.json()
print(json.dumps({'ok': r.ok, 'mocked': d.get('mocked', False)}))
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    expect(result.ok).toBe(true);
    expect(result.mocked).toBe(true);
  });

  test("Python: requests.post allowlisted host (stripe.com)", async ({ request }) => {
    const code = `
import requests, json
r = requests.post('https://api.stripe.com/v1/charges', json={'amount': 100})
print(json.dumps({'ok': r.ok, 'status': r.status_code}))
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
  });

  test("Python: requests.text() and .json() both work", async ({ request }) => {
    const code = `
import requests, json
r = requests.get('https://api.github.com/users/octocat')
text_val = r.text()
json_val = r.json()
print(json.dumps({'text_type': type(text_val).__name__, 'json_type': type(json_val).__name__}))
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    expect(result.text_type).toBe("str");
    expect(result.json_type).toBe("dict");
  });

  test("Python: raise_for_status() on 200 does not raise", async ({ request }) => {
    const code = `
import requests, json
r = requests.get('https://api.github.com/repos/nodejs/node')
r.raise_for_status()  # should not raise
print(json.dumps({'ok': True}))
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toContain('"ok": true');
  });
});

test.describe("Pyodide Sandbox — execution metadata", () => {
  test.skip(!isLocal, "Pyodide tests only run against local server");

  test("Python: result includes all metadata fields", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "print('hello')", language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(typeof body.success).toBe("boolean");
    expect(typeof body.stdout).toBe("string");
    expect(typeof body.stderr).toBe("string");
    expect(typeof body.durationMs).toBe("number");
    expect(typeof body.timedOut).toBe("boolean");
    expect(typeof body.outputBytes).toBe("number");
    expect(body.sandboxMode).toBe("pyodide");
    expect(body.language).toBe("python");
  });
});
