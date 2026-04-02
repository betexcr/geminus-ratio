/* Offline shell: caches core static assets only; game saves stay in the browser as before.
   Bump CACHE_NAME on each static deploy so clients drop stale precaches. */
var CACHE_NAME = "geminus-static-v3";
var PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/main.css",
  "./js/rng.js",
  "./js/sfx.js",
  "./js/renderer.js",
  "./js/sprites.js",
  "./js/i18n.js",
  "./js/abilities-i18n-es.js",
  "./js/campaign.js",
  "./js/game.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./sw.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function () {
        return null;
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE_NAME;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  try {
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
  } catch (err) {
    return;
  }
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req);
    })
  );
});
