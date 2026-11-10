/* Hello Majesty: opt-in FCM device registration. */
(function () {
  'use strict';
  if (window.__hmFcmRegistrationLoaded) return;
  window.__hmFcmRegistrationLoaded = true;

  const SUPABASE_URL = 'https://ksowzhhmzrumyciehuyv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW';
  const VAPID_PUBLIC_KEY = 'BD_8aEumdug4XayvBGQMkEH74wKzm70XbgaOJfseNazaB3jdxnZvP64Sz8J1j1bIGtPtBB1PrjlRB9yXw-rbIc4';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDaDCr1AvQCOSuwiTIV-bSpH3-4SU1RVtRP8',
    authDomain: 'hello-majesty-notification.firebaseapp.com',
    projectId: 'hello-majesty-notification',
    storageBucket: 'hello-majesty-notification.firebasestorage.app',
    messagingSenderId: '439732318734',
    appId: '1:439732318734:web:8be113b4cffd3be37425f'
  };
  let busy = false;

  function session() {
    try {
      const s = JSON.parse(localStorage.getItem('hm_auth_session') || 'null');
      return s && s.access_token && s.user && s.user.id ? s : null;
    } catch (_) { return null; }
  }
  function platform() {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Windows|Macintosh|Linux/i.test(ua)) return 'desktop';
    return 'unknown';
  }
  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Library Firebase gagal dimuat.'));
      document.head.appendChild(script);
    });
  }
  async function firebaseMessaging() {
    if (!window.firebase) {
      await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
    }
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    if (!firebase.messaging.isSupported || !(await firebase.messaging.isSupported())) {
      throw new Error('Browser/perangkat ini belum mendukung Firebase Web Push.');
    }
    return firebase.messaging();
  }
  async function saveToken(token, s) {
    if (!window.supabase || !window.supabase.createClient) throw new Error('Library Supabase belum siap.');
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      accessToken: async () => s.access_token,
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const endpointHash = await sha256(token);
    const result = await client.from('hm_push_subscriptions').upsert({
      user_id: s.user.id,
      endpoint_hash: endpointHash,
      fcm_token: token,
      platform: platform(),
      device_label: (navigator.userAgent || 'Hello Majesty device').slice(0, 180),
      enabled: true,
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'user_id,endpoint_hash' });
    if (result.error) throw result.error;
  }
  async function activate() {
    if (busy) return;
    busy = true;
    button.disabled = true;
    button.textContent = 'Mengaktifkan…';
    try {
      const s = session();
      if (!s) throw new Error('Silakan login terlebih dahulu ke Hello Majesty.');
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        throw new Error('Browser ini belum mendukung notifikasi web.');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Izin notifikasi belum diberikan di browser.');
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      const messaging = await firebaseMessaging();
      const token = await messaging.getToken({ vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: sw });
      if (!token) throw new Error('Firebase belum memberikan token perangkat. Periksa izin notifikasi dan coba lagi.');
      await saveToken(token, s);
      button.textContent = '✓ Notifikasi perangkat aktif';
      button.style.background = '#166534';
      button.title = 'Perangkat ini sudah terdaftar untuk menerima notifikasi Hello Majesty.';
      window.dispatchEvent(new CustomEvent('hm-fcm-device-registered'));
    } catch (error) {
      console.error('[HM FCM registration]', error);
      button.textContent = '🔔 Aktifkan notifikasi';
      alert('Notifikasi belum berhasil diaktifkan. ' + (error && error.message ? error.message : String(error)));
    } finally {
      busy = false;
      if (button.textContent !== '✓ Notifikasi perangkat aktif') button.disabled = false;
    }
  }

  let button;
  function mount() {
    if (button || !document.body) return;
    button = document.createElement('button');
    button.type = 'button';
    button.textContent = '🔔 Aktifkan notifikasi';
    button.setAttribute('aria-label', 'Aktifkan notifikasi Hello Majesty pada perangkat ini');
    button.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:999990;background:#b68b38;color:#111827;border:0;border-radius:999px;padding:12px 17px;font:700 13px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.24);cursor:pointer';
    button.addEventListener('click', activate);
    document.body.appendChild(button);
    if (Notification.permission === 'granted' && session()) {
      button.title = 'Izin browser sudah aktif. Klik untuk mendaftarkan perangkat ke Hello Majesty.';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
