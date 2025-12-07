const CACHE_NAME = "carteirinha-pwa-v4";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/favicon-16x16.png",
  "./icons/favicon-32x32.png",
  "./icons/android-chrome-192x192.png",
  "./icons/android-chrome-512x512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("[SW] Falha ao fazer cache inicial:", err);
      })
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch((err) => {
        console.warn("[SW] Erro no fetch:", err);
        // se quiser, aqui dá pra retornar algo alternativo
        return cached;
      });
    })
  );
});
