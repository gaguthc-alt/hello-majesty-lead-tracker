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
      const x=await sb.auth.signInWithPassword({email,password});
      if(x.error){if(err)err.textContent=x.error.message;return;}
      window.sb=sb;
      const starter=typeof window.hmStartApp==='function'?window.hmStartApp:(typeof window.start==='function'?window.start:null);
      if(typeof starter!=='function')throw new Error('Aplikasi belum siap. Silakan tunggu sebentar lalu tekan LOGIN lagi.');
      await starter(x.data.user,sb);
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