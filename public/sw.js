/*
 * NetTrust service worker.
 *
 * Goal: make the app installable and instant-loading offline WITHOUT ever
 * caching the live security probes. Those probes hit cross-origin endpoints
 * (dns.google, cloudflare-dns.com, ipapi.co, howsmyssl.com, …) and their
 * whole point is to reflect the *current* network — a cached answer would be
 * a correctness bug. So we only ever touch same-origin GETs here; every
 * cross-origin request falls straight through to the network untouched.
 */
const CACHE = "nettrust-v5";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never intercept the live security probes — let them reach the network as-is.
  if (url.origin !== self.location.origin) return;

  // App-shell navigations: network-first so deploys are picked up, with an
  // offline fallback to the cached shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // Hashed static assets are immutable: cache-first, then fill the cache.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});
