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

  let refreshInFlight=null;
  async function refreshAccessToken(forceRefresh=false){
    if(refreshInFlight)return refreshInFlight;
    refreshInFlight=(async()=>{
      const runRefresh=async()=>{
        // Tab lain mungkin sudah merotasi refresh token. Selalu baca sesi terbaru
        // sesaat sebelum refresh agar token lama tidak dipakai ulang.
        try{
          const latest=JSON.parse(localStorage.getItem('hm_auth_session')||'null');
          if(latest?.refresh_token && latest.refresh_token!==activeSession?.refresh_token){
            const latestExpiry=Number(latest.expires_at||0);
            if(!forceRefresh && latest.access_token && latestExpiry>Math.floor(Date.now()/1000)+90){
              activeSession={...latest};
              return activeSession.access_token;
            }
            activeSession={...activeSession,...latest};
          }
        }catch(e){console.warn('[HM] read latest auth session',e);}
        if(!activeSession?.refresh_token)throw new Error('Sesi login sudah tidak tersedia. Silakan login kembali.');
        // Retry singkat dan timeout untuk jaringan mobile yang berpindah.
        let res=null,data=null,lastNetworkError=null;
        for(let attempt=0;attempt<2;attempt++){
          const controller=new AbortController();
          const timer=setTimeout(()=>controller.abort(),12000);
          try{
            res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{
              method:'POST',
              headers:{apikey:KEY,'Content-Type':'application/json'},
              body:JSON.stringify({refresh_token:activeSession.refresh_token}),
              signal:controller.signal,
              cache:'no-store'
            });
            data=null;try{data=await res.json();}catch(_e){}
            lastNetworkError=null;break;
          }catch(networkError){
            lastNetworkError=networkError;
            if(attempt===0)await sleep(700);
          }finally{clearTimeout(timer);}
        }
        if(lastNetworkError)throw new Error(lastNetworkError?.name==='AbortError'
          ?'Pembaruan sesi terlalu lama. Periksa koneksi HP lalu tekan Coba lagi.'
          :'Koneksi terputus saat memperbarui sesi. Periksa internet lalu tekan Coba lagi.');
        if(!res?.ok||!data?.access_token){
          // Jika tab lain menang refresh lebih dahulu, gunakan sesi baru yang
          // sudah tersimpan, bukan langsung menganggap akun harus login ulang.
          try{
            const latest=JSON.parse(localStorage.getItem('hm_auth_session')||'null');
            if(latest?.access_token && latest?.refresh_token &&
               latest.refresh_token!==activeSession?.refresh_token &&
               Number(latest.expires_at||0)>Math.floor(Date.now()/1000)+30){
              activeSession={...latest};
              return activeSession.access_token;
            }
          }catch(_e){}
          console.warn('[HM] refresh token rejected:',data?.message||data?.msg||data?.error_description||res.status);
          throw new Error('Sesi login sudah berakhir atau perlu login ulang. Silakan login kembali.');
        }
        activeSession={
          ...activeSession,
          ...data,
          expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)
        };
        try{localStorage.setItem('hm_auth_session',JSON.stringify(activeSession));}catch(e){console.warn('[HM] save refreshed session',e);}
        return activeSession.access_token;
      };
      // Web Locks mencegah beberapa tab HP memakai refresh token yang sama
      // pada saat bersamaan. Browser tanpa Web Locks tetap memakai single-flight.
      if(navigator?.locks?.request){
        return await navigator.locks.request('hello-majesty-auth-refresh',{mode:'exclusive'},runRefresh);
      }
      return await runRefresh();
    })();
    try{return await refreshInFlight;}
    finally{refreshInFlight=null;}
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
      // Perbaiki sesi tersimpan yang terlihat masih berlaku di browser tetapi
      // ditolak Supabase (401). Refresh satu kali lalu ulangi request dengan JWT baru.
      global:{fetch:async(input,init)=>{
        const response=await fetch(input,init);
        if(response.status!==401)return response;
        try{
          await refreshAccessToken(true);
          const headers=new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
          headers.set('Authorization','Bearer '+activeSession.access_token);
          return await fetch(input,{...init,headers});
        }catch(refreshError){
          console.warn('[HM] Auth token rejected; require fresh login:',refreshError);
          try{
            localStorage.removeItem('hm_auth_session');
            localStorage.removeItem('hm_auth_session_backup');
            sessionStorage.removeItem('hm_auth_session');
            localStorage.setItem('hm_auth_logout_marker','1');
          }catch(storageError){console.warn('[HM] clear rejected session',storageError);}
          // One reload to show login; the persisted session has been cleared first.
          setTimeout(()=>location.reload(),0);
          return response;
        }
      }},
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

  function showRestoreBootError(ex){
    console.error('[HM] Dashboard startup timeout/error:',ex);
    const identity=el('identity'),home=el('roleHome');
    const message=ex?.message||'Dashboard tidak merespons.';
    if(identity)identity.textContent='Dashboard gagal dibuka.';
    if(home){
      home.replaceChildren();
      const card=document.createElement('div');card.className='box';
      const heading=document.createElement('h3');heading.textContent='Dashboard gagal dibuka.';
      const note=document.createElement('p');note.className='small';
      note.textContent=message+' Muat ulang halaman lalu login kembali. Jika berulang, kirim screenshot pesan ini.';
      const button=document.createElement('button');button.textContent='Muat ulang aplikasi';button.onclick=()=>location.reload();
      card.append(heading,note,button);home.appendChild(card);
    }
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
      try{
        const packed=JSON.stringify(session);
        // Hanya localStorage yang menjadi sumber sesi persisten.
        // Backup/sessionStorage lama tidak boleh dipakai untuk auto-login
        // setelah user memilih Logout.
        localStorage.removeItem('hm_auth_session_backup');
        sessionStorage.removeItem('hm_auth_session');
        localStorage.removeItem('hm_auth_logout_marker');
        localStorage.setItem('hm_auth_session',packed);
      }catch(e){console.warn('[HM] save auth session',e);}

      // Jangan sembunyikan halaman LOGIN sebelum modul dashboard benar-benar siap.
      // Jika starter gagal dimuat, user tetap melihat pesan error dan tidak mendapat layar blank.
      const loginPage=document.getElementById('login');
      const appPage=document.getElementById('app');
      const roleHome=document.getElementById('roleHome');
      if(err)err.textContent='Login berhasil. Membuka dashboard...';

      // Pindahkan layar segera setelah autentikasi berhasil agar halaman login tidak macet.
      if(loginPage)loginPage.classList.add('hidden');
      if(appPage)appPage.classList.remove('hidden');
      if(roleHome){
        roleHome.classList.remove('hidden');
        roleHome.replaceChildren();
        const card=document.createElement('div');card.className='box';
        const heading=document.createElement('h3');heading.textContent='Menyiapkan dashboard…';
        const note=document.createElement('p');note.className='small';note.textContent='Login berhasil. Memuat modul aplikasi.';
        card.append(heading,note);roleHome.appendChild(card);
      }
      const identity=el('identity');
      if(identity)identity.textContent='Login berhasil • Memuat dashboard…';

      const showBootError=(title,message)=>{
        if(identity)identity.textContent=title;
        if(!roleHome)return;
        roleHome.replaceChildren();
        const card=document.createElement('div');card.className='box';
        const heading=document.createElement('h3');heading.textContent=title;
        const note=document.createElement('p');note.className='small';note.textContent=message;
        const button=document.createElement('button');button.textContent='Muat ulang aplikasi';button.onclick=()=>location.reload();
        card.append(heading,note,button);roleHome.appendChild(card);
      };
      // Independent watchdog: start() handles many of its own errors, so the
      // Promise.race below alone may not reveal a stalled startup. Never leave
      // the user on the splash screen indefinitely.
      const startupWatchdog=setTimeout(()=>{
        if(identity?.textContent==='Login berhasil • Memuat dashboard…'){
          showBootError('Dashboard belum merespons.','Login berhasil, tetapi fungsi pembuka dashboard belum mengubah status dalam 15 detik. Muat ulang aplikasi lalu coba lagi. Jika berulang, kirim screenshot pesan ini.');
        }
      },15000);
      try{
        const starter=await waitForAppStarter();
        const startPromise=Promise.resolve().then(()=>starter(session.user,sb));
        const startTimeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Proses dashboard tidak merespons selama 12 detik. Kemungkinan permintaan profil/database macet atau modul dashboard bermasalah.')),12000));
        Promise.race([startPromise,startTimeout]).catch(ex=>{
          console.error('[HM] Dashboard start error:',ex);
          showBootError('Dashboard gagal dibuka.',ex?.message||'Terjadi kesalahan saat memulai dashboard.');
        });
      }catch(bootError){
        console.error('[HM] Dashboard starter unavailable:',bootError);
        showBootError('Modul dashboard tidak termuat.',(bootError?.message||'Fungsi dashboard tidak tersedia.')+' Periksa apakah pembaruan aplikasi sudah terbit.');
      }
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
      // Auto-login hanya boleh berasal dari sesi persisten utama.
      // Jangan pernah mengambil backup/sessionStorage lama karena keduanya
      // dapat membuat akun masuk kembali setelah Logout.
      if(localStorage.getItem('hm_auth_logout_marker'))return false;
      const raw=localStorage.getItem('hm_auth_session');
      if(!raw)return false;
      let saved=null;
      try{saved=JSON.parse(raw);}catch(e){return false;}
      if(!saved?.access_token || !saved?.user)return false;
      // Gunakan access token tersimpan bila masih valid. Jangan melakukan refresh
      // token pada setiap page reload karena Supabase dapat merotasi refresh token
      // dan reload/tab ganda dapat membuat token lama ditolak.
      let session;
      const now=Math.floor(Date.now()/1000);
      if(saved.access_token && Number(saved.expires_at||0) > now + 90){
        activeSession={...saved};
        session=activeSession;
      }else{
        session=await refreshAccessTokenFromSaved(saved);
      }
      // Pastikan session terbaru tetap tersimpan untuk reload berikutnya.
      try{
        const packed=JSON.stringify(session);
        localStorage.setItem('hm_auth_session',packed);
        localStorage.removeItem('hm_auth_session_backup');
        sessionStorage.removeItem('hm_auth_session');
      }catch(e){console.warn('[HM] persist restored session',e);}
      const sb=await getClient(session);
      window.sb=sb;
      const starter=await waitForAppStarter();
      const loginPage=document.getElementById('login');
      const appPage=document.getElementById('app');
      const roleHome=document.getElementById('roleHome');
      if(loginPage)loginPage.classList.add('hidden');
      if(appPage)appPage.classList.remove('hidden');
      if(roleHome)roleHome.classList.remove('hidden');
      const startPromise=Promise.resolve().then(()=>starter(session.user,sb));
      const startTimeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Dashboard tidak merespons dalam 12 detik saat memulihkan sesi login.')),12000));
      Promise.race([startPromise,startTimeout]).catch(showRestoreBootError);
      return true;
    }catch(ex){
      console.warn('[HM] Auto restore session failed:',ex);
      // Jangan menjalankan dashboard dengan access token lama setelah refresh gagal.
      // Simpan sesi bila gangguan jaringan bersifat sementara agar bisa dicoba lagi.
      const msg=String(ex?.message||ex);
      const invalidRefresh=/invalid.*refresh|refresh.*(expired|revoked|not found)|refresh token.*invalid/i.test(msg);
      if(invalidRefresh){
        try{localStorage.removeItem('hm_auth_session');activeSession=null;}catch(_e){}
      }
      try{
        const loginPage=document.getElementById('login');
        const appPage=document.getElementById('app');
        const roleHome=document.getElementById('roleHome');
        if(loginPage)loginPage.classList.remove('hidden');
        if(appPage)appPage.classList.add('hidden');
        if(roleHome)roleHome.classList.add('hidden');
        const err=el('loginErr');
        if(err)err.textContent=invalidRefresh
          ?'Sesi sudah dicabut atau kedaluwarsa. Silakan login kembali.'
          :'Sesi belum dapat dipulihkan karena koneksi/server. Periksa internet lalu tekan LOGIN untuk mencoba lagi.';
      }catch(_e){}
      return false;
    }
  }

  async function refreshAccessTokenFromSaved(saved){
    const old=activeSession;
    activeSession={...saved};
    try{
      await refreshAccessToken();
      // refreshAccessToken() sudah memperbarui activeSession secara penuh,
      // termasuk access_token, refresh_token, expires_at, dan user.
      return {...activeSession};
    }catch(ex){
      activeSession=old;
      throw ex;
    }
  }


  // HM_PASSWORD_RECOVERY_HANDLER
  // Supabase redirects recovery links with a short-lived access_token in the URL hash.
  // This app uses a custom REST-based login flow with detectSessionInUrl:false, so
  // recovery tokens must be handled explicitly before normal session restoration.
  function handlePasswordRecovery(){
    let params;
    try{params=new URLSearchParams(String(location.hash||'').replace(/^#/,'').replace(/^\\?/,' '));}
    catch(_e){return false;}
    const query=new URLSearchParams(location.search||'');
    const type=params.get('type')||query.get('type')||'';
    const accessToken=params.get('access_token')||query.get('access_token')||'';
    const recoveryError=params.get('error_description')||query.get('error_description')||'';
    const hasRecovery=type==='recovery'||!!recoveryError;
    if(!hasRecovery)return false;

    // Remove credentials from the visible address bar immediately. Keep the token
    // only in this closure and never persist it in localStorage/sessionStorage.
    try{history.replaceState(null,document.title,location.pathname+location.search);}catch(_e){}

    const loginPage=document.getElementById('login');
    const appPage=document.getElementById('app');
    if(loginPage)loginPage.classList.add('hidden');
    if(appPage)appPage.classList.add('hidden');

    const overlay=document.createElement('div');
    overlay.id='hmPasswordRecoveryOverlay';
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:#07111f;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;';
    const card=document.createElement('div');
    card.style.cssText='width:100%;max-width:440px;box-sizing:border-box;padding:26px;border:1px solid #334155;border-radius:18px;background:#142238;box-shadow:0 18px 60px #0008;';
    const heading=document.createElement('h2');
    heading.textContent='Buat Password Baru';
    heading.style.cssText='margin:0 0 8px;font-size:24px;color:#fff;';
    const note=document.createElement('p');
    note.style.cssText='margin:0 0 20px;color:#cbd5e1;line-height:1.5;';
    const status=document.createElement('p');
    status.style.cssText='margin:14px 0 0;color:#fca5a5;line-height:1.5;';
    card.append(heading,note);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const showError=(message)=>{
      note.textContent=message;
      status.textContent='';
      if(!status.isConnected)card.appendChild(status);
    };
    const showLogin=()=>{
      overlay.remove();
      if(loginPage)loginPage.classList.remove('hidden');
      if(appPage)appPage.classList.add('hidden');
      const email=document.getElementById('email');
      if(email)email.focus();
    };

    if(recoveryError){
      showError('Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta email reset password yang baru.');
      const back=document.createElement('button');
      back.type='button';back.textContent='Kembali ke Login';
      back.style.cssText='width:100%;margin-top:18px;padding:13px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;';
      back.onclick=showLogin;card.appendChild(back);
      return true;
    }
    if(!accessToken){
      showError('Token pemulihan tidak ditemukan pada tautan. Minta email reset password yang baru.');
      const back=document.createElement('button');
      back.type='button';back.textContent='Kembali ke Login';
      back.style.cssText='width:100%;margin-top:18px;padding:13px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;';
      back.onclick=showLogin;card.appendChild(back);
      return true;
    }

    const inputStyle='display:block;width:100%;box-sizing:border-box;margin:8px 0 14px;padding:13px;border:1px solid #64748b;border-radius:10px;background:#0b1728;color:#fff;font-size:16px;';
    const label1=document.createElement('label');label1.textContent='Password baru';label1.style.cssText='display:block;color:#e2e8f0;font-weight:600;';
    const password=document.createElement('input');password.type='password';password.autocomplete='new-password';password.placeholder='Minimal 8 karakter';password.style.cssText=inputStyle;
    const label2=document.createElement('label');label2.textContent='Ulangi password baru';label2.style.cssText='display:block;color:#e2e8f0;font-weight:600;';
    const confirm=document.createElement('input');confirm.type='password';confirm.autocomplete='new-password';confirm.placeholder='Masukkan ulang password';confirm.style.cssText=inputStyle;
    const submit=document.createElement('button');submit.type='button';submit.textContent='Simpan Password Baru';submit.style.cssText='width:100%;margin-top:8px;padding:14px;border:0;border-radius:10px;background:#16a34a;color:#fff;font-size:16px;font-weight:700;';
    card.append(label1,password,label2,confirm,submit,status);

    const setStatus=(message,isError=true)=>{status.textContent=message;status.style.color=isError?'#fca5a5':'#86efac';};
    const validate=async()=>{
      const p=password.value;
      if(p.length<8){setStatus('Password minimal 8 karakter.');return;}
      if(p!==confirm.value){setStatus('Konfirmasi password belum sama.');return;}
      submit.disabled=true;submit.textContent='Menyimpan...';
      try{
        const response=await fetch(SUPABASE_URL+'/auth/v1/user',{
          method:'PUT',
          headers:{apikey:KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
          body:JSON.stringify({password:p}),
          cache:'no-store'
        });
        let data=null;try{data=await response.json();}catch(_e){}
        if(!response.ok)throw new Error(data?.message||data?.msg||data?.error_description||'Password gagal diperbarui. Tautan mungkin sudah kedaluwarsa.');
        heading.textContent='Password Berhasil Diperbarui';
        note.textContent='Password akun berhasil diganti. Silakan kembali ke halaman login dan masuk menggunakan password baru.';
        password.remove();confirm.remove();label1.remove();label2.remove();submit.remove();
        setStatus('Berhasil. Histori closing, komisi, dan data akun tidak diubah.',false);
        const back=document.createElement('button');back.type='button';back.textContent='Kembali ke Login';
        back.style.cssText='width:100%;margin-top:18px;padding:13px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;';
        back.onclick=showLogin;card.appendChild(back);
      }catch(ex){
        setStatus(ex?.message||'Terjadi kesalahan saat memperbarui password.');
        submit.disabled=false;submit.textContent='Simpan Password Baru';
      }
    };
    submit.addEventListener('click',validate);
    confirm.addEventListener('keydown',e=>{if(e.key==='Enter')validate();});
    password.addEventListener('keydown',e=>{if(e.key==='Enter')confirm.focus();});
    note.textContent='Tautan pemulihan dikenali. Masukkan password baru untuk akun ini.';
    // Verify the short-lived recovery access token before enabling password changes.
    fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+accessToken},cache:'no-store'})
      .then(async response=>{
        if(!response.ok){let data=null;try{data=await response.json();}catch(_e){};throw new Error(data?.message||data?.msg||'Tautan reset sudah kedaluwarsa atau sudah pernah digunakan.');}
      })
      .catch(ex=>{
        password.disabled=true;confirm.disabled=true;submit.disabled=true;
        setStatus((ex?.message||'Token pemulihan tidak valid.')+' Minta email reset yang baru.');
      });
    return true;
  }

  window.doLogin=doLogin;
  window.hmLoginClient=()=>getClient();
  window.hmRestoreLogin=restorePersistedSession;
  // Sinkronkan rotasi refresh token antar-tab agar tidak memakai token lama.
  window.addEventListener('storage',function(event){
    if(event.key!=='hm_auth_session'||!event.newValue)return;
    try{
      const latest=JSON.parse(event.newValue);
      if(latest?.access_token&&latest?.refresh_token)activeSession={...(activeSession||{}),...latest};
    }catch(e){console.warn('[HM] session storage sync',e);}
  });
  // Recovery links must be handled before normal persisted-session restoration.
  setTimeout(()=>{if(!handlePasswordRecovery())restorePersistedSession();},500);

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