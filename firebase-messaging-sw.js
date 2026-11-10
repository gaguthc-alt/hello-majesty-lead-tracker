/* Hello Majesty FCM service worker.
 * Firebase public web configuration only; no private service-account credentials here.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDaDCr1AvQCOSuwiTIV-bSp-4SU1RVtRP8',
  authDomain: 'hello-majesty-notification.firebaseapp.com',
  projectId: 'hello-majesty-notification',
  storageBucket: 'hello-majesty-notification.firebasestorage.app',
  messagingSenderId: '439732318734',
  appId: '1:439732318734:web:8be113b4cffd3be37425f'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = notification.title || data.title || 'Hello Majesty';
  const options = {
    body: notification.body || data.body || 'Ada aktivitas baru di Hello Majesty.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || data.conversation_id || data.lead_id || 'hello-majesty',
    data: { url: data.url || data.route || '/' },
    renotify: true
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const target = new URL(raw || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
