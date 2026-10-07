/* HunterArsenal service worker.
 *
 * HOW UPDATES WORK
 *  1. Edit your files, bump APP_VERSION (and add a CHANGELOG entry) in js/version.js, push to GitHub.
 *  2. Users open or refresh the app. The browser sees a changed sw.js/version.js and installs the new worker.
 *  3. It pre-caches every file, takes over immediately (skipWaiting + clients.claim), and app.js
 *     reloads the page once so the new version is on screen.
 * Even if you forget to bump the version, files are revalidated in the background
 * (stale-while-revalidate), so changes still arrive on the following launch.
 *
 * Everything not in CORE (artwork, icons, fonts, manifest) is cached the first time it is used,
 * so the app keeps working offline without this file needing to know your asset names.
 * All paths are relative, so this works from https://<user>.github.io/hunters-arsenal/.
 */
importScripts('./js/version.js');
const CACHE = 'hunter-arsenal-' + self.APP_VERSION;
const CORE = [
  './', './index.html', './css/styles.css',
  './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  './js/version.js', './js/gamification.js', './js/storage.js', './js/security.js', './js/systemwindow.js', './js/hunter-card.js', './js/app.js',
  './assets/fallback/logo-mark.svg', './assets/fallback/logo-emblem.svg', './assets/fallback/city-banner.svg', './assets/fallback/hero-scene.svg', './assets/fallback/life-scene.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hunter-arsenal-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // same-origin only (the app makes no cross-site requests)
  event.respondWith(staleWhileRevalidate(req));
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const isNav = req.mode === 'navigate';
  const cached = (await cache.match(req, { ignoreSearch: true })) || (isNav ? await cache.match('./index.html') : undefined);
  const network = fetch(req, { cache: 'no-cache' })
    .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => undefined);
  if (cached) { network.catch(() => {}); return cached; }
  const res = await network;
  return res || (isNav ? cache.match('./index.html') : Response.error());
}
