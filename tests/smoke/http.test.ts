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
});
