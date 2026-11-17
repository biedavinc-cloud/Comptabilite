/*
 * LiBooks service worker — v3
 *
 * Règles (corrige les écrans « Une erreur inattendue est survenue » après
 * un déploiement) :
 *  - Les pages (navigation) passent TOUJOURS par le réseau ; le cache ne sert
 *    qu'en secours hors ligne.
 *  - Seuls les fichiers versionnés de /assets/ (nom avec empreinte) sont mis
 *    en cache, et uniquement si le type de contenu correspond (jamais une page
 *    HTML renvoyée à la place d'un .js manquant).
 *  - Les anciens caches (v1, v2) sont supprimés à l'activation.
 */
const CACHE_NAME = 'libooks-v3';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isValidAsset(url, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return false;
  const type = response.headers.get('content-type') || '';
  if (type.includes('text/html')) return false;
  if (/\.(m?js)$/.test(url.pathname)) return type.includes('javascript');
  if (/\.css$/.test(url.pathname)) return type.includes('css');
  return true;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, PSP… : jamais interceptés

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok && url.pathname === '/') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(OFFLINE_URL, copy));
          }
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    );
    return;
  }

  // Fichiers versionnés : immuables → cache d'abord, validé par le type.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (isValidAsset(url, res)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        });
      })
    );
  }
  // Tout le reste (manifest, icônes, sitemap…) : réseau normal.
});
