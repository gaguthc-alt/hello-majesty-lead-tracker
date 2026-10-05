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

  async function loadClient(){
    if(window.supabase?.createClient){
      return window.supabase.createClient(SUPABASE_URL,KEY,{
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:false
        }
      });
    }

    const loadScript=(src)=>new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(()=>{
        if(done)return;
        done=true;
        reject(new Error('Library login timeout.'));
      },7000);
      s.src=src;
      s.async=true;
      s.onload=()=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        resolve();
      };
      s.onerror=()=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        reject(new Error('Gagal memuat library Supabase.'));
      };
      document.head.appendChild(s);
    });

    try{
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    }catch(_e){
      await loadScript('https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    }

    if(!window.supabase?.createClient){
      throw new Error('Library Supabase tidak tersedia.');
    }

    return window.supabase.createClient(SUPABASE_URL,KEY,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:false
      }
    });
  }

  async function getClient(){
    if(client)return client;
    // Reuse the dashboard's existing Supabase client when it is already ready.
    // This avoids two Supabase Auth clients competing over the same browser session/storage.
    if(window.sb?.auth?.setSession){
      client=window.sb;
      return client;
    }
    client=await loadClient();
    window.sb=client;
    return client;
  }

  async function restPasswordLogin(email,password){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{
        method:'POST',
        headers:{
          apikey:KEY,
          'Content-Type':'application/json'
        },
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
      if(ex?.name==='AbortError'){
        throw new Error('Koneksi server login terlalu lama. Periksa internet lalu coba lagi.');
      }
      throw ex;
    }finally{
      clearTimeout(timer);
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

      // Use ONE Supabase Auth client for both authentication and dashboard startup.
      // Do not perform a separate REST login + setSession cycle.
      const sb=await getClient();

      if(err)err.textContent='Memverifikasi akun...';
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw new Error(error.message||'Login gagal.');
      if(!data?.session||!data?.user)throw new Error('Server login tidak mengembalikan sesi yang valid.');

      window.sb=sb;

      if(err)err.textContent='Login berhasil. Membuka dashboard...';

      const starter=await waitForAppStarter();

      // start() receives the SAME client that just authenticated the user.
      const startPromise=Promise.resolve(starter(data.user,sb));
      const timeout=new Promise((_,reject)=>setTimeout(
        ()=>reject(new Error('Dashboard tidak selesai dibuka. Jika pesan ini muncul, masalah ada pada data profile/permission akun.')),
        20000
      ));

      await Promise.race([startPromise,timeout]);

      if(el('login')?.classList.contains('hidden') && err){
        err.textContent='';
      }
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

  window.doLogin=doLogin;
  window.hmLoginClient=()=>getClient();

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