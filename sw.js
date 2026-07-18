const RELEASE = "20260718.6";
const CACHE_NAME = `ascend-${RELEASE}`;
const VERSION = `?v=${RELEASE}`;
const APP_SHELL = [
  `./index.html${VERSION}`,
  `./styles/tokens.css${VERSION}`,
  `./styles/base.css${VERSION}`,
  `./styles/components.css${VERSION}`,
  `./styles/pages.css${VERSION}`,
  `./styles/workout.css${VERSION}`,
  `./src/utils/helpers.js${VERSION}`,
  `./src/data/jtm-constants.js${VERSION}`,
  `./src/data/warmup-data.js${VERSION}`,
  `./src/data/exercise-db.js${VERSION}`,
  `./src/data/exercise-metadata.js${VERSION}`,
  `./src/data/volume-landmarks.js${VERSION}`,
  `./src/utils/math.js${VERSION}`,
  `./src/workout/jtm.js${VERSION}`,
  `./src/workout/progression.js${VERSION}`,
  `./src/workout/set-classification.js${VERSION}`,
  `./src/workout/volume.js${VERSION}`,
  `./src/activity/running.js${VERSION}`,
  `./src/workout/readiness.js${VERSION}`,
  `./src/workout/targeted-warmup-engine.js${VERSION}`,
  `./src/nutrition/adaptive-calories.js${VERSION}`,
  `./src/storage/storage.js${VERSION}`,
  `./src/storage/migrations.js${VERSION}`,
  `./src/storage/exercise-memory.js${VERSION}`,
  `./src/storage/session-persistence.js${VERSION}`,
  `./src/ui/navigation.js${VERSION}`,
  `./src/ui/render-running.js${VERSION}`,
  `./src/ui/render-today.js${VERSION}`,
  `./src/ui/render-lift.js${VERSION}`,
  `./src/ui/render-weigh.js${VERSION}`,
  `./src/ui/render-stats.js${VERSION}`,
  `./src/ui/render-profile.js${VERSION}`,
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("ascend-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .catch(() => caches.match(`./index.html${VERSION}`))
    );
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
