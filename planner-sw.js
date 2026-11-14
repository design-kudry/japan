// Retire the previous planner's offline cache when existing browsers update.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.delete('japan-planner-shell-v1'),
    self.registration.unregister(),
  ]));
});
