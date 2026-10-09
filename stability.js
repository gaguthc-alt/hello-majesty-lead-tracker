/* HELLO MAJESTY — Frontend Stability Guard
 * Diagnostics only. UI polish added below; no workflow/data/permission changes.
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

  /* HM DATA LEAD — MOBILE/UI POLISH: presentation only */
  function polishLeadTrackerUI(){
    if(document.getElementById('hmLeadTrackerPolish')) return;
    var style=document.createElement('style');
    style.id='hmLeadTrackerPolish';
    style.textContent=
      '#modal .box{box-sizing:border-box!important;}'+
      '#modal .box > .stats{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;}'+
      '#modal .box > .stats .stat{min-width:0!important;min-height:78px!important;padding:14px 10px!important;border-radius:18px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;box-sizing:border-box!important;}'+
      '#modal .box > .stats .stat .small{line-height:1.25!important;white-space:normal!important;}'+
      '#modal .box > .stats .stat .num{font-size:25px!important;line-height:1.05!important;margin-top:5px!important;}'+
      '#modal #hmLeadTodayResults .box{border-radius:18px!important;padding:14px!important;}'+
      '#modal #hmLeadAllResults{display:flex!important;flex-direction:column!important;gap:10px!important;}'+
      '#modal #hmLeadAllResults > .box{margin:0!important;border-radius:18px!important;}'+
      '@media(max-width:700px){'+
        '#modal .box{width:100%!important;}'+
        '#modal .box > .stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;}'+
        '#modal .box > .stats .stat{min-height:72px!important;padding:12px 8px!important;}'+
        '#modal .box > .stats .stat .num{font-size:23px!important;}'+
        '#modal #hmLeadAllResults{gap:8px!important;}'+
      '}'+
      '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"]{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;}'+
      '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"] .stat{min-width:0!important;min-height:76px!important;padding:12px 8px!important;border-radius:17px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;}'+
      '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"] .stat .small{font-size:12px!important;line-height:1.15!important;white-space:nowrap!important;}'+
      '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"] .stat .num{font-size:23px!important;margin-top:5px!important;}'+
      '@media(max-width:700px){'+
        '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"]{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;}'+
        '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"] .stat{min-height:70px!important;padding:11px 6px!important;}'+
        '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"] .stat .small{font-size:11px!important;}'+
        '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"] .stat .num{font-size:22px!important;}'+
      '}'+
      '@media(max-width:380px){'+
        '#modal [style*="grid-template-columns:repeat(3,minmax(0,1fr))"] .stat .small{font-size:10.5px!important;}'+
      '}';
    (document.head||document.documentElement).appendChild(style);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',polishLeadTrackerUI,{once:true});
  }else{
    polishLeadTrackerUI();
  }

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