/* HELLO MAJESTY — ISOLATED LOGIN
   Kept outside dashboard/menu script so menu changes cannot replace the LOGIN handler.
*/
(function(){
  const KEY='sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW';
  const SUPABASE_URL='https://ksowzhhmzrumyciehuyv.supabase.co';
  let client=null;
  function el(id){return document.getElementById(id);}
  async function getClient(){
    if(client)return client;
    if(!window.supabase?.createClient){
      await new Promise((resolve,reject)=>{
        const started=Date.now();
        const tick=()=>{
          if(window.supabase?.createClient){resolve();return;}
          if(Date.now()-started>12000){reject(new Error('Library login tidak termuat. Coba refresh halaman sekali lagi.'));return;}
          setTimeout(tick,100);
        };
        tick();
      });
    }
    client=window.supabase.createClient(SUPABASE_URL,KEY);
    return client;
  }
  async function doLogin(){
    const err=el('loginErr'),btn=el('loginBtn');
    if(btn?.disabled)return;
    if(btn)btn.disabled=true;
    if(err)err.textContent='Memproses login...';
    try{
      const sb=await getClient();
      const email=(el('email')?.value||'').trim(),password=el('password')?.value||'';
      if(!email||!password){if(err)err.textContent='Email dan password wajib diisi.';return;}
      const loginTask=sb.auth.signInWithPassword({email,password});
      const loginTimeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Koneksi login terlalu lama. Periksa internet lalu coba lagi.')),15000));
      const x=await Promise.race([loginTask,loginTimeout]);
      if(x.error){if(err)err.textContent=x.error.message;return;}
      window.sb=sb;
      let starter=null;
      for(let i=0;i<80&&!starter;i++){
        starter=typeof window.hmStartApp==='function'?window.hmStartApp:(typeof window.start==='function'?window.start:null);
        if(!starter)await new Promise(r=>setTimeout(r,100));
      }
      if(typeof starter!=='function')throw new Error('Aplikasi belum siap. Silakan refresh halaman lalu LOGIN lagi.');
      if(err)err.textContent='Login berhasil. Membuka dashboard...';
      const startTask=Promise.resolve().then(()=>starter(x.data.user,sb));
      const startTimeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Login berhasil, tetapi dashboard terlalu lama dimuat. Silakan refresh halaman sekali.')),8000));
      await Promise.race([startTask,startTimeout]);
    }catch(ex){
      console.error('[HM] isolated login:',ex);
      if(err)err.textContent=ex?.message||'Login gagal. Coba lagi.';
    }finally{
      if(btn){btn.disabled=false;btn.style.pointerEvents='auto';}
    }
  }
  async function restoreSession(){
    try{
      const sb=await getClient();
      const s=await sb.auth.getSession();
      const user=s?.data?.session?.user;
      if(!user)return;
      window.sb=sb;
      let starter=null;
      for(let i=0;i<100&&!starter;i++){
        starter=typeof window.hmStartApp==='function'?window.hmStartApp:(typeof window.start==='function'?window.start:null);
        if(!starter)await new Promise(r=>setTimeout(r,100));
      }
      if(typeof starter!=='function')return;
      await starter(user,sb);
    }catch(ex){
      console.warn('[HM] Session restore:',ex);
    }
  }
  window.doLogin=doLogin;
  window.hmLoginClient=()=>getClient();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restoreSession,{once:true});
  else restoreSession();
})();