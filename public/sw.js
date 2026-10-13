const CACHE = "houseprovider-shell-v2";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/favicon.svg", "/robots.txt"]))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin)
    return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      // Only app navigations should fall back to the cached shell; never return HTML for API,
      // image, script, or stylesheet requests.
      if (event.request.mode === "navigate") {
        const shell = await caches.match("/");
        if (shell) return shell;
      }
      return Response.error();
    }),
  );
});
