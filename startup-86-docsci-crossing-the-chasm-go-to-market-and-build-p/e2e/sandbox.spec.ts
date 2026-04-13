/**
 * sandbox.spec.ts — hermetic code execution E2E tests
 *
 * Tests the /api/execute endpoint:
 * - Python/JS/TS passing snippets
 * - Expected failures (NameError, SyntaxError, missing module)
 * - Security: blocked dangerous patterns
 * - Sandbox probe metadata
 * - Execution metadata: durationMs, sandboxMode, language
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("Sandbox — GET probe", () => {
  test("GET /api/execute returns sandbox capabilities", async ({ request }) => {
    const res = await request.get(`${BASE}/api/execute`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.endpoint).toBe("POST /api/execute");
    expect(body.sandbox.nodeVersion).toMatch(/^v\d+/);
    expect(body.supported_languages).toContain("python");
    expect(body.supported_languages).toContain("javascript");
    expect(body.supported_languages).toContain("typescript");
  });
});

test.describe("Sandbox — validation", () => {
  test("POST without body returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST missing language returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "print(1)" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST unsupported language returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "puts 'hello'", language: "ruby" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.supported).toBeTruthy();
  });

  test("POST with dangerous pattern (os.system) returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "import os; os.system('ls')", language: "python" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("blocked");
  });

  test("POST with eval() returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "eval('print(1)')", language: "python" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Sandbox — Python execution", () => {
  test("Python: simple JSON output passes", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "import json\nprint(json.dumps({\"ok\": True, \"value\": 42}))", language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout).toContain('"ok"');
    expect(body.durationMs).toBeGreaterThan(0);
    expect(body.durationMs).toBeLessThan(10000);
    expect(body.language).toBe("python");
  });

  test("Python: pagination function passes", async ({ request }) => {
    const code = `
def paginate(items, page_size=10):
    for i in range(0, len(items), page_size):
        yield items[i:i + page_size]

results = list(paginate(list(range(25)), 10))
print(f"Pages: {len(results)}")
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout).toContain("Pages: 3");
  });

  test("Python: NameError fails with stderr", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "result = AcmeClient(api_key='sk_test')", language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.stderr).toMatch(/NameError/i);
    expect(body.exitCode).not.toBe(0);
  });

  test("Python: syntax error fails", async ({ request }) => {
    const code = "try:\n    result = client.get(\"/users\"\nexcept Exception as e:\n    print(e)";
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.stderr).toMatch(/SyntaxError/i);
  });

  test("Python: missing import fails with ImportError or NameError", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "from acme_sdk import AcmeClient\nclient = AcmeClient()", language: "python", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.stderr).toMatch(/ImportError|ModuleNotFound|NameError/i);
  });
});

test.describe("Sandbox — JavaScript execution", () => {
  test("JS: simple JSON output passes", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log(JSON.stringify({ok:true, v:'1.0.0'}))", language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout).toContain('"ok":true');
    expect(body.durationMs).toBeLessThan(10000);
    expect(body.language).toBe("javascript");
  });

  test("JS: error formatting function passes", async ({ request }) => {
    const code = `
function formatError(code, message) {
  return JSON.stringify({ error: { code, message } }, null, 2);
}
console.log(formatError(404, 'Not found'));
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout).toContain("404");
  });

  test("JS: missing require module fails", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "const {AcmeClient} = require('acme-sdk'); console.log(new AcmeClient())", language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.stderr).toMatch(/Cannot find module|MODULE_NOT_FOUND|require is not defined|ReferenceError|require is not a function/i);
  });
});

test.describe("Sandbox — TypeScript execution", () => {
  test("TS: typed object passes", async ({ request }) => {
    const code = "const r: { ok: boolean; message: string } = { ok: true, message: 'verified' };\nconsole.log(JSON.stringify(r));";
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "typescript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout).toContain('"ok":true');
    expect(body.language).toBe("typescript");
  });

  test("TS: interface declaration passes", async ({ request }) => {
    const code = `
interface WebhookPayload {
  id: string;
  event: string;
  createdAt: string;
}
const p: WebhookPayload = { id: "wh_01", event: "docs.verified", createdAt: new Date().toISOString() };
console.log(JSON.stringify(p));
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "typescript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout).toContain("docs.verified");
  });

  test("TS: return type annotation passes", async ({ request }) => {
    const code = `
function parseWebhook(raw: string): {id: string; event: string} {
  return JSON.parse(raw);
}
const result = parseWebhook(JSON.stringify({id:'wh_01', event:'test'}));
console.log(result.id, result.event);
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "typescript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout).toContain("wh_01");
  });
});

test.describe("Sandbox — execution metadata", () => {
  test("Result includes all metadata fields", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "print('hello')", language: "python", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(typeof body.success).toBe("boolean");
    expect(typeof body.stdout).toBe("string");
    expect(typeof body.stderr).toBe("string");
    expect(typeof body.durationMs).toBe("number");
    expect(typeof body.timedOut).toBe("boolean");
    expect(typeof body.outputBytes).toBe("number");
    expect(typeof body.sandboxMode).toBe("string");
    expect(body.sandboxMode).toMatch(/subprocess|simulated|ivm|pyodide/);
  });

  test("Failed execution returns 422", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "raise ValueError('test error')", language: "python", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
