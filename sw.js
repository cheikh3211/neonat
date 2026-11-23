// Néonat – service worker (fonctionnement hors ligne)
// Changer le numéro de version à chaque ajout de fichier.
const CACHE = 'neonat-v3';
const FILES = [
  './', './index.html',
  './percentiles.html', './perfusion.html', './enfant.html', './bili.html',
  './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'
];

// Installation : tout mettre en cache (version fraîche du serveur)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f =>
        fetch(f, { cache: 'reload' }).then(r => { if (r.ok) return c.put(f, r); }).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Requêtes : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne
// ou si le réseau ne répond pas en 4 secondes.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(cache => {
      const fromCache = () => cache.match(e.request, { ignoreSearch: true })
        .then(r => r || (e.request.mode === 'navigate' ? cache.match('./index.html') : undefined))
        .then(r => r || Response.error());
      const net = fetch(e.request).then(r => {
        if (r && r.ok && new URL(e.request.url).origin === location.origin) cache.put(e.request, r.clone());
        return r;
      });
      const timeout = new Promise(res => setTimeout(res, 4000)).then(() => cache.match(e.request, { ignoreSearch: true }));
      return Promise.race([net.catch(() => null), timeout])
        .then(r => r || net.catch(() => null))
        .then(r => r || fromCache())
        .catch(fromCache);
    })
  );
});
