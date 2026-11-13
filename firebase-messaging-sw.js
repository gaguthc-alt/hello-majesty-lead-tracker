/* Hello Majesty FCM service worker */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'AIzaSyDaDCr1AvQCOSuwiTIV-bSp-4SU1RVtRP8',
  authDomain: 'hello-majesty-notification.firebaseapp.com',
  projectId: 'hello-majesty-notification',
  storageBucket: 'hello-majesty-notification.firebasestorage.app',
  messagingSenderId: '439732318734',
  appId: '1:439732318734:web:8be113b44cffd3be37425f'
});
const messaging=firebase.messaging();
messaging.onBackgroundMessage((payload)=>{
  // FCM notification payloads are displayed by the browser automatically.
  // Data-only payloads are surfaced here and displayed explicitly.
  if(payload.notification) return;
  const data=payload.data||{};
  self.registration.showNotification(data.title||'Hello Majesty', {
    body:data.body||'Ada aktivitas baru.',
    icon:'/favicon.ico',
    badge:'/favicon.ico',
    tag:data.tag||data.conversation_id||'hello-majesty-alert',
    renotify:true,
    data:{url:data.url||'/index.html'}
  });
});
self.addEventListener('notificationclick',(event)=>{
  event.notification.close();
  const target=event.notification.data?.url||'/index.html';
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){if('focus' in client){await client.focus();if('navigate' in client)await client.navigate(target);return;}}
    if(clients.openWindow)await clients.openWindow(target);
  })());
});
