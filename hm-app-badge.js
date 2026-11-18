/* Hello Majesty App Badge — per-user unread count from app_notifications.
 * Reads only the signed-in user's rows (RLS enforced); does not change native Android push.
 */
(function(){
 'use strict';
 const URL='https://ksowzhhmzrumyciehuyv.supabase.co';
 const KEY='sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW';
 let db=null,uid=null,timer=null;
 async function refresh(){
  if(!db||!uid||typeof navigator.setAppBadge!=='function')return;
  try{
   const {count,error}=await db.from('app_notifications').select('id',{count:'exact',head:true}).eq('recipient_user_id',uid).is('read_at',null);
   if(error)throw error;
   const n=Math.max(0,Number(count||0));
   if(n)await navigator.setAppBadge(n);
   else if(typeof navigator.clearAppBadge==='function')await navigator.clearAppBadge();
   window.dispatchEvent(new CustomEvent('hm:app-badge-updated',{detail:{unread:n}}));
  }catch(e){console.warn('[HM Badge] refresh failed',e);}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(refresh,250);}
 async function start(){
  try{
   if(!window.supabase?.createClient)return;
   const raw=localStorage.getItem('hm_auth_session'),s=raw?JSON.parse(raw):null;
   if(!s?.access_token)return;
   db=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await db.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token||''});
   if(error||!data?.user)return;
   uid=data.user.id;await refresh();
   db.channel('hm-badge-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'app_notifications',filter:'recipient_user_id=eq.'+uid},schedule).subscribe();
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
   window.addEventListener('focus',schedule);
  }catch(e){console.warn('[HM Badge] setup failed',e);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
