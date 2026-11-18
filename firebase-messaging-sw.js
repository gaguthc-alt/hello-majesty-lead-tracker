/* Hello Majesty FCM service worker.
 * Custom click handler is registered before Firebase SDK so the exact in-app
 * destination wins over generic notification-click behavior.
 */
self.addEventListener('notificationclick',(event)=>{
  event.notification.close();
  const ndata=event.notification.data||{};
  const fcm=ndata.FCM_MSG||ndata.fcmMessage||{};
  const data={...(fcm.data||{}),...(ndata.data||{}),...ndata};
  const type=String(data.type||data.notification_type||'').toUpperCase();
  let raw=String(data.url||data.link||'');
  if(!raw&&type==='NEW_INBOUND_MESSAGE'&&data.conversation_id){
    raw='/whatsapp-inbox.html?conversation='+encodeURIComponent(data.conversation_id);
  }else if(!raw&&type==='SALES_HANDOVER'&&data.lead_id){
    raw='/?claim='+encodeURIComponent(data.lead_id);
  }else if(!raw&&data.route){
    raw=data.route;
  }
  const targetUrl=new URL(raw||'/', 'https://app.hello-majesty.com/');
  if(targetUrl.hostname==='hello-majesty-lead-tracker.pages.dev'||targetUrl.hostname==='app.hello-majesty.com'){
    targetUrl.protocol='https:';targetUrl.host='app.hello-majesty.com';
  }
  const target=targetUrl.toString();
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    const appWindow=windows.find(c=>{
      try{return new URL(c.url).origin==='https://app.hello-majesty.com';}catch{return false;}
    });
    if(appWindow&&'navigate' in appWindow){
      try{await appWindow.navigate(target);await appWindow.focus();return;}catch(e){console.warn('[HM Push] navigate existing app failed',e);}
    }
    if(clients.openWindow)await clients.openWindow(target);
  })());
});

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
  // FCM handles notification-payload display; custom click handler above
  // routes it using fcm_options.link or the structured data fallback.
  if(payload.notification) return;
  const data=payload.data||{};
  let url=data.url||'';
  if(!url&&String(data.type||'').toUpperCase()==='NEW_INBOUND_MESSAGE'&&data.conversation_id)
    url='/whatsapp-inbox.html?conversation='+encodeURIComponent(data.conversation_id);
  else if(!url&&String(data.type||'').toUpperCase()==='SALES_HANDOVER'&&data.lead_id)
    url='/?claim='+encodeURIComponent(data.lead_id);
  else if(!url)url=data.route||'/';
  self.registration.showNotification(data.title||'Hello Majesty',{
    body:data.body||'Ada aktivitas baru.',
    icon:'/favicon.ico',
    badge:'/favicon.ico',
    tag:data.tag||data.message_id||data.conversation_id||data.lead_uuid||'hello-majesty-alert',
    renotify:true,
    data:{...data,url}
  });
});
