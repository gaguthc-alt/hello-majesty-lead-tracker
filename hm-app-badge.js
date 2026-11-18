/* Hello Majesty App Badge — reuse the dashboard's authenticated client.
 * No second Supabase client, no Auth setSession/refresh, and no extra Realtime channel.
 * The badge is reconciled on startup, focus/visibility, pageshow, and every 60 seconds.
 */
(function(){
 'use strict';
 let db=null,uid=null,timer=null,reconcileTimer=null,started=false;
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(refresh,300);};
 async function refresh(){
  if(!db||!uid||typeof navigator.setAppBadge!=='function')return;
  try{
   const {count,error}=await db.from('app_notifications')
    .select('id',{count:'exact',head:true})
    .eq('recipient_user_id',uid).is('read_at',null);
   if(error)throw error;
   const n=Math.max(0,Number(count||0));
   if(n)await navigator.setAppBadge(n);
   else if(typeof navigator.clearAppBadge==='function')await navigator.clearAppBadge();
   window.dispatchEvent(new CustomEvent('hm:app-badge-updated',{detail:{unread:n}}));
  }catch(e){console.warn('[HM Badge] refresh failed',e);}
 }
 function start(){
  if(started)return true;
  // login-v9.js publishes its authenticated, token-managed client as window.sb.
  const client=window.sb;
  let session=null;
  try{session=JSON.parse(localStorage.getItem('hm_auth_session')||'null');}catch(_e){}
  if(!client||!session?.user?.id)return false;
  db=client;uid=session.user.id;started=true;
  refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  window.addEventListener('focus',schedule);
  window.addEventListener('pageshow',schedule);
  // Reconcile periodically without opening another Realtime connection.
  reconcileTimer=setInterval(refresh,60000);
  return true;
 }
 function boot(){
  if(start())return;
  // The badge script loads before a user logs in; wait for login-v9 to publish window.sb.
  let attempts=0;
  const wait=setInterval(()=>{
   attempts++;
   if(start()||attempts>=180)clearInterval(wait);
  },1000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
