/**
 * FocusDo Service Worker v2 — offline-capable PWA
 *
 * Strategy:
 *  - App shell (HTML, JS, CSS): stale-while-revalidate
 *  - Static assets (/_next/static/**): cache-first, immutable
 *  - Icons + manifest: cache-first, 24h TTL
 *  - API / Supabase: network-only (no cached auth tokens)
 *  - Offline fallback: serve cached shell or /offline.html
 */

const SHELL_CACHE   = "focusdo-shell-v2";
const STATIC_CACHE  = "focusdo-static-v2";
const OFFLINE_URL   = "/offline.html";

const SHELL_ASSETS = ["/", "/offline.html", "/manifest.json"];
const SKIP_HOSTS   = ["supabase.co", "posthog.com", "sentry.io", "ingest.sentry.io"];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll fails if any resource is missing — use individual puts
      await Promise.allSettled(
        SHELL_ASSETS.map((url) =>
          fetch(url)
            .then((res) => res.ok && cache.put(url, res))
            .catch(() => {}) // offline install is OK
        )
      );
    })()
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== SHELL_CACHE && n !== STATIC_CACHE)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // Skip external API calls (auth, analytics, error tracking)
  if (SKIP_HOSTS.some((h) => url.hostname.includes(h))) return;

  // Skip chrome-extension and other non-http(s)
  if (!url.protocol.startsWith("http")) return;

  // Static immutable assets — cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Icons and manifest — cache-first
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json") {
    event.respondWith(cacheFirstStrategy(request, SHELL_CACHE));
    return;
  }

  // Navigation and app shell — stale-while-revalidate + offline fallback
  if (request.mode === "navigate" || url.origin === self.location.origin) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page for navigation requests
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}
