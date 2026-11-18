/* Hello Majesty Web Push foreground handler.
 * Uses the same FCM project as the Android app. This script does not register,
 * disable, or mutate native Android subscriptions.
 */
(function(){
  'use strict';
  const firebaseConfig={
    apiKey:'AIzaSyDaDCr1AvQCOSuwiTIV-bSp-4SU1RVtRP8',
    authDomain:'hello-majesty-notification.firebaseapp.com',
    projectId:'hello-majesty-notification',
    storageBucket:'hello-majesty-notification.firebasestorage.app',
    messagingSenderId:'439732318734',
    appId:'1:439732318734:web:8be113b44cffd3be37425f'
  };
  try{
    if(!window.firebase || !firebase.messaging || !('Notification' in window))return;
    if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
    const messaging=firebase.messaging();
    messaging.onMessage(async payload=>{
      const title=payload?.notification?.title||payload?.data?.title||'Hello Majesty';
      const body=payload?.notification?.body||payload?.data?.body||'Ada aktivitas baru.';
      const data=payload?.data||{};
      let target=String(data.url||'https://app.hello-majesty.com/');
      try { const u=new URL(target,'https://app.hello-majesty.com/'); if(u.hostname==='hello-majesty-lead-tracker.pages.dev') { u.protocol='https:'; u.host='app.hello-majesty.com'; } target=u.toString(); } catch { target='https://app.hello-majesty.com/'; }
      if(Notification.permission!=='granted')return;
      const options={
        body,
        icon:'/favicon.ico',
        badge:'/favicon.ico',
        tag:String(data.message_id||data.lead_uuid||data.conversation_id||'hm-'+Date.now()),
        data:{url:target},
        requireInteraction:true
      };
      try{
        const registration=await navigator.serviceWorker?.getRegistration('/');
        if(registration)await registration.showNotification(title,options);
        else new Notification(title,options);
      }catch(error){
        console.warn('[HM Web Push] Foreground notification display failed',error);
      }
    });
  }catch(error){
    // Unsupported browser/WebView must not affect dashboard startup or Android native FCM.
    console.info('[HM Web Push] Foreground listener unavailable in this browser.',error);
  }
})();