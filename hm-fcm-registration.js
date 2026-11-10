/* Hello Majesty: per-device FCM registration, prompted after login. */
(function () {
  'use strict';
  if (window.__hmFcmRegistrationLoaded) return;
  window.__hmFcmRegistrationLoaded = true;

  const SUPABASE_URL = 'https://ksowzhhmzrumyciehuyv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW';
  const VAPID_PUBLIC_KEY = 'BD_8aEumdug4XayvBGQMkEH74wKzm70XbgaOJfseNazaB3jdxnZvP64Sz8J1j1bIGtPtBB1PrjlRB9yXw-rbIc4';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDaDCr1AvQCOSuwiTIV-bSp-4SU1RVtRP8',
    authDomain: 'hello-majesty-notification.firebaseapp.com',
    projectId: 'hello-majesty-notification',
    storageBucket: 'hello-majesty-notification.firebasestorage.app',
    messagingSenderId: '439732318734',
    appId: '1:439732318734:web:8be113b4cffd3be37425f'
  };
  let busy = false, panel, actionButton, currentUserId = null, registeredUserId = null;

  async function authContext() {
    if (typeof window.hmAccessToken !== 'function') return null;
    let accessToken;
    try { accessToken = await window.hmAccessToken(); } catch (_) { return null; }
    if (!accessToken) return null;
    const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + accessToken }
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id ? { accessToken, user } : null;
  }
  function platform() {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Windows|Macintosh|Linux/i.test(ua)) return 'desktop';
    return 'unknown';
  }
  async function sha256(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
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
  async function saveToken(token, auth) {
    if (!window.supabase || !window.supabase.createClient) throw new Error('Library Supabase belum siap.');
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      accessToken: async () => auth.accessToken,
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const endpointHash = await sha256(token);
    const result = await client.from('hm_push_subscriptions').upsert({
      user_id: auth.user.id,
      endpoint_hash: endpointHash,
      fcm_token: token,
      platform: platform(),
      device_label: (navigator.userAgent || 'Hello Majesty device').slice(0, 180),
      enabled: true,
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'user_id,endpoint_hash' });
    if (result.error) throw result.error;
  }
  function setPanel(message, buttonText, handler, success) {
    if (!panel) return;
    panel.querySelector('[data-message]').textContent = message;
    actionButton.textContent = buttonText;
    actionButton.disabled = false;
    actionButton.onclick = handler || null;
    if (success) {
      actionButton.disabled = true;
      actionButton.textContent = '✓ Aktif';
      actionButton.style.background = '#166534';
    } else {
      actionButton.style.background = '#b68b38';
    }
  }
  async function registerDevice(auth) {
    if (busy) return;
    busy = true;
    actionButton.disabled = true;
    actionButton.textContent = 'Mengaktifkan…';
    try {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        throw new Error('Browser/perangkat ini belum mendukung notifikasi web.');
      }
      const permission = Notification.permission === 'granted'
        ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') {
        setPanel('Izin notifikasi belum diberikan. Aktifkan izin situs Hello Majesty di pengaturan browser.', 'Coba lagi', () => registerDevice(auth));
        return;
      }
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      const messaging = await firebaseMessaging();
      const token = await messaging.getToken({ vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: sw });
      if (!token) throw new Error('Firebase belum memberikan token perangkat. Coba lagi.');
      await saveToken(token, auth);
      registeredUserId = auth.user.id;
      setPanel('Perangkat ini sudah terdaftar dan siap menerima notifikasi Hello Majesty.', '✓ Notifikasi aktif', null, true);
      window.dispatchEvent(new CustomEvent('hm-fcm-device-registered'));
    } catch (error) {
      console.error('[HM FCM registration]', error);
      setPanel('Aktivasi belum berhasil: ' + (error && error.message ? error.message : String(error)), 'Coba lagi', () => registerDevice(auth));
    } finally { busy = false; }
  }
  function mount() {
    if (panel || !document.body) return;
    panel = document.createElement('aside');
    panel.setAttribute('aria-live', 'polite');
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:999990;width:min(390px,calc(100vw - 32px));box-sizing:border-box;background:#10243a;color:#fff;border:1px solid #b68b38;border-radius:16px;padding:14px 15px;box-shadow:0 12px 34px #0005;font:13px system-ui;display:none';
    panel.innerHTML = '<div style="font-weight:800;margin-bottom:5px">🔔 Notifikasi Hello Majesty</div><div data-message style="line-height:1.5;margin-bottom:11px"></div><button type="button" style="border:0;border-radius:999px;padding:10px 14px;color:#111827;font-weight:800;cursor:pointer"></button><button type="button" data-dismiss style="float:right;background:transparent;color:#cbd5e1;border:0;padding:9px;cursor:pointer">Nanti</button>';
    actionButton = panel.querySelector('button');
    panel.querySelector('[data-dismiss]').onclick = () => { panel.style.display = 'none'; };
    document.body.appendChild(panel);
  }
  async function checkLogin() {
    if (!panel || busy) return;
    const app = document.getElementById('app');
    // The login section is hidden by the app's own login controller using inline styles,
    // not necessarily the .hidden class. The authenticated workspace is the reliable gate.
    if (!app || app.classList.contains('hidden')) {
      panel.style.display = 'none'; currentUserId = null; registeredUserId = null; return;
    }
    const auth = await authContext();
    if (!auth) return;
    currentUserId = auth.user.id;
    if (registeredUserId === currentUserId) return;
    panel.style.display = 'block';
    if (!('Notification' in window)) {
      setPanel('Browser ini tidak mendukung notifikasi web.', 'Tidak tersedia', null);
    } else if (Notification.permission === 'granted') {
      setPanel('Izin browser sudah aktif. Hubungkan perangkat ini ke akun Hello Majesty.', 'Aktifkan perangkat', () => registerDevice(auth));
    } else if (Notification.permission === 'denied') {
      setPanel('Izin notifikasi pernah ditolak. Ubah izin situs ini menjadi Izinkan melalui pengaturan browser, lalu coba lagi.', 'Coba lagi', () => registerDevice(auth));
    } else {
      setPanel('Aktifkan sekali pada perangkat ini agar pemberitahuan lead dan tugas tim dapat masuk meski dashboard tidak sedang dibuka.', 'Izinkan notifikasi', () => registerDevice(auth));
    }
  }
  function start() {
    mount();
    checkLogin();
    window.addEventListener('hm-auth-ready', checkLogin);
    window.addEventListener('focus', checkLogin);
    setInterval(checkLogin, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
