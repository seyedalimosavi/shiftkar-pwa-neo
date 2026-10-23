/* ShiftKar Neo — offline-first service worker.
 * Network-first for pages & bundles (stale-free in dev AND prod),
 * cache-first for immutable static assets. A fetch handler is REQUIRED
 * for Chrome/Edge installability (beforeinstallprompt).
 *
 * The base path is derived from the SW scope, so the SAME file works on
 * the root domain (""), GitHub Pages user sites ("") and project sites
 * ("/<repo>") without any rebuild-time rewriting. */
const CACHE = "shiftkar-neo-v8";
const BASE = new URL(self.registration.scope).pathname.replace(/\/+$/, "");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([`${BASE}/`, `${BASE}/manifest.webmanifest`]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  const url = new URL(req.url);
  const p = url.pathname;
  const immutable =
    p.startsWith(`${BASE}/fonts/`) ||
    p.startsWith(`${BASE}/assets/`) ||
    p === `${BASE}/manifest.webmanifest`;

  /* Immutable static assets: cache-first */
  if (immutable) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  /* Pages, bundles & API: network-first with offline cache fallback */
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.destination !== "") {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match(`${BASE}/`))),
  );
});
