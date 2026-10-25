/* eslint-disable no-restricted-globals */
const CACHE = "deepy-v4";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/Hoja_de_Inmersion_.html",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-16.png",
  "/favicon-32.png",
];

// Escuchar mensajes para forzar activación
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  console.log('Service Worker instalando versión:', CACHE);
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log('Service Worker activando versión:', CACHE);
  event.waitUntil(
    caches.keys().then((keys) => {
      // Eliminar TODOS los cachés antiguos
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE) {
            console.log('Eliminando caché antiguo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia:
// - Navegaciones (mode === "navigate"): si falla red => devolver index.html (SPA fallback)
// - Otros recursos: cache-first con actualización en background
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Actualización en background
        fetch(req).then((res) => {
          caches.open(CACHE).then((cache) => cache.put(req, res.clone()));
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => cached);
    })
  );
});
