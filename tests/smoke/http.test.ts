/**
 * HTTP Smoke Tests — runs against the deployed URL (no browser required).
 * Validates: HTTP status, headers, HTML content, PWA assets.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://focusdo-mvp.vercel.app npm run test:smoke
 *   SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke
 */

import { describe, it, expect, beforeAll } from "vitest";
import { fetch as undiciFetch } from "undici";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "https://focusdo-mvp.vercel.app";
const TIMEOUT_MS = 15_000;

// Use undici for reliable HTTP fetching in Node.js
const get = async (path: string) => {
  const res = await undiciFetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    text: await res.text(),
  };
};

describe(`Smoke tests → ${BASE_URL}`, () => {
  // ── Core page ─────────────────────────────────────────────────────────────

  describe("GET /", () => {
    let res: Awaited<ReturnType<typeof get>>;

    beforeAll(async () => {
      res = await get("/");
    });

    it("returns HTTP 200", () => {
      expect(res.status).toBe(200);
    });

    it("returns HTML content-type", () => {
      expect(res.headers["content-type"]).toMatch(/text\/html/);
    });

    it("contains app title", () => {
      expect(res.text).toContain("FocusDo");
    });

    it("links to manifest.json", () => {
      expect(res.text).toContain("manifest.json");
    });

    it("registers service worker in page script", () => {
      expect(res.text).toContain("serviceWorker");
    });

    it("has security headers: X-Frame-Options", () => {
      const header =
        res.headers["x-frame-options"] ??
        res.headers["X-Frame-Options"];
      expect(header).toBeDefined();
    });

    it("has security headers: X-Content-Type-Options", () => {
      const header =
        res.headers["x-content-type-options"] ??
        res.headers["X-Content-Type-Options"];
      expect(header).toBe("nosniff");
    });

    it("has Content-Security-Policy header", () => {
      const header =
        res.headers["content-security-policy"] ??
        res.headers["Content-Security-Policy"];
      expect(header).toBeDefined();
    });
  });

  // ── PWA assets ────────────────────────────────────────────────────────────

  describe("GET /manifest.json", () => {
    let res: Awaited<ReturnType<typeof get>>;
    beforeAll(async () => { res = await get("/manifest.json"); });

    it("returns HTTP 200", () => expect(res.status).toBe(200));

    it("returns JSON content-type", () => {
      expect(res.headers["content-type"]).toMatch(/json/);
    });

    it("contains app name", () => {
      const manifest = JSON.parse(res.text);
      expect(manifest.name).toContain("FocusDo");
    });

    it("has start_url defined", () => {
      const manifest = JSON.parse(res.text);
      expect(manifest.start_url).toBe("/");
    });

    it("has theme_color defined", () => {
      const manifest = JSON.parse(res.text);
      expect(manifest.theme_color).toBeDefined();
    });
  });

  describe("GET /sw.js", () => {
    let res: Awaited<ReturnType<typeof get>>;
    beforeAll(async () => { res = await get("/sw.js"); });

    it("returns HTTP 200", () => expect(res.status).toBe(200));

    it("is JavaScript", () => {
      expect(res.headers["content-type"]).toMatch(/javascript/);
    });

    it("has no-cache headers (SW must always be fresh)", () => {
      const cc = res.headers["cache-control"] ?? "";
      expect(cc).toMatch(/no-cache|no-store/);
    });
  });

  // ── 404 handling ──────────────────────────────────────────────────────────

  describe("GET /nonexistent-route-xyz", () => {
    it("returns HTTP 404 (not 500)", async () => {
      const res = await get("/nonexistent-route-xyz");
      expect(res.status).toBe(404);
    });
  });

  // ── Performance budget sanity ─────────────────────────────────────────────

  describe("Response time budget", () => {
    it("GET / responds in < 3 000 ms (P90 proxy)", async () => {
      const times: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await get("/");
        times.push(Date.now() - start);
      }
      const p90 = times.sort((a, b) => a - b)[Math.ceil(times.length * 0.9) - 1];
      console.log(`Response times: ${times.join("ms, ")}ms — P90: ${p90}ms`);
      expect(p90).toBeLessThan(3_000);
    });
  });

  // ── Health API ────────────────────────────────────────────────────────────────

  describe("GET /api/health", () => {
    let healthRes: Awaited<ReturnType<typeof get>>;
    beforeAll(async () => { healthRes = await get("/api/health"); });

    it("returns HTTP 200", () => { expect(healthRes.status).toBe(200); });

    it("returns JSON content-type", () => {
      expect(healthRes.headers["content-type"]).toMatch(/json/);
    });

    it('has status: "ok"', () => {
      const body = JSON.parse(healthRes.text);
      expect(body.status).toBe("ok");
    });

    it("has version field", () => {
      const body = JSON.parse(healthRes.text);
      expect(typeof body.version).toBe("string");
      expect(body.version.length).toBeGreaterThan(0);
    });

    it("has ts (ISO timestamp)", () => {
      const body = JSON.parse(healthRes.text);
      expect(body.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("has integrations object", () => {
      const body = JSON.parse(healthRes.text);
      expect(typeof body.integrations).toBe("object");
      expect(typeof body.integrations.supabase).toBe("boolean");
    });

    it("has flags object", () => {
      const body = JSON.parse(healthRes.text);
      expect(typeof body.flags).toBe("object");
      expect(body.flags).toHaveProperty("focusModeDefault");
      expect(body.flags).toHaveProperty("todayCap");
    });

    it("is not cached", () => {
      const cc = healthRes.headers["cache-control"] ?? "";
      expect(cc).toMatch(/no-store|no-cache/);
    });

    it("responds in < 500ms", async () => {
      const start = Date.now();
      await get("/api/health");
      expect(Date.now() - start).toBeLessThan(500);
    });
  });

  // ── Offline fallback ─────────────────────────────────────────────────────────

  describe("GET /offline.html", () => {
    it("returns a response (200 or 308)", async () => {
      const res = await get("/offline.html");
      expect([200, 301, 308]).toContain(res.status);
    });
  });

  // ── Legal pages ──────────────────────────────────────────────────────────────

  describe("GET /privacy", () => {
    it("returns HTTP 200", async () => {
      const res = await get("/privacy");
      expect([200, 301, 308]).toContain(res.status);
    });

    it("contains privacy policy content", async () => {
      const res = await get("/privacy");
      expect(res.text).toContain("Privacy");
    });
  });

  describe("GET /terms", () => {
    it("returns HTTP 200", async () => {
      const res = await get("/terms");
      expect([200, 301, 308]).toContain(res.status);
    });

    it("contains terms content", async () => {
      const res = await get("/terms");
      expect(res.text).toContain("Terms");
    });
  });
});
