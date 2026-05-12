// Service Worker — Ronda Mensal Genial Care
const CACHE = "ronda-genial-v1";

// Arquivos para cache offline
const ASSETS = [
  "/",
  "/index.html",
  "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&display=swap",
  "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js"
];

// Instalar — cachear assets principais
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})));
    })
  );
  self.skipWaiting();
});

// Ativar — limpar caches antigos
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first para assets, network first para API
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // API do Apps Script — sempre network, sem cache
  if (url.hostname.includes("script.google.com")) {
    return; // deixa passar normalmente
  }

  // Assets estáticos — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cachear respostas bem sucedidas de assets
        if (response && response.status === 200 && response.type !== "opaque") {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline — retornar index.html para navegação
        if (e.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});
