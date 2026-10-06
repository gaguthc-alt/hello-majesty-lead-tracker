/* HELLO MAJESTY — ISOLATED LOGIN
   Stable login bootstrap.
   Auth is verified through Supabase REST first, then the dashboard client
   receives the same session and opens the existing application start() flow.
*/
(function(){
  const KEY='sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW';
  const SUPABASE_URL='https://ksowzhhmzrumyciehuyv.supabase.co';
  let client=null;
  let loginBusy=false;

  function el(id){return document.getElementById(id);}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

  let activeSession=null;

  async function restPasswordLogin(email,password){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{
        method:'POST',
        headers:{apikey:KEY,'Content-Type':'application/json'},
        body:JSON.stringify({email,password}),
        signal:controller.signal
      });
      let data=null;
      try{data=await res.json();}catch(_e){}
      if(!res.ok){
        const msg=data?.msg||data?.message||data?.error_description||data?.error||'Login gagal. Periksa email dan password.';
        throw new Error(msg);
      }
      if(!data?.access_token||!data?.refresh_token||!data?.user){
        throw new Error('Server login tidak mengembalikan sesi yang valid.');
      }
      return data;
    }catch(ex){
      if(ex?.name==='AbortError')throw new Error('Koneksi server login terlalu lama. Periksa internet lalu coba lagi.');
      throw ex;
    }finally{clearTimeout(timer);}
  }

  async function refreshAccessToken(){
    if(!activeSession?.refresh_token)throw new Error('Sesi login sudah tidak tersedia. Silakan login kembali.');
    const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{
      method:'POST',
      headers:{apikey:KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:activeSession.refresh_token})
    });
    let data=null; try{data=await res.json();}catch(_e){}
    if(!res.ok||!data?.access_token){
      activeSession=null;
      throw new Error('Sesi login sudah berakhir. Silakan login kembali.');
    }
    activeSession={
      ...activeSession,
      ...data,
      expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)
    };
    // Simpan refresh token terbaru. Supabase dapat melakukan token rotation;
    // jika token baru tidak disimpan, refresh halaman berikutnya akan logout.
    try{localStorage.setItem('hm_auth_session',JSON.stringify(activeSession));}catch(e){console.warn('[HM] save refreshed session',e);}
    return activeSession.access_token;
  }

  window.hmAccessToken=async()=>{if(!activeSession?.access_token)throw new Error('Sesi login tidak tersedia.'); if((activeSession.expires_at||0)-Math.floor(Date.now()/1000)<90)await refreshAccessToken(); return activeSession.access_token;};

  function buildAuthenticatedClient(session){
    if(!window.supabase?.createClient)throw new Error('Library Supabase tidak tersedia.');
    activeSession={
      ...session,
      expires_at:session.expires_at||Math.floor(Date.now()/1000)+(session.expires_in||3600)
    };
    // Gunakan accessToken callback, bukan Supabase Auth signInWithPassword/setSession.
    // Ini menghindari deadlock Auth-JS pada browser mobile dan tetap membuat
    // setiap query PostgREST membawa JWT user yang benar.
    return window.supabase.createClient(SUPABASE_URL,KEY,{
      accessToken:async()=>{
        const now=Math.floor(Date.now()/1000);
        if(!activeSession?.access_token)throw new Error('Sesi login tidak tersedia.');
        if((activeSession.expires_at||0)-now<90)await refreshAccessToken();
        return activeSession.access_token;
      },
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
    });
  }

  async function getClient(session){
    if(session){
      client=buildAuthenticatedClient(session);
      window.sb=client;
      return client;
    }
    if(client)return client;
    throw new Error('Sesi login belum tersedia.');
  }

  async function waitForAppStarter(){
    // finance.js is loaded with defer after login.js. Wait until it exposes start().
    for(let i=0;i<150;i++){
      const starter=
        typeof window.hmStartApp==='function' ? window.hmStartApp :
        typeof window.start==='function' ? window.start : null;
      if(starter)return starter;
      await sleep(100);
    }
    throw new Error('Modul dashboard belum siap. Refresh sekali lalu coba LOGIN lagi.');
  }

  async function doLogin(){
    const err=el('loginErr');
    const btn=el('loginBtn');

    if(loginBusy)return;
    loginBusy=true;

    if(btn){
      btn.disabled=true;
      btn.style.pointerEvents='none';
      btn.setAttribute('aria-busy','true');
    }

    try{
      const email=(el('email')?.value||'').trim();
      const password=el('password')?.value||'';
      if(!email||!password)throw new Error('Email dan password wajib diisi.');

      if(err)err.textContent='Menghubungkan ke server...';

      if(err)err.textContent='Memverifikasi akun...';
      // Authenticate directly against Supabase Auth REST endpoint.
      // Then create a database client with the returned JWT via accessToken.
      // This avoids the browser Auth-JS lock path that can hang on mobile.
      const session=await restPasswordLogin(email,password);
      const sb=await getClient(session);
      window.sb=sb;
      try{localStorage.setItem('hm_auth_session',JSON.stringify(session));}catch(e){console.warn('[HM] save auth session',e);}

      // AUTH SUKSES = buka shell dashboard langsung.
      // Jangan menggantungkan perpindahan layar pada finance.js/start().
      const loginPage=document.getElementById('login');
      const appPage=document.getElementById('app');
      const workspacePage=document.getElementById('workspace');
      const roleHome=document.getElementById('roleHome');
      if(loginPage)loginPage.classList.add('hidden');
      if(appPage)appPage.classList.remove('hidden');
      if(roleHome)roleHome.classList.remove('hidden');
      if(err)err.textContent='Workspace dibuka. Memuat data akun...';

      const starter=await waitForAppStarter();

      // start() mengurus perpindahan layar sendiri. Jangan menunggu loadLeads()
      // karena modul data tidak boleh membuat layar login terlihat macet.
      Promise.resolve(starter(session.user,sb)).catch(ex=>{
        console.error('[HM] Dashboard start error:',ex);
        if(err)err.textContent=ex?.message||'Dashboard gagal dibuka.';
      });
      return;
    }catch(ex){
      console.error('[HM] Login bootstrap error:',ex);
      if(err)err.textContent=ex?.message||'Login gagal. Coba lagi.';
    }finally{
      loginBusy=false;
      if(btn){
        btn.disabled=false;
        btn.style.pointerEvents='auto';
        btn.removeAttribute('aria-busy');
      }
    }
  }

  async function restorePersistedSession(){
    try{
      const raw=localStorage.getItem('hm_auth_session');
      if(!raw)return false;
      let saved=null;
      try{saved=JSON.parse(raw);}catch(e){localStorage.removeItem('hm_auth_session');return false;}
      if(!saved?.refresh_token)return false;
      // Restore using the refresh token so the user does not need to login on every page load.
      const session=await refreshAccessTokenFromSaved(saved);
      // Pastikan session hasil refresh menjadi sumber session untuk reload berikutnya.
      try{localStorage.setItem('hm_auth_session',JSON.stringify(session));}catch(e){console.warn('[HM] persist restored session',e);}
      const sb=await getClient(session);
      window.sb=sb;
      const starter=await waitForAppStarter();
      const loginPage=document.getElementById('login');
      const appPage=document.getElementById('app');
      const roleHome=document.getElementById('roleHome');
      if(loginPage)loginPage.classList.add('hidden');
      if(appPage)appPage.classList.remove('hidden');
      if(roleHome)roleHome.classList.remove('hidden');
      Promise.resolve(starter(session.user,sb)).catch(ex=>console.error('[HM] Auto restore dashboard error:',ex));
      return true;
    }catch(ex){
      console.warn('[HM] Auto restore session failed:',ex);
      // Jangan langsung menghapus session karena kegagalan sementara/network.
      // Session hanya dibersihkan bila server memang menolak refresh token.
      if(/sesi login sudah berakhir|refresh token/i.test(String(ex?.message||''))){
        try{localStorage.removeItem('hm_auth_session');}catch(e){}
      }
      return false;
    }
  }

  async function refreshAccessTokenFromSaved(saved){
    const old=activeSession;
    activeSession={...saved};
    try{
      return {...activeSession,...(await refreshAccessToken())};
    }catch(ex){
      activeSession=old;
      throw ex;
    }
  }

  window.doLogin=doLogin;
  window.hmLoginClient=()=>getClient();
  window.hmRestoreLogin=restorePersistedSession;
  // Auto-restore the last authenticated session on page load.
  setTimeout(()=>restorePersistedSession(),50);

  // Enter key should use the same protected login handler.
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter')return;
    const login=document.getElementById('login');
    if(!login||login.classList.contains('hidden'))return;
    const active=document.activeElement;
    if(active?.id==='email'||active?.id==='password'){
      e.preventDefault();
      doLogin();
    }
  });
})();