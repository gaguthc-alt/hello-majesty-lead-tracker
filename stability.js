/* HELLO MAJESTY — Frontend Stability Guard
 * Diagnostics only. No workflow/data/permission changes.
 */
(function(){
  'use strict';

  function showError(message){
    try{
      var host=document.getElementById('hmRuntimeError');
      if(!host){
        host=document.createElement('div');
        host.id='hmRuntimeError';
        host.style.cssText='position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483647;background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;border-radius:12px;padding:10px 12px;font:12px/1.4 Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.16)';
        document.body.appendChild(host);
      }
      host.innerHTML='<b>Terjadi error pada aplikasi.</b><br>'+String(message||'Kesalahan JavaScript tidak diketahui.')+
        '<div style="margin-top:6px;color:#64748b">Data Supabase tidak diubah. Silakan laporkan pesan ini kepada Management.</div>';
    }catch(_e){}
  }

  window.addEventListener('error',function(e){
    var msg=e && e.message ? e.message : 'JavaScript error';
    console.error('[HM runtime]',e);
    showError(msg);
  });

  window.addEventListener('unhandledrejection',function(e){
    var reason=e && e.reason;
    var msg=reason && reason.message ? reason.message : String(reason||'Promise error');
    console.error('[HM unhandled rejection]',reason);
    showError(msg);
  });

  window.hmDiagnostics=function(){
    var ids={};
    document.querySelectorAll('[id]').forEach(function(el){
      var id=el.id;
      ids[id]=(ids[id]||0)+1;
    });
    var duplicates=Object.keys(ids).filter(function(id){return ids[id]>1;});
    return {
      readyState:document.readyState,
      hasSupabase:!!window.supabase,
      hasSessionToken:typeof window.hmAccessToken==='function',
      hasProfile:!!window.profile,
      activeMainMenu:window.hmActiveMainMenu||'',
      duplicateIds:duplicates,
      duplicateIdCounts:duplicates.reduce(function(out,id){out[id]=ids[id];return out;},{}),
      timestamp:new Date().toISOString()
    };
  };
})();