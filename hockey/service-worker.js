// Minimal offline cache. Bump CACHE version when you ship new content.
const CACHE = 'iceq-v0.46';
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'js/konva_compat.js',
  'js/vocab.js',
  'js/scenarios.js',
  'js/progress.js',
  'js/rink.js',
  'js/player.js',
  'js/path.js',
  'js/audio.js',
  'js/whys.js',
  'js/house.js',
  'js/defensive_side.js',
  'js/forecheck.js',
  'js/lane_coverage.js',
  'js/breakout.js',
  'js/cover_the_man.js',
  'js/net_front.js',
  'js/two_on_one.js',
  'js/offside.js',
  'js/dzone_coverage.js',
  'js/breakout_reads.js',
  'js/ozone_faceoff.js',
  'js/ozone_entry.js',
  'js/home.js',
  'js/main.js',
  'assets/icon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-192-maskable.png',
  'assets/icon-512-maskable.png',
  'assets/heatmap-house.png',
  'assets/house-stats.json',
  'assets/konva-9.3.16.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // allSettled — one missing/slow file should not break the entire install
      Promise.allSettled(CORE.map((u) =>
        c.add(new Request(u, { credentials: 'same-origin' }))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
