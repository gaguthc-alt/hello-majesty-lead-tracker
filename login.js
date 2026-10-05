/* HELLO MAJESTY — ISOLATED LOGIN
   Auth login is intentionally independent from Supabase JS auth calls.
   This prevents a CDN/library load from leaving the button stuck at "Memproses login...".
*/
(function(){
  const KEY='sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW';
  const SUPABASE_URL='https://ksowzhhmzrumyciehuyv.supabase.co';
  let client=null;
  function el(id){return document.getElementById(id);}

  async function loadClient(){
    if(window.supabase?.createClient)return window.supabase.createClient(SUPABASE_URL,KEY);
    const loadScript=(src)=>new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(()=>{if(done)return;done=true;reject(new Error('Library dashboard timeout.'));},6000);
      s.src=src;s.async=true;
      s.onload=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};
      s.onerror=()=>{if(done)return;done=true;clearTimeout(timer);reject(new Error('Gagal memuat library dashboard.'));};
      document.head.appendChild(s);
    });
    try{await loadScript('https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js');}
    catch(_e){await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');}
    if(!window.supabase?.createClient)throw new Error('Library dashboard tidak tersedia.');
    return window.supabase.createClient(SUPABASE_URL,KEY);
  }

  async function getClient(){
    if(client)return client;
    client=await loadClient();
    return client;
  }

  async function restPasswordLogin(email,password){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{
        method:'POST',
        headers:{'apikey':KEY,'Content-Type':'application/json'},
        body:JSON.stringify({email,password}),
        signal:controller.signal
      });
      let data=null;
      try{data=await res.json();}catch(_e){}
      if(!res.ok){
        const msg=data?.msg||data?.message||data?.error_description||data?.error||'Login gagal. Periksa email dan password.';
        throw new Error(msg);
      }
      if(!data?.access_token||!data?.refresh_token||!data?.user)throw new Error('Server login tidak mengembalikan sesi yang valid.');
      return data;
    }catch(ex){
      if(ex?.name==='AbortError')throw new Error('Koneksi server login terlalu lama. Periksa internet lalu coba lagi.');
      throw ex;
    }finally{clearTimeout(timer);}
  }

  async function doLogin(){
    const err=el('loginErr'),btn=el('loginBtn');
    if(btn?.disabled)return;
    if(btn)btn.disabled=true;
    if(err)err.textContent='Menghubungkan ke server login...';
    try{
      const email=(el('email')?.value||'').trim(),password=el('password')?.value||'';
      if(!email||!password){if(err)err.textContent='Email dan password wajib diisi.';return;}

      if(err)err.textContent='Memverifikasi akun...';
      const auth=await restPasswordLogin(email,password);

      if(err)err.textContent='Login berhasil. Menyiapkan dashboard...';
      const sb=await getClient();
      const session=await sb.auth.setSession({
        access_token:auth.access_token,
        refresh_token:auth.refresh_token
      });
      if(session.error)throw new Error(session.error.message||'Sesi login gagal disiapkan.');
      window.sb=sb;

      let starter=null;
      for(let i=0;i<80&&!starter;i++){
        starter=typeof window.hmStartApp==='function'?window.hmStartApp:(typeof window.start==='function'?window.start:null);
        if(!starter)await new Promise(r=>setTimeout(r,100));
      }
      if(typeof starter!=='function')throw new Error('Aplikasi belum siap. Silakan refresh halaman lalu LOGIN lagi.');
      if(err)err.textContent='Membuka dashboard...';
      const startTask=Promise.resolve().then(()=>starter(auth.user,sb));
      const startTimeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Dashboard tidak selesai dibuka dalam 15 detik. Cek pesan error koneksi/database.')),15000));
      await Promise.race([startTask,startTimeout]);
    }catch(ex){
      console.error('[HM] isolated login:',ex);
      if(err)err.textContent=ex?.message||'Login gagal. Coba lagi.';
    }finally{
      if(btn){btn.disabled=false;btn.style.pointerEvents='auto';}
    }
  }

  window.doLogin=doLogin;
  window.hmLoginClient=()=>getClient();
})();
