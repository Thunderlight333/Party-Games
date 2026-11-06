/* Service Worker: يخزّن الموقع كاملاً للعمل بدون إنترنت.
   مع الإنترنت: يجيب أحدث نسخة ويحدّث المخزن. بدون إنترنت: يشغّل من المخزن.
   هذا الملف مولّد من tools/sw.template.js بالأمر: node tools/build-sw.js */
const VERSION = 'a71038c118';
const CACHE = 'majlis-' + VERSION;
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/app.js",
  "js/core/audio.js",
  "js/core/bank.js",
  "js/core/icons.js",
  "js/core/registry.js",
  "js/core/store.js",
  "js/core/teams.js",
  "js/core/timer.js",
  "js/core/ui.js",
  "js/core/utils.js",
  "js/data/bid.js",
  "js/data/codenames.js",
  "js/data/feud.js",
  "js/data/huroof-1.js",
  "js/data/huroof-2.js",
  "js/data/huroof-3.js",
  "js/data/huroof-4.js",
  "js/data/huroof-5.js",
  "js/data/huroof-6.js",
  "js/data/huroof.js",
  "js/data/outsider.js",
  "js/data/taboo.js",
  "js/games/bid.js",
  "js/games/catalog.js",
  "js/games/codenames.js",
  "js/games/counter.js",
  "js/games/emperor.js",
  "js/games/feud.js",
  "js/games/huroof.js",
  "js/games/outsider.js",
  "js/games/taboo.js",
  "js/games/wheel.js",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "icons/maskable-512.png"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('majlis-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(req, { signal: ctrl.signal, cache: 'no-cache' });
      clearTimeout(t);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await cache.match('./'));
      if (hit) return hit;
      throw err;
    }
  })());
});
