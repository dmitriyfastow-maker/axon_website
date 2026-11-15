// Vaxo service worker: makes the site installable and keeps a tiny offline page. It never caches the API or personal pages.
const V = 'vaxo-v3';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(['/offline', '/icon-192.png', '/mascot/vax-avatar.webp'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (r.mode === 'navigate') e.respondWith(fetch(r).catch(() => caches.match('/offline')));
  // The offline page's own picture comes from the cache when there is no network.
  else if (u.pathname === '/mascot/vax-avatar.webp') e.respondWith(fetch(r).catch(() => caches.match(u.pathname)));
});
