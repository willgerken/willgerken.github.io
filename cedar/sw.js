// Cedar: offline cache. Pages are network-first with the cache as fallback, so edits show
// up on the next load with signal and the last copy opens with none. Weather calls are
// left alone; the page keeps its own last forecast in localStorage.
const CACHE = 'cedar-v1';
const SHELL = ['./', './fun/', './manifest.json', './icon-180.png', './icon-512.png', './cedar_pond_map.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./')))
  );
});
