/* Hello Majesty PWA service worker: push and notification clicks only. No app/API caching. */
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Hello Majesty';
  const options = {
    body: data.body || 'Ada pemberitahuan baru.',
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
    tag: data.tag || data.notification_type || 'hello-majesty',
    data: { url: data.url || data.payload?.url || '/' },
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
